const express = require('express');
const router = express.Router();
router.use(express.json());
const pool = require('../config/db');
const { sendSMS } = require('../services/SMSService');
let cleanupStaleJobs = async () => {};
try {
  const gateway = require('../services/AndroidSmsGatewayService');
  if (gateway && gateway.cleanupStaleJobs) cleanupStaleJobs = gateway.cleanupStaleJobs;
} catch (_) {}

const normalizePhone = (raw) => {
  let phone = String(raw || '').replace(/[^0-9+]/g, '');
  if (!phone) return '';
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0') && phone.length >= 9 && phone.length <= 10) phone = '251' + phone.slice(1);
  return phone;
};

const isDummyPhone = (raw) => {
  const clean = String(raw || '').replace(/[^0-9]/g, '');
  if (!clean || clean.length < 9) return true;
  if (/^0?700000000+$/.test(clean) || /^251700000000+$/.test(clean)) return true;
  if (/^0?900000000+$/.test(clean) || /^251900000000+$/.test(clean)) return true;
  if (/^0+$/.test(clean) || /^1+$/.test(clean) || /000000$/.test(clean)) return true;
  return false;
};

const getSubjectSchemaName = (subjectName) => {
  const clean = (subjectName || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `subject_${clean}_schema`;
};

const abbreviateSubject = (name) => {
  const n = (name || '').trim();
  const map = {
    'mathematics': 'Math',
    'math': 'Math',
    'english': 'Eng',
    'biology': 'Bio',
    'chemistry': 'Chem',
    'physics': 'Phy',
    'geography': 'Geo',
    'history': 'Hist',
    'somali': 'Som',
    'arabic': 'Arab',
    'islamic': 'Isl',
    'islamic studies': 'Isl',
    'civics': 'Civ',
    'citizenship': 'Civ',
    'general science': 'G/Sci',
    'social studies': 'Soc',
    'afan oromo': 'A/Or',
    'amharic': 'Amh',
    'ict': 'ICT',
    'pe': 'PE',
    'art': 'Art'
  };
  const lower = n.toLowerCase();
  if (map[lower]) return map[lower];
  if (n.length <= 6) return n;
  return n.slice(0, 5) + '.';
};

const ETHIOPIAN_TERMS = [
  { termNumber: 1, name: 'Term 1', period: 'Meskerem - Hidar (Mid-Semester 1)' },
  { termNumber: 2, name: 'Term 2', period: 'Tahsas - Tir (End of Semester 1)' },
  { termNumber: 3, name: 'Term 3', period: 'Yakatit - Miazia (Mid-Semester 2)' },
  { termNumber: 4, name: 'Term 4', period: 'Ginbot - Sene (End of Semester 2)' }
];

const DEFAULT_TEMPLATES = [
  {
    template_key: 'absence_alert',
    template_text: 'Ku: {guardian_name}. Ardayga {student_name} ({class_name}) maanta ma uusan iman dugsiga taariikh: {date}. Haddii aysan fasax ahayn fadlan la xiriir maamulka. Mahadsanid, {school_name}.',
    is_active: true
  },
  {
    template_key: 'mark_report',
    template_text: 'Ku: {guardian_name}. Warbixinta buundooyinka {term_name} ee ardayga {student_name} ({class_name}): {marks_summary}. Mahadsanid, {school_name}.',
    is_active: true
  },
  {
    template_key: 'payment_reminder',
    template_text: 'Ku: Mudane/Marwo {guardian_name}, Waxaan si xushmad leh kuugu xasuusinaynaa in lacagta bisha {month_name} ee ardayga {student_name} ay dhiman tahay ({amount_due} Birr). Fadlan bixi lacagta ka hor inta aysan bilaaban bisha cusub si waxbarashada ardaygu u sii socoto si habsarri leh. Mahadsanid, {school_name}.',
    is_active: true
  },
  {
    template_key: 'payment_receipt',
    template_text: 'Ku: {guardian_name}. Waxaan xaqiijinaynaa in lacag dhan {amount_paid} Birr oo ah bisha/bilaaha {months_paid} ee ardayga {student_name} la helay. Mahadsanid, {school_name}.',
    is_active: true
  },
  {
    template_key: 'guardian_welcome',
    template_text: 'Ku soo dhawoow {school_name}. Koontadaada waalidka waa: Username: {guardian_username}, Password: {guardian_password}. Fadlan gal portal-ka si aad ula socoto ardaygaaga.',
    is_active: true
  },
  {
    template_key: 'student_welcome',
    template_text: 'Ku soo dhawoow {school_name}. Koontadaada ardaynimo waa: Username: {student_username}, Password: {student_password}. Fadlan gal portal-ka si aad u aragto casharrada iyo buundooyinka.',
    is_active: true
  },
  {
    template_key: 'staff_welcome',
    template_text: 'Ku soo dhawoow {Branch}. Koontadaada shaqaalenimo waa: Username: {staff_username}, Password: {staff_password}. Fadlan gal portal-ka.',
    is_active: true
  }
];

async function ensureMarkReportLogsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mark_report_logs (
        id SERIAL PRIMARY KEY,
        branch_code VARCHAR(20),
        term_number INTEGER NOT NULL,
        term_name VARCHAR(100),
        class_name VARCHAR(50) NOT NULL,
        student_name VARCHAR(150) NOT NULL,
        guardian_name VARCHAR(150),
        phone VARCHAR(50) NOT NULL,
        message TEXT,
        marks_summary TEXT,
        status VARCHAR(20) DEFAULT 'sent',
        error TEXT,
        sent_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE mark_report_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE mark_report_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE mark_report_logs ALTER COLUMN message DROP NOT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE mark_report_logs ALTER COLUMN marks_summary DROP NOT NULL`).catch(() => {});
  } catch (e) {
    console.warn('mark_report_logs table setup error:', e.message);
  }
}

// List classes_schema tables (G1, G2, ...) for this branch
async function getClassTables() {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name`
  );
  return result.rows.map(r => r.table_name);
}

