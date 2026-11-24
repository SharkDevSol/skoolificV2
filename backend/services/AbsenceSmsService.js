const { Pool } = require('pg');
const SMSService = require('./SMSService');

const DEFAULT_ABSENCE_TEMPLATE =
  'Ku: {guardian_name}. Ardayga {student_name} ({class_name}) maanta ma uusan iman dugsiga taariikh: {date}. Haddii aysan fasax ahayn fadlan la xiriir maamulka. Mahadsanid, {school_name}.';

/**
 * Send Absence Alert SMS to guardian immediately
 * @param {Object} db - Database client or pool
 * @param {Object} params
 * @param {string} params.className - Class table name (e.g. 'G7')
 * @param {string|number} params.studentId - Student school ID
 * @param {string} [params.studentName] - Student name
 * @param {string} [params.ethDateStr] - Ethiopian date string (YYYY-MM-DD)
 * @param {string} [params.schoolName] - School name
 * @returns {Promise<Object>}
 */
async function sendAbsenceAlertSms(db, { className, studentId, studentName, ethDateStr, schoolName }) {
  try {
    if (!db || !className || !studentId) {
      return { success: false, reason: 'Missing required parameters' };
    }

    // 1. Check if absence_alert is active in toggle switch for this specific branch
    const isActive = await SMSService.isTemplateActive('absence_alert', db);
    if (!isActive) {
      console.log(`[Absence SMS] 'absence_alert' template is INACTIVE for this branch. Skipping SMS for student ${studentId}.`);
      return { success: true, skipped: true, reason: 'Template inactive' };
    }

    // 2. Query guardian details from class roster
    const studentQuery = `
      SELECT student_name, guardian_name, guardian_phone, guardian_2nd_phone, guardian2_phone, guardian2nd_phone
      FROM classes_schema."${className}"
      WHERE school_id::text = $1
      LIMIT 1
    `;
    const stRes = await db.query(studentQuery, [String(studentId)]);
    if (stRes.rows.length === 0) {
      console.warn(`[Absence SMS] Student ${studentId} not found in classes_schema."${className}"`);
      return { success: false, reason: 'Student not found in class table' };
    }

    const row = stRes.rows[0];
    const finalStudentName = (row.student_name || studentName || 'Ardayga').trim();
    const guardianName = (row.guardian_name || 'Waalid').trim();
    const phone = row.guardian_phone || row.guardian_2nd_phone || row.guardian2_phone || row.guardian2nd_phone;

    if (!phone) {
      console.warn(`[Absence SMS] No phone number on file for guardian of ${finalStudentName} (ID: ${studentId})`);
      return { success: false, reason: 'Guardian has no phone number on file' };
    }

    // 3. Prevent duplicate absence SMS on the same day for this phone & student
    const dateToday = ethDateStr || new Date().toISOString().split('T')[0];
    const normPhone = SMSService.normalizePhone ? SMSService.normalizePhone(phone) : phone;
    try {
      const dupCheck = await db.query(
        `SELECT id FROM sms_logs 
         WHERE template_key = 'absence_alert' 
           AND (phone = $1 OR phone = $2)
           AND status = 'sent'
           AND created_at >= CURRENT_DATE 
           AND message LIKE $3 
         LIMIT 1`,
        [String(phone).trim(), String(normPhone).trim(), `%${finalStudentName}%`]
      );
      if (dupCheck.rows.length > 0) {
        console.log(`[Absence SMS] Already sent absence SMS today for ${finalStudentName} to ${phone}. Skipping.`);
        return { success: true, skipped: true, reason: 'Already sent today' };
      }
    } catch (dupErr) {
      console.warn('[Absence SMS] Duplicate check skipped:', dupErr.message);
    }

    // 4. Load message template text
    let templateText = DEFAULT_ABSENCE_TEMPLATE;
    try {
      const tmplRes = await db.query(
        `SELECT template_text, is_active FROM sms_templates WHERE template_key = 'absence_alert' LIMIT 1`
      );
      if (tmplRes.rows.length > 0) {
        if (tmplRes.rows[0].is_active === false) {
          return { success: true, skipped: true, reason: 'Template inactive' };
        }
        if (tmplRes.rows[0].template_text) {
          templateText = tmplRes.rows[0].template_text;
        }
      }
    } catch (_) {}

    // 5. Replace placeholders
    const finalSchoolName = schoolName || process.env.SCHOOL_NAME || 'IQRA ACADEMY';
    const message = templateText
      .replace(/\{guardian_name\}/g, guardianName)
      .replace(/\{student_name\}/g, finalStudentName)
      .replace(/\{class_name\}/g, className)
      .replace(/\{date\}/g, dateToday)
      .replace(/\{school_name\}/g, finalSchoolName);

    // 6. Send the SMS via SMSService
    console.log(`[Absence SMS] Sending absence SMS to ${guardianName} (${phone}) for student ${finalStudentName}...`);
    const sendRes = await SMSService.sendSMS(phone, message, null, {
      templateKey: 'absence_alert',
      recipientName: guardianName,
      studentName: finalStudentName,
      className,
      db
    });

    console.log(`[Absence SMS] Send result for ${finalStudentName}:`, sendRes);
    return {
      success: sendRes.success,
      phone,
      message,
      sendRes
    };
  } catch (err) {
    console.error(`[Absence SMS] Error processing absence SMS for student ${studentId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Queue Absence SMS with a 30-minute grace window.
 * If the staff member corrects the mark within 30 minutes, it gets cancelled.
 */
async function queueAbsenceSms(db, { className, studentId, studentName, ethDateStr, schoolName, delayMinutes = 30 }) {
  try {
    if (!db || !className || !studentId) {
      return { success: false, reason: 'Missing required parameters' };
    }

    // If template is inactive in this branch, do not even queue
    const isActive = await SMSService.isTemplateActive('absence_alert', db);
    if (!isActive) {
      console.log(`[Absence SMS Queue] Template is inactive for this branch. Skipping queue for student ${studentId}.`);
      return { success: true, skipped: true, reason: 'Template inactive' };
    }

    const dateToday = ethDateStr || new Date().toISOString().split('T')[0];

    // Ensure pending table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.pending_absence_sms (
        id SERIAL PRIMARY KEY,
        branch_code VARCHAR(50),
        student_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(150),
        class_name VARCHAR(50),
        eth_date_str VARCHAR(50),
        school_name VARCHAR(150),
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
        status VARCHAR(20) DEFAULT 'pending',
        cancelled_reason TEXT,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Supersede any existing pending row for this student today
    await db.query(`
      UPDATE public.pending_absence_sms
      SET status = 'superseded', updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1 AND eth_date_str = $2 AND status = 'pending';
    `, [String(studentId).trim(), String(dateToday).trim()]);

    const scheduledAt = new Date(Date.now() + Math.max(1, delayMinutes) * 60 * 1000);

    const insRes = await db.query(`
      INSERT INTO public.pending_absence_sms
        (branch_code, class_name, student_id, student_name, eth_date_str, school_name, scheduled_at, status)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id, scheduled_at;
    `, [
      process.env.DB_NAME || 'iqra',
      className,
      String(studentId).trim(),
      studentName || 'Student',
      String(dateToday).trim(),
      schoolName || 'IQRA ACADEMY',
      scheduledAt
    ]);

    console.log(`[Absence SMS Queue] ⏱️ Queued absence SMS for ${studentName} (ID: ${studentId}) in ${className}. Will send at ${scheduledAt.toLocaleTimeString()} (${delayMinutes} min buffer).`);
    return { success: true, queued: true, id: insRes.rows[0].id, scheduled_at: scheduledAt };
  } catch (err) {
    console.warn(`[Absence SMS Queue] Error queueing absence SMS for student ${studentId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cancel a pending absence SMS if the teacher corrects the status (e.g. to Present, Late, or Permission)
 */
async function cancelPendingAbsenceSms(db, { studentId, ethDateStr, reason }) {
  try {
    if (!db || !studentId) return { success: false };
    const dateToday = ethDateStr || new Date().toISOString().split('T')[0];

    const res = await db.query(`
      UPDATE public.pending_absence_sms
      SET status = 'cancelled',
          cancelled_reason = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1 
        AND (eth_date_str = $2 OR created_at::date = CURRENT_DATE)
        AND status = 'pending'
      RETURNING id, student_name;
    `, [String(studentId).trim(), String(dateToday).trim(), reason || 'Mark corrected by staff within buffer window']);

    if (res.rowCount > 0) {
      console.log(`[Absence SMS Queue] 🛑 Cancelled ${res.rowCount} pending absence SMS for student ID ${studentId} (${reason || 'Status changed'}). SMS will NOT be sent.`);
    }
    return { success: true, cancelled: res.rowCount > 0, count: res.rowCount };
  } catch (err) {
    console.warn(`[Absence SMS Queue] Error cancelling pending absence SMS for student ${studentId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verify whether the student is still recorded as absent in attendance records
 */
async function isStudentStillAbsent(db, row) {
  try {
    // Check academic_student_attendance
    const q1 = await db.query(`
      SELECT status FROM public.academic_student_attendance
      WHERE student_id::text = $1 
        AND (date::text LIKE $2 OR created_at::date = CURRENT_DATE OR updated_at::date = CURRENT_DATE)
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1;
    `, [String(row.student_id).trim(), `${row.eth_date_str}%`]);

    if (q1.rows.length > 0) {
      const st = String(q1.rows[0].status || '').toUpperCase();
      if (st === 'PRESENT' || st === 'P' || st === 'LATE' || st === 'L' || st === 'LEAVE' || st === 'PERMISSION' || st === 'E') {
        return false;
      }
      if (st === 'ABSENT' || st === 'A') {
        return true;
      }
    }

    // Check weekly attendance table
    try {
      const weekDate = new Date();
      const dayIndex = weekDate.getDay(); // 0 Sun, 1 Mon, 2 Tue...
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayCol = dayNames[dayIndex];

      const diff = weekDate.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
      const mon = new Date(weekDate.setDate(diff));
      const weekSuffix = mon.getFullYear() + '_' + String(mon.getMonth() + 1).padStart(2, '0') + '_' + String(mon.getDate()).padStart(2, '0');
      const schemaName = `class_${row.class_name}_weekly_attendance`;
      const tableName = `week_${weekSuffix}`;

      const wq = await db.query(`
        SELECT "${todayCol}" FROM "${schemaName}"."${tableName}"
        WHERE school_id::text = $1
        LIMIT 1;
      `, [String(row.student_id).trim()]);

      if (wq.rows.length > 0) {
        const val = String(wq.rows[0][todayCol] || '').toUpperCase();
        if (val === 'P' || val === 'L' || val === 'E' || val === '') {
          return false;
        }
        if (val === 'A') {
          return true;
        }
      }
    } catch (_) {}

    return true; // Still absent if no present record found
  } catch (_) {
    return true;
  }
}

/**
 * Process overdue pending absence SMS records in a database pool
 */
async function processPendingAbsenceQueue(db) {
  try {
    const overdue = await db.query(`
      SELECT * FROM public.pending_absence_sms
      WHERE status = 'pending' AND scheduled_at <= CURRENT_TIMESTAMP
      ORDER BY id ASC
      LIMIT 50;
    `);

    if (overdue.rows.length === 0) return 0;

    console.log(`[Absence SMS Queue] Found ${overdue.rows.length} overdue pending absence SMS to process.`);
    let processed = 0;

    for (const item of overdue.rows) {
      // 1. Double check: is student still absent?
      const stillAbsent = await isStudentStillAbsent(db, item);
      if (!stillAbsent) {
        console.log(`[Absence SMS Queue] Student ${item.student_name} (ID: ${item.student_id}) is no longer marked absent. Cancelling SMS.`);
        await db.query(`
          UPDATE public.pending_absence_sms
          SET status = 'cancelled',
              cancelled_reason = 'Student status was updated away from Absent during grace period',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [item.id]);
        continue;
      }

      // 2. Still absent! Dispatch SMS
      console.log(`[Absence SMS Queue] Grace period elapsed. Dispatching absence alert for ${item.student_name} (${item.class_name})...`);
      const sendRes = await sendAbsenceAlertSms(db, {
        className: item.class_name,
        studentId: item.student_id,
        studentName: item.student_name,
        ethDateStr: item.eth_date_str,
        schoolName: item.school_name
      });

      if (sendRes.success) {
        await db.query(`
          UPDATE public.pending_absence_sms
          SET status = 'sent',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [item.id]);
        processed++;
      } else {
        await db.query(`
          UPDATE public.pending_absence_sms
          SET status = 'failed',
              error_message = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [item.id, sendRes.error || sendRes.reason || 'Failed to dispatch']);
      }
    }

    return processed;
  } catch (err) {
    console.warn('[Absence SMS Queue] Queue processing warning:', err.message);
    return 0;
  }
}

function getBranchDatabases() {
  const currentDb = process.env.DB_NAME || 'iqrab1';
  if (currentDb === 'school_management10') {
    return ['school_management10'];
  }
  return ['iqrab1', 'iqrab2', 'iqrab3', 'iqrab4', 'iqrab5'];
}

function createBranchPool(dbName) {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: dbName,
    user: process.env.DB_USER || 'iqra',
    password: String(process.env.DB_PASSWORD || 'iqra1768')
  });
}

/**
 * Start background queue runner (checks every 60 seconds)
 */
function startAbsenceQueueRunner() {
  console.log('✅ Absence SMS 30-Minute Grace Buffer Runner initialized (checking queue every 60s)');

  const checkAllBranches = async () => {
    const dbs = getBranchDatabases();
    for (const dbName of dbs) {
      let pool;
      try {
        pool = createBranchPool(dbName);
        await processPendingAbsenceQueue(pool);
      } catch (err) {
        // silent
      } finally {
        if (pool) await pool.end().catch(() => {});
      }
    }
  };

  // Run initial check after 20 seconds
  setTimeout(checkAllBranches, 20 * 1000).unref?.();

  // Periodic runner every 60 seconds
  const interval = setInterval(checkAllBranches, 60 * 1000);
  return interval;
}

module.exports = {
  sendAbsenceAlertSms,
  queueAbsenceSms,
  cancelPendingAbsenceSms,
  processPendingAbsenceQueue,
  startAbsenceQueueRunner,
  DEFAULT_ABSENCE_TEMPLATE
};
