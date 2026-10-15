const express = require("express");
const router = express.Router();
const defaultPool = require("../config/db");
const DatabaseConnectionManager = require("../services/DatabaseConnectionManager");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

// Helper function to resolve database pool based on branch code
const getPool = async (req) => {
  let branchCode = req?.headers?.['x-branch-code'] || req?.headers?.['X-Branch-Code'] || req?.headers?.['branchcode'] || req?.query?.branchCode;
  if (!branchCode && req?.headers?.authorization) {
    try {
      const token = req.headers.authorization.replace('Bearer ', '');
      const decoded = jwt.decode(token);
      if (decoded && (decoded.branchCode || decoded.branch_code)) {
        branchCode = decoded.branchCode || decoded.branch_code;
      }
    } catch (e) {}
  }
  if (!branchCode && req?.headers?.host) {
    const host = req.headers.host.toLowerCase();
    if (host.includes('bilal')) {
      branchCode = 'BILAL';
    }
  }
  console.log('[StudentList getPool] Detected branchCode:', branchCode);
  if (branchCode) {
    try {
      const dbManager = DatabaseConnectionManager.getInstance ? DatabaseConnectionManager.getInstance() : DatabaseConnectionManager;
      if (dbManager && typeof dbManager.getPool === 'function') {
        const branchPool = await dbManager.getPool(branchCode.toUpperCase());
        if (branchPool) {
          const testRes = await branchPool.query('SELECT current_database()');
          console.log('[StudentList getPool] Using branch pool database:', testRes.rows[0].current_database);
          return branchPool;
        }
      }
    } catch (e) {
      console.warn(`[StudentList] Could not get pool for branch "${branchCode}":`, e.message);
    }
  }
  const testRes = await defaultPool.query('SELECT current_database()');
  console.log('[StudentList getPool] Using defaultPool database:', testRes.rows[0].current_database);
  return defaultPool;
};

// Configure multer for file uploads
const upload = multer({
  dest: "Uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, MP4, and PDF are allowed."));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to resolve actual table name case-insensitively
const resolveClassTable = async (pool, className, schoolId = null) => {
  if (className && className !== 'all' && /^[a-zA-Z0-9_]+$/.test(className)) {
    const tableRes = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'classes_schema' AND LOWER(table_name) = LOWER($1)`,
      [className]
    );
    if (tableRes.rows.length > 0) {
      return tableRes.rows[0].table_name;
    }
  }

  if (schoolId) {
    const allTables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
    );
    for (const t of allTables.rows) {
      try {
        const check = await pool.query(
          `SELECT 1 FROM classes_schema."${t.table_name}" WHERE school_id::text = $1::text LIMIT 1`,
          [String(schoolId)]
        );
        if (check.rows.length > 0) {
          return t.table_name;
        }
      } catch (_) {}
    }
  }

  return null;
};

// Known alias groups for flexible column name matching
const ALIAS_GROUPS = [
  ['guardian_2nd', 'guardian2nd', 'guardian2', 'guardian_second'],
  ['guardian_2nd_phone', 'guardian2nd_phone', 'guardian2_phone', 'guardian_second_phone'],
  ['from_which_school', 'from_where', 'previous_school'],
  ['old_or_new', 'oldornew', 'student_status'],
  ['is_active', 'active'],
  ['is_free', 'free']
];

// Get all class names, excluding school_student_count
router.get("/classes", async (req, res) => {
  try {
    const pool = await getPool(req);
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    const classes = result.rows.map(row => row.table_name);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

// Get students for a specific class - returns ALL columns including password fields
router.get("/students/:className", async (req, res) => {
  const { className } = req.params;
  const { includeInactive, studentType } = req.query;
  
  try {
    const pool = await getPool(req);
    const actualTableName = await resolveClassTable(pool, className);
    if (!actualTableName) {
      return res.json([]);
    }

    // Check which filter columns exist in this table
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 
       AND column_name IN ('is_active', 'is_kg', 'is_evening_class', 'student_type')`,
      [actualTableName]
    );
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasIsActive = existingColumns.includes('is_active');
    const hasStudentType = existingColumns.includes('student_type');
    const hasIsKg = existingColumns.includes('is_kg');
    const hasIsEvening = existingColumns.includes('is_evening_class');
    
    let whereConditions = [];
    
    if (hasIsActive) {
      if (includeInactive === 'true') {
        // Include all students
      } else if (includeInactive === 'only') {
        whereConditions.push('is_active = FALSE');
      } else {
        whereConditions.push('(is_active = TRUE OR is_active IS NULL)');
      }
    }
    
    if (studentType && hasStudentType) {
      whereConditions.push(`student_type = '${studentType}'`);
    } else if (studentType === 'kg' && hasIsKg && !hasStudentType) {
      whereConditions.push('is_kg = TRUE');
    } else if (studentType === 'evening' && hasIsEvening && !hasStudentType) {
      whereConditions.push('is_evening_class = TRUE');
    }
    
    let query = `SELECT * FROM classes_schema."${actualTableName}"`;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY LOWER(student_name) ASC';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching students for class ${className}:`, error);
    res.status(500).json({ error: `Failed to fetch students for class ${className}`, details: error.message });
  }
});

