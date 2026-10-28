/**
 * Multi-language translation templates for push notifications.
 * Supported languages:
 * - 'so': Somali
 * - 'am': Amharic
 * - 'ar': Arabic
 * - 'en': English (default)
 */

const translations = {
  // ---- DISCIPLINE ----
  discipline_title: {
    en: 'Discipline Notice',
    so: 'Ogeysiis Anshax',
    am: 'የስነ-ምግባር ማስታወቂያ',
    ar: 'إشعار سلوكي',
  },
  discipline_body: {
    en: (student, type, level, desc) =>
      `${student} received a discipline record (${type} - ${level}): ${desc}`,
    so: (student, type, level, desc) =>
      `${student} waxa loo qoray diiwaanka anshaxa (${type} - ${level}): ${desc}`,
    am: (student, type, level, desc) =>
      `${student} የስነ-ምግባር መዝገብ ተመዝግቧል (${type} - ${level})፡ ${desc}`,
    ar: (student, type, level, desc) =>
      `حصل ${student} على مخالفة سلوكية (${type} - ${level}): ${desc}`,
  },

  // ---- ATTENDANCE: ABSENT ----
  attendance_absent_title: {
    en: 'Attendance Alert: Absent',
    so: 'Digniin Maqnaansho',
    am: 'የቀሪ ማስታወቂያ',
    ar: 'تنبيه غياب',
  },
  attendance_absent_body: {
    en: (student, date) =>
      `Attention: ${student} was marked ABSENT on ${date}.`,
    so: (student, date) =>
      `Fadlan ogow: ${student} maanta wuu MAQNAA (${date}).`,
    am: (student, date) =>
      `ማሳሰቢያ፡ ${student} በ ${date} አልተገኘም/ችም።`,
    ar: (student, date) =>
      `تنبيه: تم تسجيل ${student} غائباً بتاريخ ${date}.`,
  },

  // ---- ATTENDANCE: LATE ----
  attendance_late_title: {
    en: 'Attendance Alert: Late',
    so: 'Digniin Soo Daahid',
    am: 'የዘገየ ማስታወቂያ',
    ar: 'تنبيه تأخير',
  },
  late_scan_title: {
    en: 'Attendance Alert: Late',
    so: 'Digniin Soo Daahid',
    am: 'የዘገየ ማስታወቂያ',
    ar: 'تنبيه تأخير',
  },
  absent_scan_title: {
    en: 'Attendance Alert: Absent',
    so: 'Digniin Maqnaansho',
    am: 'የቀሪ ማስታወቂያ',
    ar: 'تنبيه غياب',
  },
  attendance_late_body: {
    en: (student, date) =>
      `Notice: ${student} arrived LATE on ${date}.`,
    so: (student, date) =>
      `Fadlan ogow: ${student} wuu SOO DAAHAY (${date}).`,
    am: (student, date) =>
      `ማሳሰቢያ፡ ${student} በ ${date} ዘግይቶ/ታ ደርሷል።`,
    ar: (student, date) =>
      `تنبيه: تم تسجيل ${student} متأخراً بتاريخ ${date}.`,
  },
  scan_body: {
    en: (student, status, time, date) =>
      `Notice: ${student} was marked ${status} at ${time} (${date}).`,
    so: (student, status, time, date) =>
      String(status).toUpperCase() === 'ABSENT'
        ? `Fadlan ogow: ${student} maanta wuu MAQNAA (${date}).`
        : `Fadlan ogow: ${student} wuu SOO DAAHAY (${time || date}).`,
    am: (student, status, time, date) =>
      `ማሳሰቢያ፡ ${student} በ ${time || date} ${status} ተመዝግቧል።`,
    ar: (student, status, time, date) =>
      `تنبيه: تم تسجيل ${student} (${status}) في الوقت ${time || date}.`,
  },

  // ---- ATTENDANCE: PRESENT / CHECK-IN ----
  attendance_present_title: {
    en: 'Student Attendance: Present',
    so: 'Imaanshaha Ardayga: Wuu Joogaa',
    am: 'የተማሪ መገኘት፡ ተገኝቷል',
    ar: 'حضور الطالب: حاضر',
  },
  attendance_present_body: {
    en: (student, dateOrTime) =>
      `${student} attendance was recorded as PRESENT on ${dateOrTime}.`,
    so: (student, dateOrTime) =>
      `${student} imaanshihiisa waxaa loo diiwaangeliyay JOOGO (${dateOrTime}).`,
    am: (student, dateOrTime) =>
      `${student} በ ${dateOrTime} መገኘቱ ተመዝግቧል።`,
    ar: (student, dateOrTime) =>
      `تم تسجيل حضور ${student} بنجاح بتاريخ/وقت ${dateOrTime}.`,
  },

  // ---- ATTENDANCE: LEAVE / GENERIC ----
  attendance_leave_title: {
    en: 'Attendance: Leave',
    so: 'Imaanshaha: Fasax',
    am: 'የተማሪ መገኘት፡ ዕረፍት',
    ar: 'حضور الطالب: إجازة',
  },
  attendance_leave_body: {
    en: (student, date) => student + ' was marked on LEAVE (' + date + ').',
    so: (student, date) => student + ' waxaa loo diiwaangeliyay FASAX (' + date + ').',
    am: (student, date) => student + ' በ ' + date + ' ዕረፍት ላይ ተመዝግቧል።',
    ar: (student, date) => 'تم تسجيل ' + student + ' في إجازة بتاريخ ' + date + '.',
  },
  attendance_update_title: {
    en: 'Attendance Update',
    so: 'Cusboonaysiin Imaansho',
    am: 'የመገኘት ማሻሻያ',
    ar: 'تحديث الحضور',
  },
  attendance_update_body: {
    en: (student, status, date) => student + ' was marked ' + status + ' (' + date + ').',
    so: (student, status, date) => student + ' waxaa loo diiwaangeliyay ' + status + ' (' + date + ').',
    am: (student, status, date) => student + ' በ ' + date + ' ' + status + ' ተመዝግቧል።',
    ar: (student, status, date) => 'تم تسجيل ' + student + ' ' + status + ' بتاريخ ' + date + '.',
  },

  // ---- MARKS / EXAM RESULTS ----
  marks_title: {
    en: 'Exam Marks Published',
    so: 'Natiijooyinka Imtixaanka',
    am: 'የፈተና ውጤት ተለቋል',
    ar: 'تم نشر نتائج الاختبار',
  },
  marks_body: {
    en: (student, subject, term, score, status) =>
      `${student}'s score for ${subject} (Term ${term}) is ${score}% (${status}).`,
    so: (student, subject, term, score, status) =>
      `Dhibcaha ${student} ee maaddada ${subject} (Term ${term}) waa ${score}% (${status}).`,
    am: (student, subject, term, score, status) =>
      `የ ${student} የ ${subject} (Term ${term}) ውጤት ${score}% (${status}) ነው።`,
    ar: (student, subject, term, score, status) =>
      `درجة الطالب ${student} في مادة ${subject} (الفصل ${term}) هي ${score}% (${status}).`,
  },
  marks_bulk_body: {
    en: (student, subject, term) =>
      `New marks published for ${student} in ${subject} (Term ${term}).`,
    so: (student, subject, term) =>
      `Waxaa la daabacay natiijooyinka cusub ee ${student} ee maaddada ${subject} (Term ${term}).`,
    am: (student, subject, term) =>
      `ለ ${student} በ ${subject} (Term ${term}) አዲስ ውጤት ተለቋል።`,
    ar: (student, subject, term) =>
      `تم نشر درجات جديدة للطالب ${student} في مادة ${subject} (الفصل ${term}).`,
  },

  // ---- PAYMENTS ----
  payment_title: {
    en: 'Payment Received',
    so: 'Lacag-bixinta waa la xaqiijiyay',
    am: 'ክፍያ ተረጋግጧል',
    ar: 'تم تأكيد استلام الدفعة',
  },
  payment_body: {
    en: (student, amount, receipt) =>
      `Payment of ETB ${amount} confirmed for ${student}. Receipt: ${receipt}`,
    so: (student, amount, receipt) =>
      `Waxaa la xaqiijiyay lacag-bixinta ETB ${amount} ee ${student}. Rasiidka: ${receipt}`,
    am: (student, amount, receipt) =>
      `የ ETB ${amount} ክፍያ ለ ${student} ተረጋግጧል። ደረሰኝ፡ ${receipt}`,
    ar: (student, amount, receipt) =>
      `تم تأكيد دفع مبلغ ${amount} بر إثيوبي للطالب ${student}. إيصال: ${receipt}`,
  },

  // ---- MESSAGES / CHAT ----
  chat_title: {
    en: (sender) => `New Message from ${sender}`,
    so: (sender) => `Farriin Cusub oo ka timid ${sender}`,
    am: (sender) => `አዲስ መልእክት ከ ${sender}`,
    ar: (sender) => `رسالة جديدة من ${sender}`,
  },
  chat_attachment_body: {
    en: 'Sent an attachment',
    so: 'Fayl / Sawir ayaa loo soo diray',
    am: 'አባሪ ተልኳል',
    ar: 'تم إرسال مرفق',
  },

  // ---- EVALUATION BOOK ----
  evaluation_title: {
    en: 'Daily Evaluation Published',
    so: 'Qiimaynta Maalinlaha ah',
    am: 'ዕለታዊ ግምገማ ተለቋል',
    ar: 'تم نشر التقييم اليومي',
  },
  evaluation_body: {
    en: (student, className) =>
      `Daily evaluation record for ${student} (${className}) has been published.`,
    so: (student, className) =>
      `Diiwaanka qiimaynta maalinlaha ah ee ${student} (${className}) ayaa la daabacay.`,
    am: (student, className) =>
      `የ ${student} (${className}) ዕለታዊ ግምገማ መዝገብ ተለቋል።`,
    ar: (student, className) =>
      `تم نشر سجل التقييم اليومي للطالب ${student} (${className}).`,
  },
};

/**
 * Get translated text for given language and key.
 * Falls back to English if language is not supported.
 */
function t(lang, key) {
  const normLang = (lang || 'en').toLowerCase().trim();
  const entry = translations[key];
  if (!entry) return null;
  return entry[normLang] || entry['en'] || null;
}

module.exports = { translations, t };