// GET /api/sms/recipients?group=all|guardians|students|staff&class=G5&q=...
// Candidate recipients: guardians (from class tables), students (via guardian phone), staff.
router.get('/recipients', async (req, res) => {
  try {
    const { group = 'all', class: className = '', q = '' } = req.query;
    const seen = new Map();
    const push = (name, phone, type, cls) => {
      const p = normalizePhone(phone);
      if (!p || p.length < 9 || seen.has(p)) return;
      seen.set(p, true);
      entries.push({ name, phone: p, type, class: cls || '' });
    };

    const entries = [];
    const tables = await getClassTables();

    if (group === 'all' || group === 'guardians' || group === 'students') {
      for (const t of tables) {
        if (className && t !== className) continue;
        let rows = [];
        try {
          const colsResult = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = $1`,
            [t]
          );
          const cols = new Set(colsResult.rows.map(r => r.column_name));
          const colsToSelect = ['student_name', 'guardian_name', 'guardian_phone']
            .concat(cols.has('guardian_2nd_phone') ? ['guardian_2nd_phone'] : []);
          const r = await pool.query(
            `SELECT ${colsToSelect.map(c => `"${c}"`).join(', ')} FROM classes_schema."${t}"`
          );
          rows = r.rows;
        } catch (e) {
          console.error(`Error reading class table ${t}:`, e.message);
          continue;
        }
        for (const row of rows) {
          if (group === 'all' || group === 'guardians') {
            const gname = (row.guardian_name || '').trim();
            push(gname || `${(row.student_name || '').trim()} guardian`, row.guardian_phone, 'guardian', t);
            if (row.guardian_2nd_phone) push(`${gname || 'Guardian'} (2nd)`, row.guardian_2nd_phone, 'guardian', t);
          }
          if (group === 'all' || group === 'students') {
            push((row.student_name || '').trim(), row.guardian_phone, 'student', t);
          }
        }
      }
    }

    if (group === 'all' || group === 'staff') {
      try {
        const r = await pool.query(
          `SELECT first_name, middle_name, last_name, phone_number FROM public.staff WHERE phone_number IS NOT NULL AND phone_number != ''`
        );
        for (const row of r.rows) {
          const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').trim();
          push(name || 'Staff', row.phone_number, 'staff', '');
        }
      } catch (e) {
        console.error('Error fetching staff recipients:', e.message);
      }
    }

    const filtered = q
      ? entries.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || e.phone.includes(q.replace(/[^0-9+]/g, '')))
      : entries;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching SMS recipients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sms/send — send a custom message to the given recipients
router.post('/send', async (req, res) => {
  try {
    const { message, recipients } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients selected' });
    }

    const list = recipients.slice(0, 500);
    const text = String(message).trim();
    const segmentsPerSms = Math.max(1, Math.ceil(text.length / 159));

    const results = [];
    const queue = [...list];
    const CONCURRENCY = 5;

    async function worker() {
      while (queue.length > 0) {
        const r = queue.shift();
        const phone = normalizePhone(r.phone);
        if (!phone || phone.length < 9) {
          results.push({ ...r, success: false, error: 'Invalid phone number', provider: null });
          continue;
        }
        const result = await sendSMS(phone, text, null, {
          templateKey: 'manual_compose',
          recipientName: r.name || null
        });
        results.push({ ...r, success: result.success, error: result.error || null, provider: result.provider });
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, () => worker()));

    const sent = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: sent.length,
        failed: failed.length,
        credits: segmentsPerSms * results.length,
        segmentsPerSms,
        results
      }
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sms/templates — get all SMS templates for current branch
router.get('/templates', async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id SERIAL PRIMARY KEY,
        template_key VARCHAR(50) UNIQUE NOT NULL,
        template_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Ensure default templates exist
    for (const tmpl of DEFAULT_TEMPLATES) {
      await pool.query(
        `INSERT INTO sms_templates (template_key, template_text, is_active)
         VALUES ($1, $2, $3)
         ON CONFLICT (template_key) DO NOTHING`,
        [tmpl.template_key, tmpl.template_text, tmpl.is_active]
      ).catch(() => {});
    }

    const result = await pool.query(
      'SELECT id, template_key, template_text, is_active, updated_at FROM sms_templates ORDER BY template_key'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching SMS templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sms/templates/:key — update template text and/or is_active status
router.put('/templates/:key', async (req, res) => {
  try {
    const { template_text, is_active } = req.body || {};
    const { key } = req.params;

    if (template_text === undefined && is_active === undefined) {
      return res.status(400).json({ success: false, error: 'Either template_text or is_active is required' });
    }

    const existing = await pool.query('SELECT * FROM sms_templates WHERE template_key = $1', [key]);
    let result;

    if (existing.rows.length === 0) {
      // Find default fallback if available
      const def = DEFAULT_TEMPLATES.find(t => t.template_key === key);
      const textToUse = template_text !== undefined ? template_text : (def?.template_text || '');
      const activeToUse = is_active !== undefined ? Boolean(is_active) : (def?.is_active ?? true);

      result = await pool.query(
        `INSERT INTO sms_templates (template_key, template_text, is_active, updated_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, template_key, template_text, is_active, updated_at`,
        [key, textToUse, activeToUse]
      );
    } else {
      const row = existing.rows[0];
      const newText = template_text !== undefined ? template_text : row.template_text;
      const newActive = is_active !== undefined ? Boolean(is_active) : row.is_active;

      result = await pool.query(
        `UPDATE sms_templates
         SET template_text = $1, is_active = $2, updated_at = NOW()
         WHERE template_key = $3
         RETURNING id, template_key, template_text, is_active, updated_at`,
        [newText, newActive, key]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating SMS template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sms/templates/:key/toggle — toggle template active / inactive state
router.put('/templates/:key/toggle', async (req, res) => {
  try {
    const { key } = req.params;
    const { is_active } = req.body || {};

    const existing = await pool.query('SELECT * FROM sms_templates WHERE template_key = $1', [key]);
    let result;

    if (existing.rows.length === 0) {
      const def = DEFAULT_TEMPLATES.find(t => t.template_key === key);
      const targetActive = is_active !== undefined ? Boolean(is_active) : true;
      result = await pool.query(
        `INSERT INTO sms_templates (template_key, template_text, is_active, updated_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, template_key, template_text, is_active, updated_at`,
        [key, def?.template_text || '', targetActive]
      );
    } else {
      const targetActive = is_active !== undefined ? Boolean(is_active) : !existing.rows[0].is_active;
      result = await pool.query(
        `UPDATE sms_templates
         SET is_active = $1, updated_at = NOW()
         WHERE template_key = $2
         RETURNING id, template_key, template_text, is_active, updated_at`,
        [targetActive, key]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error toggling SMS template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sms/mark-report/terms — list 4 Ethiopian terms
router.get('/mark-report/terms', async (req, res) => {
  res.json({ success: true, data: ETHIOPIAN_TERMS });
});

// GET /api/sms/mark-report/classes — list all classes
router.get('/mark-report/classes', async (req, res) => {
  try {
    const classes = await getClassTables();
    res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error fetching mark report classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sms/mark-report/preview — preview aggregated student marks and rendered SMS messages
router.get('/mark-report/preview', async (req, res) => {
  try {
    await ensureMarkReportLogsTable();
    const termNumber = parseInt(req.query.termNumber, 10) || 1;
    const selectedClass = req.query.className || 'all';

    // Fetch active mark_report template
    let templateText = 'Ku: {guardian_name}. Warbixinta buundooyinka {term_name} ee ardayga {student_name} ({class_name}): {marks_summary}. Mahadsanid, {school_name}.';
    let isMarkReportActive = true;
    try {
      const tRes = await pool.query('SELECT template_text, is_active FROM sms_templates WHERE template_key = $1', ['mark_report']);
      if (tRes.rows.length > 0) {
        templateText = tRes.rows[0].template_text;
        isMarkReportActive = tRes.rows[0].is_active !== false;
      }
    } catch (_) {}

    const schoolName = process.env.SCHOOL_NAME || 'IQRA ACADEMY';
    const termObj = ETHIOPIAN_TERMS.find(t => t.termNumber === termNumber) || ETHIOPIAN_TERMS[0];

    const allClasses = await getClassTables();
    const targetClasses = (selectedClass === 'all' || !selectedClass)
      ? allClasses
      : allClasses.filter(c => c.toLowerCase() === selectedClass.toLowerCase());

    // Fetch sent history for deduplication
    const sentLogsRes = await pool.query(
      'SELECT class_name, student_name, phone FROM mark_report_logs WHERE term_number = $1 AND status = $2',
      [termNumber, 'sent']
    );
    const sentSet = new Set(sentLogsRes.rows.map(r => `${(r.class_name || '').toLowerCase()}:::${(r.student_name || '').trim().toLowerCase()}`));

    const studentCards = [];
    let totalStudents = 0;
    let totalWithPhone = 0;
    let totalWithMarks = 0;
    let alreadySentCount = 0;
    let totalEstimatedSegments = 0;

    for (const cls of targetClasses) {
      let studentRows = [];
      try {
        const colRes = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = $1`,
          [cls]
        );
        const cols = new Set(colRes.rows.map(r => r.column_name));
        const selCols = ['student_name', 'guardian_name', 'guardian_phone']
          .concat(cols.has('guardian_2nd_phone') ? ['guardian_2nd_phone'] : [])
          .concat(cols.has('is_active') ? ['is_active'] : []);
        const activeFilter = cols.has('is_active') ? 'WHERE is_active = TRUE OR is_active IS NULL' : '';
        const r = await pool.query(
          `SELECT ${selCols.map(c => `"${c}"`).join(', ')} FROM classes_schema."${cls}" ${activeFilter} ORDER BY student_name`
        );
        studentRows = r.rows;
      } catch (clsErr) {
        console.warn(`Error reading class table ${cls}:`, clsErr.message);
        continue;
      }

      // Get subjects for this class
      let subjects = [];
      try {
        const subRes = await pool.query(
          'SELECT DISTINCT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE LOWER(class_name) = LOWER($1)',
          [cls]
        );
        subjects = subRes.rows.map(r => r.subject_name);
        if (subjects.length === 0) {
          const allSubRes = await pool.query('SELECT subject_name FROM subjects_of_school_schema.subjects');
          subjects = allSubRes.rows.map(r => r.subject_name);
        }
      } catch (_) {}

      // Query marks for each subject in this class
      const marksByStudent = new Map();
      for (const sub of subjects) {
        const schemaName = getSubjectSchemaName(sub);
        const tableName = `${cls.toLowerCase()}_term_${termNumber}`;
        try {
          const mRes = await pool.query(`SELECT student_name, total FROM ${schemaName}.${tableName}`);
          const abbr = abbreviateSubject(sub);
          for (const m of mRes.rows) {
            if (m.total !== null && m.total !== undefined && m.total !== '') {
              const sKey = (m.student_name || '').trim().toLowerCase();
              if (!marksByStudent.has(sKey)) marksByStudent.set(sKey, []);
              marksByStudent.get(sKey).push({
                subject: sub,
                abbr,
                score: Math.round(Number(m.total))
              });
            }
          }
        } catch (_) {
          // Table doesn't exist yet or subject has no marks
        }
      }

      // Build cards
      for (const s of studentRows) {
        totalStudents++;
        const sName = (s.student_name || '').trim();
        const gName = (s.guardian_name || '').trim() || `${sName} Guardian`;
        const phone = normalizePhone(s.guardian_phone || s.guardian_2nd_phone);
        const hasPhone = Boolean(phone && phone.length >= 9 && !isDummyPhone(phone));
        if (hasPhone) totalWithPhone++;

        const sKey = sName.toLowerCase();
        const marksList = marksByStudent.get(sKey) || [];
        const hasMarks = marksList.length > 0;
        if (hasMarks) totalWithMarks++;

        let marksSummary = 'No marks entered yet';
        let totalSum = 0;
        if (hasMarks) {
          const parts = marksList.map(m => {
            totalSum += m.score;
            return `${m.abbr}: ${m.score}`;
          });
          marksSummary = `${parts.join(', ')} (Tot: ${totalSum})`;
        }

        const rendered = templateText
          .replace(/\{guardian_name\}/g, gName)
          .replace(/\{student_name\}/g, sName)
          .replace(/\{class_name\}/g, cls)
          .replace(/\{term_name\}/g, termObj.name)
          .replace(/\{marks_summary\}/g, marksSummary)
          .replace(/\{school_name\}/g, schoolName);

        const charCount = rendered.length;
        const segments = Math.max(1, Math.ceil(charCount / 159));
        const isAlreadySent = sentSet.has(`${cls.toLowerCase()}:::${sKey}`);
        if (isAlreadySent) alreadySentCount++;
        if (hasPhone) totalEstimatedSegments += segments;

        studentCards.push({
          studentName: sName,
          className: cls,
          guardianName: gName,
          guardianPhone: phone,
          rawPhone: s.guardian_phone,
          hasPhone,
          hasMarks,
          marksCount: marksList.length,
          marksSummary,
          renderedMessage: rendered,
          charCount,
          segments,
          alreadySent: isAlreadySent
        });
      }
    }

    res.json({
      success: true,
      data: {
        term: termObj,
        selectedClass,
        classes: allClasses,
        isTemplateActive: isMarkReportActive,
        stats: {
          totalStudents,
          totalWithPhone,
          totalWithMarks,
          alreadySentCount,
          totalEstimatedSegments
        },
        students: studentCards
      }
    });
  } catch (error) {
    console.error('Error generating mark report preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sms/mark-report/send — dispatch term mark reports with deduplication & switch enforcement
router.post('/mark-report/send', async (req, res) => {
  try {
    await ensureMarkReportLogsTable();
    const { termNumber = 1, students = [], force = false } = req.body || {};

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, error: 'No students selected for sending' });
    }

    // Verify mark_report is active
    let isMarkReportActive = true;
    try {
      const tRes = await pool.query('SELECT is_active FROM sms_templates WHERE template_key = $1', ['mark_report']);
      if (tRes.rows.length > 0) isMarkReportActive = tRes.rows[0].is_active !== false;
    } catch (_) {}

    if (!isMarkReportActive && !force) {
      return res.status(400).json({
        success: false,
        error: 'Term Mark Report SMS is currently inactive. Please turn ON the toggle switch in SMS Templates first.'
      });
    }

    const results = [];
    const queue = [...students];
    const CONCURRENCY = 4;

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        const phone = normalizePhone(item.guardianPhone);
        if (!phone || phone.length < 9 || isDummyPhone(phone)) {
          results.push({ ...item, success: false, error: 'Invalid or dummy guardian phone number' });
          continue;
        }

        const smsRes = await sendSMS(phone, item.renderedMessage, null, {
          templateKey: 'mark_report',
          recipientName: item.guardianName,
          studentName: item.studentName
        });

        if (smsRes.success && !smsRes.skipped) {
          try {
            await pool.query(
              `INSERT INTO mark_report_logs (term_number, class_name, student_name, guardian_name, phone, marks_summary, message, status, created_at, sent_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', NOW(), NOW())`,
              [termNumber, item.className, item.studentName, item.guardianName || null, phone, item.marksSummary || '', item.renderedMessage || '']
            );
          } catch (dbErr) {
            console.warn('mark_report_logs insert failed:', dbErr.message);
          }
        }

        results.push({
          studentName: item.studentName,
          className: item.className,
          guardianPhone: phone,
          success: smsRes.success,
          skipped: Boolean(smsRes.skipped),
          reason: smsRes.reason || null,
          error: smsRes.error || null,
          provider: smsRes.provider || null
        });
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, students.length) }, () => worker()));

    const sent = results.filter(r => r.success && !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: sent.length,
        skipped: skipped.length,
        failed: failed.length,
        results
      }
    });
  } catch (error) {
    console.error('Error sending mark reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sms/payment-reminders/status — get Ethiopian date & reminder window status
router.get('/payment-reminders/status', async (req, res) => {
  try {
    const reminderService = require('../services/PaymentReminderService');
    const status = reminderService.getPaymentReminderStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error fetching payment reminder status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sms/payment-reminders/run — manually trigger or test payment reminder sweep
router.post('/payment-reminders/run', async (req, res) => {
  try {
    const { force = true, targetMonth = null, targetYear = null } = req.body;
    const reminderService = require('../services/PaymentReminderService');
    const branchCode = pool.getBranchCode?.() || process.env.BRANCH_CODE || null;
    const result = await reminderService.runReminderSweep({ force, targetMonth, targetYear });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running payment reminder sweep:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/sms/counter — SMS totals grouped by template for the current branch
router.get('/counter', async (req, res) => {
  try {
    // Automatically transition abandoned or timed out jobs (>30m) to failed
    try {
      await cleanupStaleJobs();
    } catch (e) {
      console.warn('[SMS Counter] cleanupStaleJobs failed:', e.message);
    }

    const totals = await pool.query(
      `SELECT
         COUNT(*) AS total_sends,
         COALESCE(SUM(segments), 0)::int AS total_segments,
         COUNT(*) FILTER (WHERE status = 'sent') AS sent,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today_sends,
         COALESCE(SUM(segments) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::int AS today_segments
       FROM sms_logs`
    );
    const byTemplate = await pool.query(
      `SELECT template_key,
              COUNT(*) AS sends,
              COALESCE(SUM(segments), 0)::int AS segments,
              COUNT(*) FILTER (WHERE status = 'sent') AS sent,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed,
              COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM sms_logs
       GROUP BY template_key
       ORDER BY sends DESC`
    );
    res.json({
      success: true,
      data: {
        totals: totals.rows[0],
        byTemplate: byTemplate.rows
      }
    });
  } catch (error) {
    console.error('Error fetching SMS counter:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sms/logs — recent SMS sends with optional filters
router.get('/logs', async (req, res) => {
  try {
    const { template, status, limit = 50, offset = 0 } = req.query;
    const where = [];
    const params = [];
    if (template) {
      params.push(template);
      where.push(`template_key = $${params.length}`);
    }
    if (status === 'sent' || status === 'failed' || status === 'pending') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    params.push(lim);
    params.push(off);
    const result = await pool.query(
      `SELECT id, template_key, recipient_name, phone, message, status, provider, error, segments, created_at
       FROM sms_logs ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sms/resend/:id — resend a specific failed SMS
router.post('/resend/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const logRes = await pool.query('SELECT * FROM sms_logs WHERE id = $1', [id]);
    if (logRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SMS log not found' });
    }
    const log = logRes.rows[0];
    if (!log.message || !log.phone) {
      return res.status(400).json({ success: false, error: 'Missing phone or message in log record' });
    }

    const result = await sendSMS(log.phone, log.message, null, {
      templateKey: log.template_key || 'manual_compose',
      recipientName: log.recipient_name || null,
      skipLog: true
    });

    if (result.success) {
      await pool.query(
        "UPDATE sms_logs SET status = 'pending', error = NULL, created_at = NOW() WHERE id = $1",
        [id]
      );
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error resending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sms/resend-all-failed — resend all failed SMS for current branch
router.post('/resend-all-failed', async (req, res) => {
  try {
    const failedLogs = await pool.query(
      "SELECT id, phone, message, template_key, recipient_name FROM sms_logs WHERE status = 'failed' AND phone IS NOT NULL AND message IS NOT NULL ORDER BY id DESC LIMIT 100"
    );

    let resentCount = 0;
    for (const log of failedLogs.rows) {
      const result = await sendSMS(log.phone, log.message, null, {
        templateKey: log.template_key || 'manual_compose',
        recipientName: log.recipient_name || null,
        skipLog: true
      });
      if (result.success) {
        await pool.query(
          "UPDATE sms_logs SET status = 'pending', error = NULL, created_at = NOW() WHERE id = $1",
          [log.id]
        );
        resentCount++;
      }
    }

    res.json({ success: true, count: resentCount, total: failedLogs.rows.length });
  } catch (error) {
    console.error('Error resending all failed SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// SMS Schedule Settings (Send Times & Automated Schedules)
// -------------------------------------------------------------
async function ensureScheduleSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.sms_schedule_settings (
        id SERIAL PRIMARY KEY,
        schedule_key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        send_time VARCHAR(10) DEFAULT '09:00',
        auto_send_enabled BOOLEAN DEFAULT TRUE,
        window_start_day INTEGER DEFAULT 26,
        window_end_day INTEGER DEFAULT 30,
        term_1_date VARCHAR(60) DEFAULT 'Hidar 20 (Mid-Semester 1)',
        term_2_date VARCHAR(60) DEFAULT 'Tir 25 (End of Semester 1)',
        term_3_date VARCHAR(60) DEFAULT 'Miazia 20 (Mid-Semester 2)',
        term_4_date VARCHAR(60) DEFAULT 'Sene 25 (End of Semester 2)',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default schedules if not already present
    const defaultSchedules = [
      {
        schedule_key: 'payment_reminder',
        title: 'Monthly Fee Payment Reminder SMS',
        category: 'Finance',
        send_time: '09:30',
        auto_send_enabled: true,
        window_start_day: 26,
        window_end_day: 26,
        notes: 'Dispatches ONE reminder on Day 26 of every Ethiopian month to guardians of students with unpaid fees.'
      },
      {
        schedule_key: 'mark_report',
        title: 'Term Mark Report SMS (4x / Academic Year)',
        category: 'Academic',
        send_time: '10:00',
        auto_send_enabled: true,
        term_1_date: 'Hidar 20 (Mid-Semester 1)',
        term_2_date: 'Tir 25 (End of Semester 1)',
        term_3_date: 'Miazia 20 (Mid-Semester 2)',
        term_4_date: 'Sene 25 (End of Semester 2)',
        notes: 'Dispatches aggregated subject mark summaries 4 times per year to parents.'
      },
      {
        schedule_key: 'absence_alert',
        title: 'Daily Student Absence Alert SMS',
        category: 'Attendance',
        send_time: 'Instant',
        auto_send_enabled: true,
        notes: 'Instant dispatch: Sends immediately to guardian whenever a student is marked absent (no delayed calendar schedule).'
      }
    ];

    for (const s of defaultSchedules) {
      await pool.query(
        `INSERT INTO public.sms_schedule_settings 
          (schedule_key, title, category, send_time, auto_send_enabled, window_start_day, window_end_day, term_1_date, term_2_date, term_3_date, term_4_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (schedule_key) DO NOTHING`,
        [
          s.schedule_key,
          s.title,
          s.category,
          s.send_time,
          s.auto_send_enabled,
          s.window_start_day || 26,
          s.window_end_day || 30,
          s.term_1_date || null,
          s.term_2_date || null,
          s.term_3_date || null,
          s.term_4_date || null,
          s.notes || null
        ]
      );
    }
  } catch (err) {
    console.warn('sms_schedule_settings setup warning:', err.message);
  }
}

// GET /api/sms/schedules — list all SMS schedule settings
router.get('/schedules', async (req, res) => {
  try {
    await ensureScheduleSettingsTable();
    const result = await pool.query(
      `SELECT * FROM public.sms_schedule_settings ORDER BY id ASC`
    );

    // Compute live Ethiopian calendar status
    let ethInfo = null;
    try {
      const ethiopianCalendar = require('../utils/ethiopianCalendar');
      const eth = ethiopianCalendar.toEthiopian(new Date());
      const ETH_MONTH_NAMES = [
        'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
        'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
      ];
      ethInfo = {
        year: eth.year,
        month: eth.month,
        day: eth.day,
        monthName: ETH_MONTH_NAMES[eth.month - 1] || `Month ${eth.month}`,
        isPaymentDay: eth.day === 26,
        daysUntilPaymentReminder: eth.day <= 26 ? 26 - eth.day : (30 - eth.day + 26)
      };
    } catch (_) {}

    res.json({
      success: true,
      schedules: result.rows,
      ethCalendar: ethInfo
    });
  } catch (error) {
    console.error('Error fetching SMS schedules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sms/schedules/:key — update send time, window days, or term dates
router.put('/schedules/:key', async (req, res) => {
  try {
    await ensureScheduleSettingsTable();
    const { key } = req.params;
    const body = req.body || {};

    const {
      send_time,
      auto_send_enabled,
      window_start_day,
      window_end_day,
      term_1_date,
      term_2_date,
      term_3_date,
      term_4_date,
      notes
    } = body;

    const existing = await pool.query(
      `SELECT * FROM public.sms_schedule_settings WHERE schedule_key = $1`,
      [key]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Schedule '${key}' not found` });
    }

    const cur = existing.rows[0];

    const updated = await pool.query(
      `UPDATE public.sms_schedule_settings
       SET send_time = COALESCE($1, send_time),
           auto_send_enabled = CASE WHEN $2::boolean IS NOT NULL THEN $2::boolean ELSE auto_send_enabled END,
           window_start_day = COALESCE($3, window_start_day),
           window_end_day = COALESCE($4, window_end_day),
           term_1_date = COALESCE($5, term_1_date),
           term_2_date = COALESCE($6, term_2_date),
           term_3_date = COALESCE($7, term_3_date),
           term_4_date = COALESCE($8, term_4_date),
           notes = COALESCE($9, notes),
           updated_at = NOW()
       WHERE schedule_key = $10
       RETURNING *`,
      [
        send_time !== undefined ? send_time : null,
        typeof auto_send_enabled === 'boolean' ? auto_send_enabled : null,
        window_start_day !== undefined ? parseInt(window_start_day, 10) : null,
        window_end_day !== undefined ? parseInt(window_end_day, 10) : null,
        term_1_date !== undefined ? term_1_date : null,
        term_2_date !== undefined ? term_2_date : null,
        term_3_date !== undefined ? term_3_date : null,
        term_4_date !== undefined ? term_4_date : null,
        notes !== undefined ? notes : null,
        key
      ]
    );

    res.json({
      success: true,
      message: `Schedule '${key}' updated successfully`,
      schedule: updated.rows[0]
    });
  } catch (error) {
    console.error('Error updating SMS schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: get rendered template for a branch
async function getRenderedTemplate(templateKey, variables) {
  try {
    const result = await pool.query(
      'SELECT template_text FROM sms_templates WHERE template_key = $1 AND is_active = true',
      [templateKey]
    );
    if (result.rows.length === 0) return null;
    let text = result.rows[0].template_text;
    for (const [key, val] of Object.entries(variables)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), val || '');
    }
    return text;
  } catch (e) {
    console.error('Error rendering SMS template:', e.message);
    return null;
  }
}

module.exports = router;
module.exports.getRenderedTemplate = getRenderedTemplate;
