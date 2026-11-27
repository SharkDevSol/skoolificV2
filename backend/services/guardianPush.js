// Helper to send a push notification (FCM) to a guardian by their username.
// Uses pushToGuardian from guardianPushRoutes to deliver to registered devices in guardian_devices.
// Automatically translates title and message according to the guardian's selected language
// ('so' for Somali, 'am' for Amharic, 'ar' for Arabic, 'en' for English).

const db = require('../config/db');
const { pushToGuardian } = require('../routes/guardianPushRoutes');
const { t } = require('./notificationTranslations');

// --- ATTENDANCE PUSH DEDUPLICATION CACHE ---
// Prevents duplicate notifications for the same student, status, and date.
// Key format: attendance:<guardian_username>:<student_identifier>:<date>:<status>
// Stores timestamp; suppresses identical notifications sent within 12 hours.
const attendancePushCache = new Map();

// Periodic prune every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 1000;
  for (const [key, ts] of attendancePushCache.entries()) {
    if (ts < cutoff) attendancePushCache.delete(key);
  }
}, 10 * 60 * 1000).unref();

// Persistent dedupe so the same event is not sent again after a server restart
// or on the next day (the old in-memory cache lasted only 15 seconds).
async function ensurePushLog() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS guardian_push_log (
      dedup_key TEXT PRIMARY KEY,
      sent_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function alreadySent(dedupKey, days = 7) {
  try {
    await ensurePushLog();
    const r = await db.query(
      `SELECT 1 FROM guardian_push_log
        WHERE dedup_key = $1 AND sent_at > NOW() - ($2 || ' days')::interval
        LIMIT 1`,
      [dedupKey, String(days)]
    );
    return r.rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function markSent(dedupKey) {
  try {
    await ensurePushLog();
    await db.query(
      `INSERT INTO guardian_push_log (dedup_key) VALUES ($1) ON CONFLICT (dedup_key) DO NOTHING`,
      [dedupKey]
    );
  } catch (_) {}
}

function normalizeDateKey(value) {
  const s = String(value || '').trim();
  const m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  return s.toLowerCase();
}

const notifyGuardianPush = async (guardianUsername, title, body, data = {}) => {
  if (!guardianUsername) return { sent: 0 };
  try {
    // Deduplicate attendance and marks notifications. The same event must not
    // be sent repeatedly during the day or again on the next day.
    let persistentKey = null;
    if (data && (String(data.type).toLowerCase() === 'attendance' || String(data.type).toLowerCase() === 'marks')) {
      const gUser = String(guardianUsername || '').toLowerCase().trim();
      const typeKey = String(data.type).toLowerCase();
      const studentKey = String(data.studentId || data.school_id || data.studentName || data.student_name || '').toLowerCase().trim();
      if (typeKey === 'attendance') {
        const statusKey = String(data.status || '').toLowerCase().trim();
        const dateKey = normalizeDateKey(data.date || data.time || 'today');
        persistentKey = `attendance:${gUser}:${studentKey}:${dateKey}:${statusKey}`;
      } else {
        const subjectKey = String(data.subject || '').toLowerCase().trim();
        const termKey = String(data.term || '1').toLowerCase().trim();
        const scoreKey = String(data.score ?? '').toLowerCase().trim();
        persistentKey = `marks:${gUser}:${studentKey}:${subjectKey}:${termKey}:${scoreKey}`;
      }

      const lastSent = attendancePushCache.get(persistentKey);
      if (lastSent && (Date.now() - lastSent < 15 * 1000)) {
        console.log(`[guardianPush] Suppressed rapid duplicate notification (<15s): ${persistentKey}`);
        return { sent: 0, suppressed: true, reason: 'duplicate_recent' };
      }
      if (await alreadySent(persistentKey, 7)) {
        console.log(`[guardianPush] Suppressed duplicate notification (already sent in last 7 days): ${persistentKey}`);
        return { sent: 0, suppressed: true, reason: 'duplicate_persistent' };
      }
    }

    let finalTitle = title;
    let finalBody = body;

    // Translation support based on the guardian's registered language
    try {
      const langRow = await db.query(
        `SELECT language FROM guardian_devices
         WHERE LOWER(guardian_username) = LOWER($1) AND active = true
         ORDER BY updated_at DESC LIMIT 1`,
        [guardianUsername]
      );
      const lang = ((langRow.rows[0] && langRow.rows[0].language) || 'en').toLowerCase().trim();

      const i18n = data && data._i18n;
      if (i18n && i18n.key) {
        const tpl = t(lang, i18n.key);
        if (tpl) {
          finalBody = typeof tpl === 'function' ? tpl(...(i18n.params || [])) : tpl;
          finalTitle = t(lang, i18n.titleKey) || title;
        }
        delete data._i18n;
      } else if (data && data.type) {
        const type = String(data.type).toLowerCase();
        if (type === 'discipline') {
          const tTitle = t(lang, 'discipline_title');
          const tBody = t(lang, 'discipline_body');
          if (tTitle) finalTitle = tTitle;
          if (typeof tBody === 'function') {
            finalBody = tBody(
              data.studentName || 'Student',
              data.faultType || '',
              data.faultLevel || '',
              data.description || body
            );
          }
        } else if (type === 'attendance') {
          const status = (data.status || '').toLowerCase();
          const dateStr = data.date || data.time || 'today';
          if (status === 'absent') {
            const tTitle = t(lang, 'attendance_absent_title');
            const tBody = t(lang, 'attendance_absent_body');
            if (tTitle) finalTitle = tTitle;
            if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', dateStr);
          } else if (status === 'late') {
            const tTitle = t(lang, 'attendance_late_title');
            const tBody = t(lang, 'attendance_late_body');
            if (tTitle) finalTitle = tTitle;
            if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', dateStr);
          } else if (status === 'present') {
            const tTitle = t(lang, 'attendance_present_title');
            const tBody = t(lang, 'attendance_present_body');
            if (tTitle) finalTitle = tTitle;
            if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', dateStr);
          } else if (status === 'leave' || status === 'excused' || status === 'vacation') {
            const tTitle = t(lang, 'attendance_leave_title');
            const tBody = t(lang, 'attendance_leave_body');
            if (tTitle) finalTitle = tTitle;
            if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', dateStr);
          } else {
            const tTitle = t(lang, 'attendance_update_title');
            const tBody = t(lang, 'attendance_update_body');
            if (tTitle) finalTitle = tTitle;
            if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', (data.status || 'recorded').toUpperCase(), dateStr);
          }
        } else if (type === 'evaluation') {
          const tTitle = t(lang, 'evaluation_title');
          const tBody = t(lang, 'evaluation_body');
          if (tTitle) finalTitle = tTitle;
          if (typeof tBody === 'function') finalBody = tBody(data.studentName || 'Student', data.className || '');
        } else if (type === 'marks') {
          const tTitle = t(lang, 'marks_title');
          if (tTitle) finalTitle = tTitle;
          if (data.score !== undefined) {
            const tBody = t(lang, 'marks_body');
            if (typeof tBody === 'function') {
              finalBody = tBody(
                data.studentName || 'Student',
                data.subject || '',
                data.term || '1',
                data.score || '',
                data.status || ''
              );
            }
          } else {
            const tBody = t(lang, 'marks_bulk_body');
            if (typeof tBody === 'function') {
              finalBody = tBody(data.studentName || 'Student', data.subject || '', data.term || '1');
            }
          }
        } else if (type === 'payment' || type === 'payments') {
          const tTitle = t(lang, 'payment_title');
          const tBody = t(lang, 'payment_body');
          if (tTitle) finalTitle = tTitle;
          if (typeof tBody === 'function') {
            finalBody = tBody(
              data.studentName || 'Student',
              data.amount || '',
              data.receiptNumber || ''
            );
          }
        } else if (type === 'chat' || type === 'message' || type === 'messages') {
          const tTitle = t(lang, 'chat_title');
          if (typeof tTitle === 'function') {
            finalTitle = tTitle(data.senderName || data.teacherName || 'School');
          }
          if (body === 'Sent an attachment' || (data.hasAttachments && !body)) {
            const tAtt = t(lang, 'chat_attachment_body');
            if (tAtt) finalBody = tAtt;
          }
        }
      }
    } catch (trErr) {
      console.warn('Push translation warning (non-blocking):', trErr.message);
    }

    // Safety: ensure title and body are never empty strings
    const studentDisplayName = data.studentName || data.student_name || 'Student';
    if (!finalTitle || !String(finalTitle).trim()) {
      finalTitle = title || 'IQRA Notification';
    }
    if (!finalBody || !String(finalBody).trim()) {
      if (data.type === 'attendance') {
        const st = (data.status || 'checked in').toLowerCase();
        const dateStr = data.date || data.time || 'today';
        finalBody = `Notice: ${studentDisplayName} attendance was recorded as ${st.toUpperCase()} (${dateStr}).`;
      } else {
        finalBody = body || `New update for ${studentDisplayName}.`;
      }
    }

    const res = await pushToGuardian(guardianUsername, finalTitle, finalBody, data);

    // Remember the alert only when it was actually delivered.
    try {
      if (persistentKey && res && res.sent > 0) {
        attendancePushCache.set(persistentKey, Date.now());
        await markSent(persistentKey);
      }
    } catch (_) {}

    return res;
  } catch (e) {
    console.warn('Push notify guardian failed (non-blocking):', e.message);
    return { success: false, error: e.message };
  }
};

module.exports = { notifyGuardianPush };
