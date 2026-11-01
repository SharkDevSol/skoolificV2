const SMSService = require('./SMSService');

const DEFAULT_ABSENCE_TEMPLATE =
  'Ku: {guardian_name}. Ardayga {student_name} ({class_name}) maanta ma uusan iman dugsiga taariikh: {date}. Haddii aysan fasax ahayn fadlan la xiriir maamulka. Mahadsanid, {school_name}.';

/**
 * Send Absence Alert SMS to guardian
 * @param {Object} db - Database client or pool
 * @param {Object} params
 * @param {string} params.className - Class table name (e.g. 'G7')
 * @param {string|number} params.studentId - Student school ID
 * @param {string} [params.studentName] - Student name
 * @param {string} [params.ethDateStr] - Ethiopian date string (YYYY-MM-DD)
 * @param {string} [params.schoolName] - School name (defaults to env or IQRA ACADEMY)
 * @returns {Promise<Object>}
 */
async function sendAbsenceAlertSms(db, { className, studentId, studentName, ethDateStr, schoolName }) {
  try {
    if (!db || !className || !studentId) {
      return { success: false, reason: 'Missing required parameters' };
    }

    // 1. Check if absence_alert is active in toggle switch
    const isActive = await SMSService.isTemplateActive('absence_alert');
    if (!isActive) {
      console.log(`[Absence SMS] 'absence_alert' template is INACTIVE. Skipping SMS for student ${studentId}.`);
      return { success: true, skipped: true, reason: 'Template inactive' };
    }

    // 2. Query guardian details from class roster
    const studentQuery = `
      SELECT student_name, guardian_name, guardian_phone, guardian_2nd_phone
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
    const phone = row.guardian_phone || row.guardian_2nd_phone;

    if (!phone) {
      console.warn(`[Absence SMS] No phone number on file for guardian of ${finalStudentName} (ID: ${studentId})`);
      return { success: false, reason: 'Guardian has no phone number on file' };
    }

    // 3. Prevent duplicate absence SMS on the same day for this phone & student
    const dateToday = ethDateStr || new Date().toISOString().split('T')[0];
    try {
      const dupCheck = await db.query(
        `SELECT id FROM sms_logs 
         WHERE template_key = 'absence_alert' 
           AND phone = $1 
           AND created_at >= CURRENT_DATE 
           AND message LIKE $2 
         LIMIT 1`,
        [phone, `%${finalStudentName}%`]
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
      className
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

module.exports = {
  sendAbsenceAlertSms,
  DEFAULT_ABSENCE_TEMPLATE
};
