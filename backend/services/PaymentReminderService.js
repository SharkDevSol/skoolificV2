/**
 * Payment Reminder Service
 *
 * Automated Ethiopian Calendar payment reminder SMS system for guardians.
 *
 * Rule:
 * - 5 days before entering each new Ethiopian month (Day 26 of current month,
 *   as Ethiopian regular months 1..12 have 30 days each).
 * - Sends an SMS reminder to guardians of active students who have NOT paid
 *   for the upcoming month.
 * - Uses the branch's 'payment_reminder' template from sms_templates (Somali language, > 100 chars).
 * - Strictly deduplicated per student per target month per year so guardians
 *   receive at most one reminder per month.
 */

const { Pool } = require('pg');
const ethiopianCalendar = require('../utils/ethiopianCalendar');
const SMSService = require('./SMSService');
let notifyGuardianPush = async () => {};
try {
  const gp = require('./guardianPush');
  if (gp && gp.notifyGuardianPush) notifyGuardianPush = gp.notifyGuardianPush;
} catch (_) {}

const ETH_MONTH_NAMES_SOMALI = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const DEFAULT_SOMALI_TEMPLATE =
  'Ku: Mudane/Marwo {guardian_name}, Waxaan si xushmad leh kuugu xasuusinaynaa in lacagta bisha {month_name} ee ardayga {student_name} ay dhiman tahay ({amount_due} Birr). Fadlan bixi lacagta ka hor inta aysan bilaaban bisha cusub si waxbarashada ardaygu u sii socoto si habsarri leh. Mahadsanid, {school_name}.';

/**
 * Get the target branch databases for the current deployment
 */
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

function getBranchCodeFromDb(dbName) {
  if (dbName === 'school_management10') return 'BILAL';
  const match = dbName.match(/iqrab(\d+)/i);
  return match ? `IQRA${match[1]}` : 'IQRA1';
}

function getSchoolNameFromDb(dbName) {
  if (dbName === 'school_management10') return 'BILAL ACADEMY';
  return 'IQRA ACADEMY';
}

/**
 * Ensure required tables exist in the target database
 */