// Get single student data by school_id and class_id
router.get("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const pool = await getPool(req);
    const actualTableName = await resolveClassTable(pool, className, schoolId);
    if (!actualTableName) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = await pool.query(
      `SELECT * FROM classes_schema."${actualTableName}" 
       WHERE school_id::text = $1::text 
         AND (class_id::text = $2::text OR class_id IS NULL) 
         AND (is_active = TRUE OR is_active IS NULL)`,
      [String(schoolId), String(classId)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching student from class ${className}:`, error);
    res.status(500).json({ error: "Failed to fetch student", details: error.message });
  }
});

// Update student data with file upload support
router.put(["/student/:className/:schoolId/:classId", "/student/:className/:schoolId"], upload.single("image_student"), async (req, res) => {
  const { className, schoolId, classId } = req.params;
  
  console.log('=== UPDATE STUDENT REQUEST ===');
  console.log('Class:', className, 'School ID:', schoolId, 'Class ID:', classId);
  console.log('Body:', req.body);
  console.log('File:', req.file);
  
  const rawBody = req.body || {};
  let updates = {};
  if (rawBody.updates) {
    try {
      updates = typeof rawBody.updates === 'string' ? JSON.parse(rawBody.updates) : rawBody.updates;
    } catch (e) {
      updates = { ...rawBody };
    }
  } else {
    updates = { ...rawBody };
  }
  
  const file = req.file;

  try {
    const pool = await getPool(req);
    const dbInfo = (await pool.query('SELECT current_database()')).rows[0];
    console.log('[StudentList update] Current database:', dbInfo.current_database);

    // 1. Resolve actual table name in classes_schema
    const actualTableName = await resolveClassTable(pool, className, schoolId);
    console.log('[StudentList update] actualTableName:', actualTableName, 'for className:', className, 'schoolId:', schoolId);
    if (!actualTableName) {
      return res.status(404).json({ error: `Class table "${className}" does not exist and student was not found` });
    }

    // 2. Fetch existing columns and types from information_schema
    const colsRes = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [actualTableName]
    );
    const colMap = new Map(); // lowercase -> { name: original_name, type: data_type }
    colsRes.rows.forEach(r => {
      colMap.set(r.column_name.toLowerCase(), { name: r.column_name, type: r.data_type });
    });

    // 3. Prepare fields to update
    const fields = { ...updates };
    if (file) {
      fields.image_student = file.filename;
    }

    // Never modify school_id or class_id via dynamic update
    delete fields.school_id;
    delete fields.class_id;
    delete fields.uniqueId;
    delete fields.displayId;
    delete fields.id;

    // Check if class change is requested
    const requestedNewClass = fields.class;
    let targetClassTableName = null;
    if (requestedNewClass && typeof requestedNewClass === 'string' && requestedNewClass.trim().toLowerCase() !== actualTableName.toLowerCase()) {
      targetClassTableName = await resolveClassTable(pool, requestedNewClass.trim());
    }

    // 4. Validate smachine_id uniqueness across ALL classes if being updated
    if (fields.smachine_id) {
      try {
        const globalCheck = await pool.query(
          'SELECT student_name, class_name, school_id, class_id FROM school_schema_points.global_machine_ids WHERE smachine_id = $1',
          [fields.smachine_id]
        );
        if (globalCheck.rows.length > 0) {
          const existing = globalCheck.rows[0];
          if (String(existing.school_id) !== String(schoolId) || String(existing.class_id) !== String(classId)) {
            return res.status(400).json({ 
              error: `Machine ID ${fields.smachine_id} already added. This ID is used by student "${existing.student_name}" in ${existing.class_name}.`
            });
          }
        }
      } catch (err) {}
      
      const allClasses = (await pool.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
        ['classes_schema']
      )).rows.map(row => row.table_name);
      
      for (const cls of allClasses) {
        try {
          const existingMachineId = await pool.query(
            `SELECT student_name, class, school_id, class_id FROM classes_schema."${cls}" WHERE smachine_id = $1`,
            [fields.smachine_id]
          );
          if (existingMachineId.rows.length > 0) {
            const existing = existingMachineId.rows[0];
            if (String(existing.school_id) !== String(schoolId) || String(existing.class_id) !== String(classId)) {
              return res.status(400).json({ 
                error: `Machine ID ${fields.smachine_id} already added. This ID is used by student "${existing.student_name}" in ${existing.class}.`
              });
            }
          }
        } catch (_) {}
      }
    }

    // 5. Match columns against table and map known aliases
    const safeColumns = [];
    const safeValues = [];

    for (const [rawKey, rawVal] of Object.entries(fields)) {
      const lowerKey = rawKey.toLowerCase();
      let colMeta = colMap.get(lowerKey);

      if (!colMeta) {
        for (const group of ALIAS_GROUPS) {
          if (group.includes(lowerKey)) {
            for (const alias of group) {
              if (colMap.has(alias)) {
                colMeta = colMap.get(alias);
                break;
              }
            }
          }
          if (colMeta) break;
        }
      }

      if (colMeta) {
        let val = rawVal;
        if (val === 'null' || val === null || val === undefined || (val === '' && (colMeta.type === 'integer' || colMeta.type === 'boolean' || colMeta.type.includes('date')))) {
          val = null;
        } else if (colMeta.type === 'boolean') {
          val = (val === true || val === 'true' || val === 'YES' || val === 'yes' || val === 1 || val === '1');
        } else if (colMeta.type === 'integer') {
          val = parseInt(val, 10);
          if (isNaN(val)) val = null;
        } else if (colMeta.type.includes('date')) {
          val = val.toString();
        } else {
          val = val.toString();
        }

        if (!safeColumns.includes(colMeta.name)) {
          safeColumns.push(colMeta.name);
          safeValues.push(val);
        }
      } else {
        console.warn(`[StudentList] Skipping field "${rawKey}" because column does not exist in classes_schema."${actualTableName}"`);
      }
    }

    if (safeColumns.length === 0) {
      return res.status(400).json({ error: "No valid fields provided to update" });
    }

    // Fetch old student_name before update (for syncing to mark list / fault / attendance tables)
    let oldStudentName = null;
    if (safeColumns.includes('student_name')) {
      try {
        const oldRow = await pool.query(
          `SELECT student_name FROM classes_schema."${actualTableName}" WHERE school_id::text = $1::text AND (class_id::text = $2::text OR class_id IS NULL) LIMIT 1`,
          [String(schoolId), String(classId)]
        );
        oldStudentName = oldRow.rows[0]?.student_name || null;
      } catch (_) {}
    }

    // Build update query
    const setClause = safeColumns.map((col, idx) => `"${col}" = $${idx + 1}`).join(", ");
    let updateResult = await pool.query(
      `UPDATE classes_schema."${actualTableName}" 
       SET ${setClause} 
       WHERE school_id::text = $${safeColumns.length + 1}::text 
         AND (class_id::text = $${safeColumns.length + 2}::text OR class_id IS NULL)
       RETURNING *`,
      [...safeValues, String(schoolId), String(classId)]
    );

    if (updateResult.rows.length === 0) {
      updateResult = await pool.query(
        `UPDATE classes_schema."${actualTableName}" 
         SET ${setClause} 
         WHERE school_id::text = $${safeColumns.length + 1}::text 
         RETURNING *`,
        [...safeValues, String(schoolId)]
      );
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }
    }

    let finalStudentRow = updateResult.rows[0];

    // Sync student_name change to denormalized tables (mark list, faults, attendance, machine IDs)
    if (safeColumns.includes('student_name') && oldStudentName && oldStudentName !== finalStudentRow.student_name) {
      const newName = finalStudentRow.student_name;
      console.log(`[StudentList] Syncing name change "${oldStudentName}" → "${newName}" (school_id=${schoolId}, class_id=${classId})`);
      // Sync global_machine_ids
      try {
        await pool.query(
          `UPDATE school_schema_points.global_machine_ids SET student_name = $1 WHERE school_id::text = $2::text AND class_id::text = $3::text AND student_name = $4`,
          [newName, String(schoolId), String(classId), oldStudentName]
        );
      } catch (e) { console.log('Note: global_machine_ids sync failed:', e.message); }
      // Sync all mark list tables in mark_data_schema (these tables only have student_name, no school_id/class_id)
      try {
        const mlTables = await pool.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'mark_data_schema'`
        );
        for (const t of mlTables.rows) {
          try {
            await pool.query(
              `UPDATE mark_data_schema."${t.table_name}" SET student_name = $1 WHERE student_name = $2`,
              [newName, oldStudentName]
            );
          } catch (_) {}
        }
      } catch (_) {}
      // Sync all fault tables in class_students_fault
      try {
        const faultTables = await pool.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`
        );
        for (const t of faultTables.rows) {
          try {
            await pool.query(
              `UPDATE class_students_fault."${t.table_name}" SET student_name = $1 WHERE school_id::text = $2::text AND class_id::text = $3::text AND student_name = $4`,
              [newName, String(schoolId), String(classId), oldStudentName]
            );
          } catch (_) {}
        }
      } catch (_) {}
      // Sync attendance tables in school_schema_points (weekly attendance etc.)
      try {
        const attTables = await pool.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'school_schema_points' AND table_name LIKE '%attendance%'`
        );
        for (const t of attTables.rows) {
          try {
            await pool.query(
              `UPDATE school_schema_points."${t.table_name}" SET student_name = $1 WHERE school_id::text = $2::text AND class_id::text = $3::text AND student_name = $4`,
              [newName, String(schoolId), String(classId), oldStudentName]
            );
          } catch (_) {}
        }
      } catch (_) {}
      // Sync evaluation_book_daily_entries (uses class_name + student_name)
      try {
        await pool.query(
          `UPDATE evaluation_book_daily_entries SET student_name = $1 WHERE class_name = $2 AND student_name = $3`,
          [newName, className, oldStudentName]
        );
      } catch (_) {}
      // Sync evaluation_responses (uses student_name + student_class)
      try {
        await pool.query(
          `UPDATE evaluation_responses SET student_name = $1 WHERE student_class = $2 AND student_name = $3`,
          [newName, className, oldStudentName]
        );
      } catch (_) {}
      // Sync kg_student_milestones (uses student_name + class_name)
      try {
        await pool.query(
          `UPDATE kg_student_milestones SET student_name = $1 WHERE class_name = $2 AND student_name = $3`,
          [newName, className, oldStudentName]
        );
      } catch (_) {}
      // Sync kg_student_evaluations (linked via evaluation_id → kg_evaluations.class_name)
      try {
        await pool.query(
          `UPDATE kg_student_evaluations SET student_name = $1 WHERE student_name = $2 AND evaluation_id IN (SELECT id FROM kg_evaluations WHERE class_name = $3)`,
          [newName, oldStudentName, className]
        );
      } catch (_) {}
    }

    // Handle class transfer if student was moved to a new class table
    if (targetClassTableName && targetClassTableName !== actualTableName) {
      try {
        console.log(`[StudentList] Transferring student ${schoolId} from ${actualTableName} to ${targetClassTableName}`);
        const targetColsRes = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_schema = 'classes_schema' AND table_name = $1`,
          [targetClassTableName]
        );
        const targetColNames = targetColsRes.rows.map(r => r.column_name);
        
        const studentData = { ...finalStudentRow, class: targetClassTableName };
        delete studentData.id;

        const commonCols = Object.keys(studentData).filter(c => targetColNames.includes(c));
        const insertCols = commonCols.map(c => `"${c}"`).join(', ');
        const insertParams = commonCols.map((_, i) => `$${i + 1}`).join(', ');
        const insertVals = commonCols.map(c => studentData[c]);

        const insertRes = await pool.query(
          `INSERT INTO classes_schema."${targetClassTableName}" (${insertCols}) VALUES (${insertParams}) RETURNING *`,
          insertVals
        );
        
        await pool.query(
          `DELETE FROM classes_schema."${actualTableName}" WHERE school_id::text = $1::text`,
          [String(schoolId)]
        );

        finalStudentRow = insertRes.rows[0];

        // --- Invoice reset on transfer ---
        // Delete the student's UNPAID invoices (any fee structure) and regenerate
        // them under the new class fee structure. Paid/partially-paid invoices are
        // kept: deleting them would erase recorded payments (money already
        // collected) and would double-charge months that were already paid.
        try {
          const { branchPrisma: prisma } = require('../services/BranchPrismaService');
          const rowSid = `00000000-0000-0000-${String(finalStudentRow.school_id).padStart(4, '0')}-${String(finalStudentRow.class_id).padStart(12, '0')}`;

          const newFS = await prisma.feeStructure.findFirst({
            where: { gradeLevel: targetClassTableName, isActive: true },
            include: { items: true }
          }) || await prisma.feeStructure.findFirst({
            where: { gradeLevel: targetClassTableName },
            include: { items: true }
          });

          if (!newFS) {
            console.log(`[StudentList] No fee structure for ${targetClassTableName} - invoice reset skipped for ${rowSid}`);
          } else {
            const existingInvoices = await prisma.invoice.findMany({
              where: { studentId: rowSid },
              select: { id: true, paidAmount: true }
            });
            const unpaidIds = existingInvoices
              .filter(inv => parseFloat(inv.paidAmount || '0') === 0)
              .map(inv => inv.id);

            if (unpaidIds.length > 0) {
              await prisma.$transaction(async (tx) => {
                await tx.paymentAllocation.deleteMany({ where: { invoiceId: { in: unpaidIds } } });
                await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: unpaidIds } } });
                await tx.invoice.deleteMany({ where: { id: { in: unpaidIds } } });
              });
              console.log(`[StudentList] Transfer: deleted ${unpaidIds.length} unpaid invoices for ${rowSid}`);
            }

            // Regenerate months under the new class fee structure.
            // Months that still have an invoice (paid ones) are skipped.
            let selectedMonths = [];
            let registrationFee = 0;
            try {
              const monthsData = JSON.parse(newFS.description || '{}');
              selectedMonths = monthsData.months || [];
              registrationFee = parseFloat(monthsData.registrationFee) || 0;
            } catch (_) {}

            if (selectedMonths.length === 0) {
              console.log(`[StudentList] No months configured for ${targetClassTableName} - regeneration skipped`);
            } else {
              selectedMonths.sort((a, b) => a - b);
              const monthlyAmount = newFS.items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0);
              const accountId = newFS.items[0]?.accountId;
              const ethiopianMonths = ['Meskerem','Tikimt','Hidar','Tahsas','Tir','Yekatit','Megabit','Miazia','Genbot','Sene','Hamle','Nehase','Pagume'];

              const remaining = await prisma.invoice.findMany({
                where: { studentId: rowSid },
                select: { metadata: true }
              });
              const doneMonths = new Set(remaining.map(r => r.metadata?.monthNumber).filter(Boolean));

              const lateFeeRules = await prisma.lateFeeRule.findMany({
                where: { isActive: true },
                orderBy: { gracePeriodDays: 'desc' }
              });
              const gracePeriodDays = lateFeeRules.length > 0 ? lateFeeRules[0].gracePeriodDays : 0;
              const ethiopianNewYear = new Date(2025, 8, 11);

              let created = 0;
              for (let monthIndex = 0; monthIndex < selectedMonths.length; monthIndex++) {
                const targetMonth = selectedMonths[monthIndex];
                if (doneMonths.has(targetMonth)) continue;

                const monthName = ethiopianMonths[targetMonth - 1] || `Month ${targetMonth}`;
                const monthStartDate = new Date(ethiopianNewYear);
                monthStartDate.setDate(monthStartDate.getDate() + (targetMonth - 1) * 30);
                const dueDate = new Date(monthStartDate);
                dueDate.setDate(dueDate.getDate() + gracePeriodDays);

                const isFirstMonth = monthIndex === 0;
                const invoiceAmount = isFirstMonth ? monthlyAmount + registrationFee : monthlyAmount;
                const invoiceNumber = `INV-${Date.now()}-${rowSid.replace(/[^a-zA-Z0-9]/g, '')}-M${monthIndex + 1}`;
                const academicYearId = newFS.academicYearId;
                const campusId = newFS.campusId || '00000000-0000-0000-0000-000000000001';

                const invoiceItems = [{
                  description: `${monthName} Monthly Fee (Month ${monthIndex + 1} of ${selectedMonths.length})`,
                  feeCategory: 'TUITION',
                  amount: monthlyAmount,
                  accountId
                }];
                if (isFirstMonth && registrationFee > 0) {
                  invoiceItems.push({
                    description: 'Registration Fee (One-time)',
                    feeCategory: 'TUITION',
                    amount: registrationFee,
                    accountId
                  });
                }

                await prisma.invoice.create({
                  data: {
                    invoiceNumber,
                    studentId: rowSid,
                    academicYearId,
                    termId: null,
                    feeStructureId: newFS.id,
                    issueDate: new Date(),
                    dueDate,
                    totalAmount: invoiceAmount,
                    discountAmount: 0,
                    lateFeeAmount: 0,
                    netAmount: invoiceAmount,
                    paidAmount: 0,
                    status: 'ISSUED',
                    campusId,
                    createdBy: '00000000-0000-0000-0000-' + String(req.user?.id || '000000000001').padStart(12, '0'),
                    metadata: {
                      month: monthName,
                      monthNumber: targetMonth,
                      monthIndex: monthIndex + 1,
                      totalMonths: selectedMonths.length,
                      isAutoGenerated: true,
                      registrationFee: isFirstMonth ? registrationFee : 0
                    },
                    items: { create: invoiceItems }
                  }
                });
                doneMonths.add(targetMonth);
                created++;
              }
              console.log(`[StudentList] Transfer: regenerated ${created} invoices under ${targetClassTableName} for ${rowSid}`);
            }
          }
        } catch (invoiceErr) {
          console.error(`[StudentList] Invoice reset failed for transfer to ${targetClassTableName}:`, invoiceErr.message);
        }
      } catch (transferErr) {
        console.error(`[StudentList] Error transferring student to ${targetClassTableName}:`, transferErr);
      }
    }

    // Update global machine ID tracker if smachine_id was changed
    if (fields.smachine_id) {
      try {
        await pool.query(`
          DELETE FROM school_schema_points.global_machine_ids 
          WHERE school_id::text = $1::text
        `, [String(schoolId)]);
        
        await pool.query(`
          INSERT INTO school_schema_points.global_machine_ids 
          (smachine_id, student_name, class_name, school_id, class_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (smachine_id) DO UPDATE 
          SET student_name = EXCLUDED.student_name,
              class_name = EXCLUDED.class_name,
              school_id = EXCLUDED.school_id,
              class_id = EXCLUDED.class_id,
              updated_at = CURRENT_TIMESTAMP
        `, [
          fields.smachine_id, 
          finalStudentRow.student_name, 
          targetClassTableName || actualTableName, 
          schoolId, 
          classId
        ]);
      } catch (err) {
        console.log('Note: Global machine ID tracker not available:', err.message);
      }
    }

    // Delete old file if a new one was uploaded
    if (file && updates.image_student && updates.image_student !== file.filename) {
      const oldFilePath = path.join(uploadDir, updates.image_student);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch (_) {}
      }
    }

    res.json(finalStudentRow);
  } catch (error) {
    console.error(`Error updating student in class ${className}:`, error);
    res.status(500).json({ error: "Failed to update student", details: error.message });
  }
});

// Delete student
router.delete("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const pool = await getPool(req);
    const actualTableName = await resolveClassTable(pool, className, schoolId);

    if (!actualTableName) {
      return res.status(404).json({ error: "Student not found in any class" });
    }

    let result;
    if (classId && classId !== 'undefined' && classId !== 'null') {
      result = await pool.query(
        `DELETE FROM classes_schema."${actualTableName}" 
         WHERE (school_id::text = $1::text AND class_id::text = $2::text)
            OR (school_id::text = $1::text)
         RETURNING *`,
        [String(schoolId), String(classId)]
      );
    } else {
      result = await pool.query(
        `DELETE FROM classes_schema."${actualTableName}" 
         WHERE school_id::text = $1::text 
         RETURNING *`,
        [String(schoolId)]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Renumber remaining students sequentially so there are no gaps (1,2,3,4 not 1,2,4,5)
    try {
      await pool.query(
        `WITH ordered AS (
           SELECT ctid, ROW_NUMBER() OVER (ORDER BY school_id::int) AS new_id
           FROM classes_schema."${actualTableName}"
         )
         UPDATE classes_schema."${actualTableName}" t
         SET school_id = o.new_id,
             class_id = o.new_id::text
         FROM ordered o
         WHERE t.ctid = o.ctid`
      );
    } catch (renumberErr) {
      console.log("Note: Could not renumber students:", renumberErr.message);
    }

    if (result.rows[0].image_student) {
      const filePath = path.join(__dirname, "../Uploads", result.rows[0].image_student);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    try {
      await pool.query(
        `DELETE FROM academic_student_attendance WHERE student_id::text = $1::text`,
        [String(schoolId)]
      );
    } catch (_) {}

    try {
      await pool.query(
        `DELETE FROM school_schema_points.global_machine_ids WHERE school_id::text = $1::text`,
        [String(schoolId)]
      );
    } catch (_) {}

    res.json({ message: "Student deleted successfully", deletedStudent: result.rows[0] });
  } catch (error) {
    console.error(`Error deleting student:`, error);
    res.status(500).json({ error: "Failed to delete student", details: error.message });
  }
});

// DEACTIVATE/ACTIVATE STUDENT
router.put('/toggle-active/:className/:schoolId/:classId', async (req, res) => {
  const { className, schoolId, classId } = req.params;
  const { is_active } = req.body || {};
  
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean value' });
  }
  
  try {
    const pool = await getPool(req);
    const actualTableName = await resolveClassTable(pool, className, schoolId);
    if (!actualTableName) {
      return res.status(404).json({ error: 'Student not found in any class' });
    }
    
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 AND column_name = 'is_active'`,
      [actualTableName]
    );
    
    if (columnCheck.rowCount === 0) {
      await pool.query(
        `ALTER TABLE classes_schema."${actualTableName}" 
         ADD COLUMN is_active BOOLEAN DEFAULT TRUE`
      );
    }
    
    const updateResult = await pool.query(
      `UPDATE classes_schema."${actualTableName}" 
       SET is_active = $1 
       WHERE school_id::text = $2::text AND (class_id::text = $3::text OR class_id IS NULL)
       RETURNING *`,
      [is_active, String(schoolId), String(classId)]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      success: true,
      message: is_active 
        ? 'Student activated successfully' 
        : 'Student deactivated successfully',
      data: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error toggling student active status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TOGGLE FREE STUDENT
router.put('/toggle-free/:className/:schoolId/:classId', async (req, res) => {
  const { className, schoolId, classId } = req.params;
  const { is_free, exemption_type, exemption_reason } = req.body || {};
  
  if (typeof is_free !== 'boolean') {
    return res.status(400).json({ error: 'is_free must be a boolean value' });
  }
  
  if (is_free && !exemption_type) {
    return res.status(400).json({ error: 'exemption_type is required when marking student as free' });
  }
  
  try {
    const pool = await getPool(req);
    const actualTableName = await resolveClassTable(pool, className, schoolId);
    if (!actualTableName) {
      return res.status(404).json({ error: 'Student not found in any class' });
    }
    
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 
       AND column_name IN ('is_free', 'exemption_type', 'exemption_reason')`,
      [actualTableName]
    );
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('is_free')) {
      await pool.query(
        `ALTER TABLE classes_schema."${actualTableName}" 
         ADD COLUMN is_free BOOLEAN DEFAULT FALSE`
      );
    }
    
    if (!existingColumns.includes('exemption_type')) {
      await pool.query(
        `ALTER TABLE classes_schema."${actualTableName}" 
         ADD COLUMN exemption_type VARCHAR(50) DEFAULT NULL`
      );
    }
    
    if (!existingColumns.includes('exemption_reason')) {
      await pool.query(
        `ALTER TABLE classes_schema."${actualTableName}" 
         ADD COLUMN exemption_reason TEXT DEFAULT NULL`
      );
    }
    
    const updateResult = await pool.query(
      `UPDATE classes_schema."${actualTableName}" 
       SET is_free = $1, exemption_type = $2, exemption_reason = $3
       WHERE school_id::text = $4::text AND (class_id::text = $5::text OR class_id IS NULL)
       RETURNING *`,
      [is_free, is_free ? exemption_type : null, is_free ? exemption_reason : null, String(schoolId), String(classId)]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      success: true,
      message: is_free 
        ? `Student marked as learning for free (${exemption_type})` 
        : 'Student marked as paying student',
      data: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error toggling student free status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check machine ID across all classes
router.get("/check-machine-id/:machineId", async (req, res) => {
  const { machineId } = req.params;
  try {
    const pool = await getPool(req);
    try {
      const globalCheck = await pool.query(
        'SELECT student_name, class_name, school_id, class_id FROM school_schema_points.global_machine_ids WHERE smachine_id = $1',
        [machineId]
      );
      if (globalCheck.rows.length > 0) {
        return res.json({ exists: true, student: globalCheck.rows[0] });
      }
    } catch (_) {}

    const allClasses = (await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
      ['classes_schema']
    )).rows.map(row => row.table_name);

    for (const cls of allClasses) {
      try {
        const check = await pool.query(
          `SELECT student_name, class, school_id, class_id FROM classes_schema."${cls}" WHERE smachine_id = $1`,
          [machineId]
        );
        if (check.rows.length > 0) {
          return res.json({ exists: true, student: check.rows[0] });
        }
      } catch (_) {}
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Error checking machine ID:', error);
    res.status(500).json({ error: 'Failed to check machine ID' });
  }
});

module.exports = router;