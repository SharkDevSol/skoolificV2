/**
 * Auto invoice generation for a single, newly enrolled student.
 *
 * The finance "payment settings" (FeeStructure) screen generates invoices for
 * every student that exists AT THAT MOMENT. Students added later never had
 * invoices created for them, so they appeared in Monthly Payments with
 * 0.00 Birr and PENDING status. This service is called right after a student
 * is inserted so each new enrollment immediately gets the same monthly
 * invoices (including the one-time registration fee) as everyone else.
 */

const MONTH_NAMES = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

// Ethiopian New Year (Meskerem 1, 2018) = September 11, 2025
const ETHIOPIAN_NEW_YEAR = new Date(2026 - 1, 8, 11);

function paddedUuid(schoolId, classId) {
  return `00000000-0000-0000-${String(schoolId).padStart(4, '0')}-${String(classId).padStart(12, '0')}`;
}

function parseFeeStructureDescription(description) {
  let text = description || '{}';
  // Older rows may contain HTML-escaped JSON
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

function registrationFeeFor(monthsData, studentType) {
  const flat = parseFloat(monthsData.registrationFee);
  if (!Number.isNaN(flat) && flat > 0) return flat;
  const isOld = String(studentType || '').toLowerCase() === 'old';
  const typed = parseFloat(isOld ? monthsData.oldRegistrationFee : monthsData.newRegistrationFee);
  if (!Number.isNaN(typed) && typed > 0) return typed;
  const fallback = parseFloat(isOld ? monthsData.newRegistrationFee : monthsData.oldRegistrationFee);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function monthDueDate(monthNumber, gracePeriodDays) {
  const start = new Date(ETHIOPIAN_NEW_YEAR);
  start.setDate(start.getDate() + (monthNumber - 1) * 30);
  start.setDate(start.getDate() + gracePeriodDays);
  start.setHours(12, 0, 0, 0);
  return start;
}

function creatorUuid(userId) {
  const raw = String(userId || '');
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '') || '1';
  return `00000000-0000-0000-0000-${digits.padStart(12, '0')}`;
}

async function findActiveFeeStructure(pool, className) {
  const { rows } = await pool.query(
    `SELECT fs.id, fs."academicYearId", fs."campusId", fs.description,
            COALESCE((
              SELECT SUM(fsi.amount) FROM school_comms."FeeStructureItem" fsi
              WHERE fsi."feeStructureId" = fs.id
            ), 0) AS monthly_amount,
            (
              SELECT fsi."accountId" FROM school_comms."FeeStructureItem" fsi
              WHERE fsi."feeStructureId" = fs.id
              ORDER BY fsi.amount DESC LIMIT 1
            ) AS account_id
       FROM school_comms."FeeStructure" fs
      WHERE LOWER(fs."gradeLevel") = LOWER($1)
        AND fs."isActive" IS TRUE
      ORDER BY fs."createdAt" DESC
      LIMIT 1`,
    [className]
  );
  return rows[0] || null;
}

async function getGracePeriod(pool) {
  try {
    const { rows } = await pool.query(
      `SELECT "gracePeriodDays" FROM school_comms."LateFeeRule"
        WHERE "isActive" IS TRUE ORDER BY "gracePeriodDays" DESC LIMIT 1`
    );
    return rows[0] ? Number(rows[0].gracePeriodDays) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Generate monthly invoices for one student.
 * Returns { created, skipped, monthlyAmount, registrationFee }.
 * Never throws for "nothing configured" cases; caller may treat errors as non-fatal.
 */
async function generateInvoicesForStudent(pool, {
  className,
  schoolId,
  classId,
  studentName,
  isFree = false,
  studentType = null,
  createdBy = null,
} = {}) {
  if (!className || schoolId == null || classId == null) {
    return { created: 0, skipped: 0, reason: 'missing-identity' };
  }

  const feeStructure = await findActiveFeeStructure(pool, className);
  if (!feeStructure) {
    return { created: 0, skipped: 0, reason: 'no-fee-structure' };
  }

  const monthsData = parseFeeStructureDescription(feeStructure.description);
  let selectedMonths = Array.isArray(monthsData.months) ? monthsData.months.map(Number).filter(Boolean) : [];
  if (selectedMonths.length === 0) {
    selectedMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
  selectedMonths.sort((a, b) => a - b);

  const monthlyAmount = Number(feeStructure.monthly_amount) || 0;
  const registrationFee = registrationFeeFor(monthsData, studentType);
  const accountId = feeStructure.account_id;
  const studentId = paddedUuid(schoolId, classId);
  const gracePeriodDays = await getGracePeriod(pool);
  const academicYearId = feeStructure.academicYearId || '00000000-0000-0000-0000-000000000001';
  const campusId = feeStructure.campusId || '00000000-0000-0000-0000-000000000001';
  const createdByUuid = creatorUuid(createdBy);

  // Students who already have an invoice for a month are skipped, so this is
  // safe to call more than once for the same student.
  const existing = await pool.query(
    `SELECT metadata FROM school_comms."Invoice" WHERE "studentId" = $1`,
    [studentId]
  );
  const doneMonths = new Set(
    existing.rows.map(row => Number(row.metadata?.monthNumber)).filter(Boolean)
  );

  if (isFree) {
    // Free students pay no tuition - only the one-time registration fee.
    if (registrationFee <= 0 || doneMonths.has(selectedMonths[0])) {
      return { created: 0, skipped: 0, monthlyAmount, registrationFee };
    }
    const firstMonth = selectedMonths[0];
    const monthName = MONTH_NAMES[firstMonth - 1] || `Month ${firstMonth}`;
    const invoiceNumber = `INV-${Date.now()}-${studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)}-REG`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO school_comms."Invoice"
          (id, "invoiceNumber", "studentId", "academicYearId", "termId", "feeStructureId",
           "issueDate", "dueDate", "totalAmount", "discountAmount", "lateFeeAmount",
           "netAmount", "paidAmount", status, "campusId", metadata, "createdBy", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4, NOW(), $5, $6, 0, 0, $6, 0,
                 'ISSUED', $7, $8::jsonb, $9, NOW())
         RETURNING id`,
        [
          invoiceNumber, studentId, academicYearId, feeStructure.id,
          monthDueDate(firstMonth, gracePeriodDays), registrationFee, campusId,
          JSON.stringify({
            month: monthName,
            monthNumber: firstMonth,
            monthIndex: 1,
            totalMonths: 1,
            isAutoGenerated: true,
            registrationFee,
            isFreeStudent: true,
            studentType,
          }),
          createdByUuid,
        ]
      );
      await client.query(
        `INSERT INTO school_comms."InvoiceItem"
          (id, "invoiceId", "feeCategory", description, amount, "accountId", quantity)
         VALUES (gen_random_uuid(), $1, 'REGISTRATION', 'Registration Fee (Free Student)', $2, $3, 1)`,
        [rows[0].id, registrationFee, accountId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return { created: 1, skipped: 0, monthlyAmount, registrationFee };
  }

  if (monthlyAmount <= 0 || !accountId) {
    return { created: 0, skipped: 0, reason: 'fee-structure-incomplete', monthlyAmount, registrationFee };
  }

  const invoicesToCreate = [];
  for (let index = 0; index < selectedMonths.length; index++) {
    const monthNumber = selectedMonths[index];
    if (doneMonths.has(monthNumber)) continue;
    invoicesToCreate.push({ monthNumber, index });
  }

  if (invoicesToCreate.length === 0) {
    return { created: 0, skipped: selectedMonths.length, monthlyAmount, registrationFee };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { monthNumber, index } of invoicesToCreate) {
      const monthName = MONTH_NAMES[monthNumber - 1] || `Month ${monthNumber}`;
      const isFirstMonth = index === 0;
      const amount = monthlyAmount + (isFirstMonth ? registrationFee : 0);
      const invoiceNumber = `INV-${Date.now()}-${studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)}-M${index + 1}`;

      const { rows } = await client.query(
        `INSERT INTO school_comms."Invoice"
          (id, "invoiceNumber", "studentId", "academicYearId", "termId", "feeStructureId",
           "issueDate", "dueDate", "totalAmount", "discountAmount", "lateFeeAmount",
           "netAmount", "paidAmount", status, "campusId", metadata, "createdBy", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4, NOW(), $5, $6, 0, 0, $6, 0,
                 'ISSUED', $7, $8::jsonb, $9, NOW())
         RETURNING id`,
        [
          invoiceNumber, studentId, academicYearId, feeStructure.id,
          monthDueDate(monthNumber, gracePeriodDays), amount, campusId,
          JSON.stringify({
            month: monthName,
            monthNumber,
            monthIndex: index + 1,
            totalMonths: selectedMonths.length,
            isAutoGenerated: true,
            oldRegistrationFee: isFirstMonth ? (parseFloat(monthsData.oldRegistrationFee) || 0) : 0,
            newRegistrationFee: isFirstMonth ? (parseFloat(monthsData.newRegistrationFee) || 0) : 0,
            registrationFee: isFirstMonth ? registrationFee : 0,
            studentType: isFirstMonth ? studentType : null,
          }),
          createdByUuid,
        ]
      );

      const invoiceId = rows[0].id;
      await client.query(
        `INSERT INTO school_comms."InvoiceItem"
          (id, "invoiceId", "feeCategory", description, amount, "accountId", quantity)
         VALUES (gen_random_uuid(), $1, 'TUITION', $2, $3, $4, 1)`,
        [invoiceId, `${monthName} Monthly Fee (Month ${index + 1} of ${selectedMonths.length})`, monthlyAmount, accountId]
      );

      if (isFirstMonth && registrationFee > 0) {
        await client.query(
          `INSERT INTO school_comms."InvoiceItem"
            (id, "invoiceId", "feeCategory", description, amount, "accountId", quantity)
           VALUES (gen_random_uuid(), $1, 'TUITION', $2, $3, $4, 1)`,
          [
            invoiceId,
            `Registration Fee (${String(studentType || '').toLowerCase() === 'old' ? 'Old' : 'New'} Student)`,
            registrationFee,
            accountId,
          ]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    created: invoicesToCreate.length,
    skipped: selectedMonths.length - invoicesToCreate.length,
    monthlyAmount,
    registrationFee,
    studentName,
  };
}

module.exports = {
  generateInvoicesForStudent,
  paddedUuid,
  registrationFeeFor,
  monthDueDate,
};