async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sms_templates (
      id SERIAL PRIMARY KEY,
      template_key VARCHAR(50) UNIQUE NOT NULL,
      template_text TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS public.payment_reminder_log (
      id SERIAL PRIMARY KEY,
      guardian_username VARCHAR(100),
      student_uuid VARCHAR(80),
      target_month INTEGER,
      target_year INTEGER,
      channel VARCHAR(20) DEFAULT 'sms',
      last_reminded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS target_month INTEGER;
    ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS target_year INTEGER;
    ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms';

    INSERT INTO public.sms_templates (template_key, template_text, is_active)
    VALUES ('payment_reminder', '${DEFAULT_SOMALI_TEMPLATE.replace(/'/g, "''")}', true)
    ON CONFLICT (template_key) DO NOTHING;
  `).catch(err => {
    console.warn('[PaymentReminder] ensureTables warning:', err.message);
  });
}

/**
 * Run reminder sweep
 * @param {Object} options
 * @param {boolean} options.force - If true, run even if today is not day 26
 * @param {number} options.targetMonth - Explicit Ethiopian month number to target
 * @param {number} options.targetYear - Explicit Ethiopian year
 * @param {string} options.branchDb - Specific DB to run on (optional)
 * @returns {Promise<Object>} Results of sweep
 */
async function runReminderSweep(options = {}) {
  const { force = false, branchDb = null } = options;
  const eth = ethiopianCalendar.toEthiopian(new Date());

  // Ethiopian regular months have 30 days.
  // Day 26 is exactly 5 days before the new month starts on Day 1.
  const isReminderWindow = eth.day >= 26 && eth.day <= 30;

  if (!isReminderWindow && !force && !options.targetMonth) {
    console.log(`[PaymentReminder] Today is ${eth.day}/${eth.month}/${eth.year} ET. Not in 5-day pre-month window (Day 26-30). Skipping automatic sweep.`);
    return {
      ran: false,
      reason: 'Not in 5-day pre-month window',
      ethDate: eth,
      nextTriggerDay: 26
    };
  }

  // Target upcoming month
  let targetMonth = options.targetMonth;
  let targetYear = options.targetYear || eth.year;

  if (!targetMonth) {
    // 5 days before upcoming month: upcoming month is (currentMonth % 12) + 1
    targetMonth = (eth.month % 12) + 1;
    if (eth.month === 12) {
      targetYear = eth.year + 1;
    }
  }

  const targetMonthName = ETH_MONTH_NAMES_SOMALI[targetMonth - 1] || `Month ${targetMonth}`;

  console.log(`\n======================================================`);
  console.log(`🔔 STARTING PAYMENT REMINDER SWEEP (SMS)`);
  console.log(`📅 Current Ethiopian Date: ${eth.day}/${eth.month}/${eth.year}`);
  console.log(`🎯 Target Month: ${targetMonthName} (${targetMonth}/${targetYear})`);
  console.log(`⚡ Mode: ${force ? 'FORCED / MANUAL' : 'SCHEDULED (Day ' + eth.day + ')'}`);
  console.log(`======================================================\n`);

  const databases = branchDb ? [branchDb] : getBranchDatabases();
  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const summaryByDb = {};

  for (const dbName of databases) {
    const branchPool = createBranchPool(dbName);
    const branchCode = getBranchCodeFromDb(dbName);
    const schoolName = getSchoolNameFromDb(dbName);
    summaryByDb[dbName] = { sent: 0, skipped: 0, failed: 0, unpaidFound: 0 };

    try {
      await ensureTables(branchPool);

      // 1. Fetch branch SMS template
      let templateText = DEFAULT_SOMALI_TEMPLATE;
      try {
        const tmplRes = await branchPool.query(
          `SELECT template_text FROM public.sms_templates WHERE template_key = 'payment_reminder' AND is_active = true LIMIT 1`
        );
        if (tmplRes.rows.length > 0 && tmplRes.rows[0].template_text?.trim()) {
          templateText = tmplRes.rows[0].template_text;
        }
      } catch (_) {}

      // 2. Fetch all class tables
      const tablesResult = await branchPool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
      );

      for (const tRow of tablesResult.rows) {
        const className = tRow.table_name;
        let students = [];
        try {
          const sRes = await branchPool.query(`
            SELECT id, school_id, class_id, student_name, guardian_name, guardian_phone, guardian_username, is_free, is_active
            FROM classes_schema."${className}"
            WHERE (is_active = TRUE OR is_active IS NULL)
              AND (is_free = FALSE OR is_free IS NULL)
              AND guardian_phone IS NOT NULL AND guardian_phone != ''
          `);
          students = sRes.rows;
        } catch (_) {
          continue;
        }

        for (const student of students) {
          const rawPhone = student.guardian_phone;
          if (!rawPhone || String(rawPhone).trim().length < 9) continue;

          // Student UUID in invoices: 00000000-0000-0000-00XX-0000000000YY
          const sId = parseInt(student.school_id, 10);
          const cId = parseInt(student.class_id || student.id, 10);
          if (isNaN(sId) || isNaN(cId)) continue;

          const studentUuid = `00000000-0000-0000-${String(sId).padStart(4, '0')}-${String(cId).padStart(12, '0')}`;

          // Check deduplication log
          try {
            const alreadyReminded = await branchPool.query(`
              SELECT 1 FROM public.payment_reminder_log
              WHERE student_uuid = $1 AND target_month = $2 AND target_year = $3 AND channel = 'sms'
              LIMIT 1
            `, [studentUuid, targetMonth, targetYear]);

            if (alreadyReminded.rows.length > 0 && !force) {
              summaryByDb[dbName].skipped++;
              totalSkipped++;
              continue;
            }
          } catch (_) {}

          // Check invoice status for target month in school_comms."Invoice"
          let isPaid = false;
          let amountDue = 0;

          try {
            const invRes = await branchPool.query(`
              SELECT id, status, "netAmount", "paidAmount"
              FROM school_comms."Invoice"
              WHERE "studentId" = $1 AND (metadata->>'monthNumber')::int = $2
              LIMIT 1
            `, [studentUuid, targetMonth]);

            if (invRes.rows.length > 0) {
              const inv = invRes.rows[0];
              const net = parseFloat(inv.netAmount || 0);
              const paid = parseFloat(inv.paidAmount || 0);
              if (inv.status === 'PAID' || paid >= net) {
                isPaid = true;
              } else {
                amountDue = Math.max(0, net - paid);
              }
            } else {
              // No invoice for that month yet; check fee structure or default fee
              try {
                const fsRes = await branchPool.query(`
                  SELECT amount FROM school_comms."FeeStructure"
                  WHERE "gradeLevel" = $1 AND "isActive" = true
                  LIMIT 1
                `, [className]);
                if (fsRes.rows.length > 0) {
                  amountDue = parseFloat(fsRes.rows[0].amount || 0);
                }
              } catch (_) {}
            }
          } catch (e) {
            console.warn(`[PaymentReminder] Invoice query error for ${student.student_name}:`, e.message);
          }

          if (isPaid) {
            // Student already paid for this target month
            continue;
          }

          summaryByDb[dbName].unpaidFound++;

          // Compose SMS from template
          const guardianName = student.guardian_name || 'Waalid';
          const studentName = student.student_name || 'Ardayga';
          const amountStr = amountDue > 0 ? String(Math.round(amountDue)) : '';

          let messageText = templateText
            .replace(/\{guardian_name\}/g, guardianName)
            .replace(/\{student_name\}/g, studentName)
            .replace(/\{month_name\}/g, targetMonthName)
            .replace(/\{amount_due\}/g, amountStr)
            .replace(/\{school_name\}/g, schoolName)
            .replace(/\{branch_code\}/g, branchCode);

          // If amount is 0 or unknown, clean up "( Birr)" or "() Birr"
          messageText = messageText.replace(/\(\s*Birr\)/gi, '').replace(/\(\s*\)/g, '');

          // Send SMS via SMSService
          try {
            const smsResult = await SMSService.sendSMS(rawPhone, messageText, null, {
              templateKey: 'payment_reminder',
              recipientName: guardianName,
              branchCode
            });

            if (smsResult && smsResult.success) {
              summaryByDb[dbName].sent++;
              totalSent++;

              // Record in deduplication log
              await branchPool.query(`
                INSERT INTO public.payment_reminder_log
                  (guardian_username, student_uuid, target_month, target_year, channel, last_reminded_at)
                VALUES ($1, $2, $3, $4, 'sms', NOW())
              `, [student.guardian_username || '', studentUuid, targetMonth, targetYear]).catch(() => {});

              console.log(`✅ [PaymentReminder] SMS sent to ${rawPhone} for ${studentName} (${targetMonthName} due: ${amountStr})`);

              // Also trigger mobile app push notification if guardian has registered device
              if (student.guardian_username) {
                notifyGuardianPush(
                  student.guardian_username,
                  `Xusuusin Lacag Bixin (${targetMonthName})`,
                  messageText,
                  { type: 'payment', student_name: studentName, month: targetMonthName }
                ).catch(() => {});
              }
            } else {
              summaryByDb[dbName].failed++;
              totalFailed++;
              console.warn(`❌ [PaymentReminder] Failed to send SMS to ${rawPhone}:`, smsResult?.error);
            }
          } catch (sendErr) {
            summaryByDb[dbName].failed++;
            totalFailed++;
            console.error(`❌ [PaymentReminder] Error sending SMS to ${rawPhone}:`, sendErr.message);
          }
        }
      }
    } catch (dbErr) {
      console.error(`[PaymentReminder] Database sweep failed for ${dbName}:`, dbErr.message);
    } finally {
      await branchPool.end();
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 PAYMENT REMINDER SWEEP COMPLETE`);
  console.log(`📊 Sent: ${totalSent} | Skipped: ${totalSkipped} | Failed: ${totalFailed}`);
  console.log(`======================================================\n`);

  return {
    ran: true,
    targetMonth,
    targetMonthName,
    targetYear,
    ethDate: eth,
    totalSent,
    totalSkipped,
    totalFailed,
    summaryByDb
  };
}

/**
 * Get status of payment reminder configuration & upcoming window
 */
function getPaymentReminderStatus() {
  const eth = ethiopianCalendar.toEthiopian(new Date());
  const isReminderWindow = eth.day >= 26 && eth.day <= 30;
  const targetMonth = (eth.month % 12) + 1;
  const targetYear = eth.month === 12 ? eth.year + 1 : eth.year;
  const targetMonthName = ETH_MONTH_NAMES_SOMALI[targetMonth - 1];
  const daysUntilWindow = eth.day < 26 ? 26 - eth.day : 0;

  return {
    ethDate: {
      ...eth,
      monthName: ETH_MONTH_NAMES_SOMALI[eth.month - 1]
    },
    isReminderWindow,
    targetMonth,
    targetYear,
    targetMonthName,
    daysUntilWindow,
    triggerDay: 26,
    defaultTemplateLength: DEFAULT_SOMALI_TEMPLATE.length
  };
}

/**
 * Start periodic background check
 */
function startPaymentReminders() {
  console.log('✅ Payment Reminder Service initialized (checking Ethiopian calendar daily; triggers on Day 26)');

  // Initial check 45 seconds after startup
  setTimeout(() => {
    runReminderSweep().catch(err => {
      console.warn('[PaymentReminder] Initial startup sweep error:', err.message);
    });
  }, 45 * 1000).unref?.();

  // Run check every 6 hours
  const interval = setInterval(() => {
    runReminderSweep().catch(err => {
      console.warn('[PaymentReminder] Periodic sweep error:', err.message);
    });
  }, 6 * 60 * 60 * 1000);

  return interval;
}

module.exports = {
  startPaymentReminders,
  runReminderSweep,
  getPaymentReminderStatus,
  DEFAULT_SOMALI_TEMPLATE,
  ETH_MONTH_NAMES_SOMALI
};
