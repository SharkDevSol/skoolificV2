import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import {
  FiHome, FiUsers, FiCheckCircle, FiClipboard, FiAlertTriangle, FiDollarSign, FiSettings,
  FiLogOut, FiChevronDown, FiCheck, FiMoon, FiGlobe, FiKey, FiUser, FiMessageSquare,
  FiDownload, FiFileText
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './SuperAdmin.module.css';
import SmsCounter from '../SmsCounter/SmsCounter';

const ETH_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const I18N = {
  en: {
    appName: 'Super Admin', loginSub: 'All branch reports in one place',
    signIn: 'Sign In', signingIn: 'Signing in...', username: 'Username', password: 'Password',
    logout: 'Logout', allBranches: 'All Branches', loading: 'Loading reports...', loginFailed: 'Login failed',
    home: 'Home', students: 'Students', attendance: 'Attendance', marks: 'Marks', faults: 'Faults', finance: 'Finance', sms: 'SMS', settings: 'Settings',
    totalStudents: 'Total Students', boys: 'boys', girls: 'girls', across: 'across', branchesWord: 'branches',
    newStudents: 'New', oldStudents: 'Old', addedByDate: 'Students Added by Date', addedByDateTitle: 'Pick a date to see who was added',
    from: 'From', to: 'To', studentsAdded: 'Students Added', noStudentsAdded: 'No students added in this period', student: 'Student', typeWord: 'Type', branch: 'Branch',
    addedToday: 'Added Today', collectedToday: 'Collected Today',
    attendanceRate: 'Attendance Rate', collected: 'Collected', pendingFees: 'Unpaid (Due)', faultsCount: 'Faults',
    freeStudents: 'Free Students', freeRegPaid: 'Free Reg. Paid',
    byClass: 'By Class', byBranch: 'By Branch', allBranchesNote: 'all branches',
    class: 'Class', total: 'Total', records: 'records', present: 'Present', late: 'Late', absent: 'Absent', rate: 'Rate',
    exams: 'Exams', average: 'Average', marksCount: 'Marks',
    expected: 'Expected', pending: 'Pending', studentsCount: 'Students',
    filter: 'Filter', year: 'Year', month: 'Month', allMonths: 'All months', term: 'Term', allTerms: 'All terms', academicYear: 'Academic Year',
    filterEthDate: 'Filter by Date (Ethiopian calendar)', filterEthMonth: 'Filter by Month (Ethiopian calendar)',
    unlockedNote: 'Pending = unlocked months only (months already due, not yet fully paid)',
    noBranchData: 'No branch data available', noClasses: 'No classes found', noAttendance: 'No attendance records',
    noExamData: 'No exam data yet', noFaults: 'No faults recorded', noInvoices: 'No invoices found',
    studentsTitle: 'Students by Branch & Class',
    account: 'Account', changeUsername: 'Change Username', changePassword: 'Change Password',
    currentPassword: 'Current password', newUsername: 'New username', newPassword: 'New password',
    confirmPassword: 'Confirm new password', save: 'Save Changes', saving: 'Saving...',
    accountUpdated: 'Account updated successfully!', passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'New password must be at least 4 characters', wrongPassword: 'Current password is incorrect',
    preferences: 'Preferences', language: 'Language', darkMode: 'Dark Mode', darkModeDesc: 'Switch to dark colors',
    languageDesc: 'Choose the app language', english: 'English', somali: 'Somali', amharic: 'Amharic', arabic: 'Arabic',
    perBranchDetail: 'Each branch shows its own classes and totals', ofExpected: 'of expected', collectedWord: 'collected',
    downloadPdfReport: 'Download Official PDF Report', generatingPdf: 'Generating PDF Report...',
    liveAudit: 'Live Real-Time Finance Audit', standardFeeSchedule: 'Standard Approved Fee Schedule',
    advancePaymentsTitle: 'Advance Prepayments (Locked Months)', paying: 'Paying', unassigned: 'Unassigned',
    unlockedDue: 'Unlocked Due', monthlyFee: 'Monthly Fee', regFee: 'Reg Fee', m1Paid: 'M1 Paid', m2Paid: 'M2 Paid',
    unpaidDue: 'Unpaid Due', monthPerformance: 'Month-by-Month Expected vs Collected',
    unassignedTitle: 'Unassigned Students (Classification Required)',
    unassignedDesc: 'Students with unassigned Old/New status in the system database. Setting Old or New status in their profile resolves fee calculation.',
    unpaidDirectoryTitle: 'Unpaid Students Directory',
    unpaidDesc: 'Students with outstanding unpaid invoices in unlocked months (Meskerem & Tikimt).'
  },
  so: {
    appName: 'Super Admin', loginSub: 'Warbixinaha dhammaan laamaha hal meel',
    signIn: 'Soo Gal', signingIn: 'Soo gelaya...', username: 'Magaca Isticmaalaha', password: 'Furaha',
    logout: 'Ka Bax', allBranches: 'Dhammaan Laamaha', loading: 'Warbixino la shubayo...', loginFailed: 'Soo geliddu way fashilantay',
    home: 'Guriga', students: 'Ardayda', attendance: 'Imaanshaha', marks: 'Dhibcaha', faults: 'Khaladaadka', finance: 'Maaliyadda', sms: 'SMS', settings: 'Dejinta',
    totalStudents: 'Wadarta Ardayda', boys: 'wiilal', girls: 'gabdho', across: 'ku kala', branchesWord: 'laamood',
    newStudents: 'Cusub', oldStudents: 'Hore', addedByDate: 'Arday lagu daray Taariikh', addedByDateTitle: 'Dooro taariikh si aad u aragto cidda lagu daray',
    from: 'Laga', to: 'Ilaa', studentsAdded: 'Arday la daray', noStudentsAdded: 'Ma jiraan arday lagu daray muddadan', student: 'Arday', typeWord: 'Nooca', branch: 'Laan',
    addedToday: 'Maanta La Daray', collectedToday: 'Maanta La Ururiyay',
    attendanceRate: 'Heerka Imaanshaha', collected: 'La Ururiyay', pendingFees: 'Lacag La Sugayo', faultsCount: 'Khaladaadka',
    freeStudents: 'Arday bilaash ah', freeRegPaid: 'Reg lacag la bixiyay',
    byClass: 'Fasal ahaan', byBranch: 'Laan ahaan', allBranchesNote: 'dhammaan laamaha',
    class: 'Fasal', total: 'Wadar', records: 'diiwaanno', present: 'Joogay', late: 'Soo Daahay', absent: 'Maqan', rate: 'Heerka',
    exams: 'Imtixaanno', average: 'Celcelis', marksCount: 'Dhibco',
    expected: 'La Filayo', pending: 'La Sugayo', studentsCount: 'Arday',
    filter: 'Shaandheyn', year: 'Sannad', month: 'Bil', allMonths: 'Dhammaan Bilaha', term: 'Xilli', allTerms: 'Dhammaan Xilliyada', academicYear: 'Sannad Dugsiyeed',
    filterEthDate: 'Ku shaandhee Taariikh (Kalandarka Itoobiya)', filterEthMonth: 'Ku shaandhee Bil (Kalandarka Itoobiya)',
    unlockedNote: 'Lacagta la sugayo = bilaha furay oo keliya (bilaha waajibka ah, aan weli si buuxda loo bixin)',
    noBranchData: 'Xog laan ma jirto', noClasses: 'Fasallo lama helin', noAttendance: 'Diiwaanno imaansho ma jiraan',
    noExamData: 'Xog imtixaan ma jirto', noFaults: 'Khaladaad lama diiwaan gelin', noInvoices: 'Qaansheegyada ma jiraan',
    studentsTitle: 'Ardayda — Laan & Fasal',
    account: 'Akoonka', changeUsername: 'Beddel Magaca Isticmaalaha', changePassword: 'Beddel Furaha',
    currentPassword: 'Furaha hadda', newUsername: 'Magac cusub', newPassword: 'Fure cusub',
    confirmPassword: 'Xaqiiji furaha cusub', save: 'Keydi', saving: 'Keydinaya...',
    accountUpdated: 'Akoonka si guul leh ayaa loo beddelay!', passwordMismatch: 'Furaha isma laha',
    passwordTooShort: 'Furaha cusub waa inuu ka yaraan 4 xaraf', wrongPassword: 'Furaha hadda waa khalad',
    preferences: 'Doorshooyinka', language: 'Luqadda', darkMode: 'Habka Madow', darkModeDesc: 'U beddel midabbada madow',
    languageDesc: 'Dooro luqadda app-ka', english: 'Ingiriis', somali: 'Soomaali', amharic: 'Amxaari', arabic: 'Carabi',
    perBranchDetail: 'Laan kastaa waxay muujisaa fasalladeeda iyo wadarta', ofExpected: 'laga filayay', collectedWord: 'la ururiyay',
    downloadPdfReport: 'Soo Dejiso Warbixinta PDF', generatingPdf: 'PDF ayaa la diyaarinayaa...',
    liveAudit: 'Hanti-dhawrka Maaliyadeed ee Tooska ah', standardFeeSchedule: 'Jadwalka Kharashka Dugsiga',
    advancePaymentsTitle: 'Lacagaha Hore Loo Bixiyay (Bilaha Xiran)', paying: 'Lacag-bixiye', unassigned: 'Aan La Qeexin',
    unlockedDue: 'Waajibka Bisha Furan', monthlyFee: 'Kharashka Bisha', regFee: 'Kharashka Diiwaangelinta',
    m1Paid: 'Bisha 1 La Bixiyay', m2Paid: 'Bisha 2 La Bixiyay', unpaidDue: 'Aan La Bixin (Waajib)',
    monthPerformance: 'Lacagta La Filayo vs La Ururiyay Bil Kasta',
    unassignedTitle: 'Ardayda Aan La Qeexin (U Baahan Hore/Cusub)',
    unassignedDesc: 'Ardaydan laguma qeexin xogta dugsiga inay Hore yihiin ama Cusub yihiin.',
    unpaidDirectoryTitle: 'Liiska Ardayda Aan Bixin Lacagta',
    unpaidDesc: 'Ardayda aan weli bixin lacagta bilaha furan (Meskerem & Tikimt).'
  },
  am: {
    appName: 'ሱፐር አድሚን', loginSub: 'የሁሉም ቅርንጫፎች ሪፖርቶች በአንድ ቦታ',
    signIn: 'ግባ', signingIn: 'እየገባ...', username: 'የተጠቃሚ ስም', password: 'የይለፍ ቃል',
    logout: 'ውጣ', allBranches: 'ሁሉም ቅርንጫፎች', loading: 'ሪፖርቶች እየጫኑ...', loginFailed: 'መግባት አልተሳካም',
    home: 'መነሻ', students: 'ተማሪዎች', attendance: 'መገኘት', marks: 'ውጤቶች', faults: 'ጥፋቶች', finance: 'ፋይናንስ', sms: 'SMS', settings: 'ቅንብሮች',
    totalStudents: 'ጠቅላላ ተማሪዎች', boys: 'ወንዶች', girls: 'ሴቶች', across: 'በ', branchesWord: 'ቅርንጫፎች',
    newStudents: 'አዲስ', oldStudents: 'ቀድሞ', addedByDate: 'በቀን የተጨመሩ ተማሪዎች', addedByDateTitle: 'ማን እንደተጨመረ ለማየት ቀን ምረጥ',
    from: 'ከ', to: 'እስከ', studentsAdded: 'የተጨመሩ ተማሪዎች', noStudentsAdded: 'በዚህ ጊዜ የተጨመሩ ተማሪዎች የሉም', student: 'ተማሪ', typeWord: 'ዓይነት', branch: 'ቅርንጫፍ',
    addedToday: 'ዛሬ የተጨመሩ', collectedToday: 'ዛሬ የተሰበሰበ',
    attendanceRate: 'የመገኘት መጠን', collected: 'የተሰበሰበ', pendingFees: 'ያልተከፈለ', faultsCount: 'ጥፋቶች',
    freeStudents: 'ነጻ ተማሪዎች', freeRegPaid: 'ነጻ ምዝገባ የተከፈለ',
    byClass: 'በክፍል', byBranch: 'በቅርንጫፍ', allBranchesNote: 'ሁሉም ቅርንጫፎች',
    class: 'ክፍል', total: 'ጠቅላላ', records: 'መዝገቦች', present: 'ተገኝቷል', late: 'ዘግይቷል', absent: 'አልተገኘም', rate: 'መጠን',
    exams: 'ፈተናዎች', average: 'አማካይ', marksCount: 'ውጤቶች',
    expected: 'የሚጠበቅ', pending: 'በመጠባበቅ', studentsCount: 'ተማሪዎች',
    filter: 'ማጣሪያ', year: 'ዓመት', month: 'ወር', allMonths: 'ሁሉም ወራት', term: 'ሙሉ ጊዜ', allTerms: 'ሁሉም ጊዜያት', academicYear: 'የትምህርት ዓመት',
    filterEthDate: 'በቀን ማጣራት (የኢትዮጵያ ቀን መቁጠሪያ)', filterEthMonth: 'በወር ማጣራት (የኢትዮጵያ ቀን መቁጠሪያ)',
    unlockedNote: 'ያልተከፈለ = የተከፈቱ ወራት ብቻ (የደረሱ ወራት፣ እስካሁን ሙሉ በሙሉ ያልተከፈሉ)',
    noBranchData: 'የቅርንጫፍ መረጃ የለም', noClasses: 'ክፍሎች አልተገኙም', noAttendance: 'የመገኘት መዝገቦች የሉም',
    noExamData: 'የፈተና መረጃ የለም', noFaults: 'ጥፋቶች አልተመዘገቡም', noInvoices: 'ክፍያ መጠየቂያዎች የሉም',
    studentsTitle: 'ተማሪዎች በቅርንጫፍ እና በክፍል',
    account: 'መለያ', changeUsername: 'የተጠቃሚ ስም ቀይር', changePassword: 'የይለፍ ቃል ቀይር',
    currentPassword: 'የአሁኑ የይለፍ ቃል', newUsername: 'አዲስ የተጠቃሚ ስም', newPassword: 'አዲስ የይለፍ ቃል',
    confirmPassword: 'አዲሱን የይለፍ ቃል አረጋግጥ', save: 'አስቀምጥ', saving: 'እያስቀመጠ...',
    accountUpdated: 'መለያ በተሳካ ሁኔታ ተለውጧል!', passwordMismatch: 'የይለፍ ቃሎቹ አይመሳሰሉም',
    passwordTooShort: 'አዲሱ የይለፍ ቃል ቢያንስ 4 ቁምፊ መሆን አለበት', wrongPassword: 'የአሁኑ የይለፍ ቃል ትክክል አይደለም',
    preferences: 'ምርጫዎች', language: 'ቋንቋ', darkMode: 'ጨለማ ሁነታ', darkModeDesc: 'ወደ ጨለማ ቀለሞች ቀይር',
    languageDesc: 'የመተግበሪያውን ቋንቋ ምረጥ', english: 'እንግሊዝኛ', somali: 'ሶማሊኛ', amharic: 'አማርኛ', arabic: 'አረብኛ',
    perBranchDetail: 'እያንዳንዱ ቅርንጫፍ የራሱን ክፍሎችና ጠቅላላ ያሳያል', ofExpected: 'ከሚጠበቀው', collectedWord: 'የተሰበሰበ',
    downloadPdfReport: 'የፒዲኤፍ ሪፖርት አውርድ', generatingPdf: 'ፒዲኤፍ እየተዘጋጀ ነው...',
    liveAudit: 'የቀጥታ የፋይናንስ ኦዲት ሪፖርት', standardFeeSchedule: 'መደበኛ የክፍያ ሰንጠረዥ',
    advancePaymentsTitle: 'ቀደም ብለው የተከፈሉ ክፍያዎች (የተዘጉ ወራት)', paying: 'የሚከፍሉ', unassigned: 'ያልተመደበ',
    unlockedDue: 'ያልተከፈለ እዳ', monthlyFee: 'የወር ክፍያ', regFee: 'የምዝገባ ክፍያ',
    m1Paid: 'ወር 1 የተከፈለ', m2Paid: 'ወር 2 የተከፈለ', unpaidDue: 'ያልተከፈለ (የደረሰ)',
    monthPerformance: 'በወር የሚጠበቅ እና የተሰበሰበ አፈጻጸም',
    unassignedTitle: 'ያልተመደቡ ተማሪዎች (አዲስ/ቀድሞ መለየት የሚያስፈልጋቸው)',
    unassignedDesc: 'እነዚህ ተማሪዎች በዳታቤዝ ውስጥ ቀድሞ ወይም አዲስ መሆናቸው አልተገለጸም።',
    unpaidDirectoryTitle: 'ክፍያ ያልፈጸሙ ተማሪዎች ማውጫ',
    unpaidDesc: 'በተከፈቱ ወራት (መስከረም እና ጥቅምት) ክፍያ ያልፈጸሙ ተማሪዎች።'
  },
  ar: {
    appName: 'إقرأ سوبر أدمن', loginSub: 'تقارير جميع الفروع في مكان واحد',
    signIn: 'تسجيل الدخول', signingIn: 'جارٍ الدخول...', username: 'اسم المستخدم', password: 'كلمة المرور',
    logout: 'تسجيل الخروج', allBranches: 'جميع الفروع', loading: 'جارٍ تحميل التقارير...', loginFailed: 'فشل تسجيل الدخول',
    home: 'الرئيسية', students: 'الطلاب', attendance: 'الحضور', marks: 'الدرجات', faults: 'الأخطاء', finance: 'المالية', sms: 'SMS', settings: 'الإعدادات',
    totalStudents: 'إجمالي الطلاب', boys: 'أولاد', girls: 'بنات', across: 'عبر', branchesWord: 'فروع',
    newStudents: 'جديد', oldStudents: 'قديم', addedByDate: 'الطلاب المضافون حسب التاريخ', addedByDateTitle: 'اختر تاريخاً لمعرفة من أُضيف',
    from: 'من', to: 'إلى', studentsAdded: 'طلاب أُضيفوا', noStudentsAdded: 'لا يوجد طلاب أُضيفوا في هذه الفترة', student: 'الطالب', typeWord: 'النوع', branch: 'الفرع',
    addedToday: 'أُضيف اليوم', collectedToday: 'المُحصَّل اليوم',
    attendanceRate: 'نسبة الحضور', collected: 'المُحصَّل', pendingFees: 'المستحق غير المدفوع', faultsCount: 'الأخطاء',
    freeStudents: 'الطلاب المجانيون', freeRegPaid: 'رسوم التسجيل المجانية المدفوعة',
    byClass: 'حسب الصف', byBranch: 'حسب الفرع', allBranchesNote: 'جميع الفروع',
    class: 'الصف', total: 'الإجمالي', records: 'سجلات', present: 'حاضر', late: 'متأخر', absent: 'غائب', rate: 'النسبة',
    exams: 'الامتحانات', average: 'المتوسط', marksCount: 'الدرجات',
    expected: 'المتوقع', pending: 'المتبقي', studentsCount: 'الطلاب',
    filter: 'تصفية', year: 'السنة', month: 'الشهر', allMonths: 'كل الشهور', term: 'الفصل', allTerms: 'كل الفصول', academicYear: 'السنة الدراسية',
    filterEthDate: 'تصفية حسب التاريخ (التقويم الإثيوبي)', filterEthMonth: 'تصفية حسب الشهر (التقويم الإثيوبي)',
    unlockedNote: 'المتبقي = الشهور المفتوحة فقط (الشهور المستحقة، التي لم تُدفع بالكامل بعد)',
    noBranchData: 'لا توجد بيانات للفروع', noClasses: 'لا توجد صفوف', noAttendance: 'لا توجد سجلات حضور',
    noExamData: 'لا توجد بيانات امتحانات بعد', noFaults: 'لا توجد أخطاء مسجلة', noInvoices: 'لا توجد فواتير',
    studentsTitle: 'الطلاب حسب الفرع والصف',
    account: 'الحساب', changeUsername: 'تغيير اسم المستخدم', changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية', newUsername: 'اسم مستخدم جديد', newPassword: 'كلمة مرور جديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة', save: 'حفظ التغييرات', saving: 'جارٍ الحفظ...',
    accountUpdated: 'تم تحديث الحساب بنجاح!', passwordMismatch: 'كلمتا المرور غير متطابقتين',
    passwordTooShort: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', wrongPassword: 'كلمة المرور الحالية غير صحيحة',
    preferences: 'التفضيلات', language: 'اللغة', darkMode: 'الوضع الداكن', darkModeDesc: 'التبديل إلى الألوان الداكنة',
    languageDesc: 'اختر لغة التطبيق', english: 'الإنجليزية', somali: 'الصومالية', amharic: 'الأمهرية', arabic: 'العربية',
    perBranchDetail: 'كل فرع يعرض صفوفه وإجمالياته', ofExpected: 'من المتوقع', collectedWord: 'تم تحصيله',
    downloadPdfReport: 'تحميل تقرير PDF', generatingPdf: 'جارٍ تجهيز ملف PDF...',
    liveAudit: 'تقرير التدقيق المالي المباشر', standardFeeSchedule: 'جدول الرسوم المعتمد',
    advancePaymentsTitle: 'المدفوعات المسبقة (الشهور المقفلة)', paying: 'دافع', unassigned: 'غير مصنف',
    unlockedDue: 'المستحق غير المدفوع', monthlyFee: 'الرسوم الشهرية', regFee: 'رسوم التسجيل',
    m1Paid: 'شهر 1 مسدد', m2Paid: 'شهر 2 مسدد', unpaidDue: 'مستحق غير مسدد',
    monthPerformance: 'المتوقع مقابل المحصل شهرياً',
    unassignedTitle: 'الطلاب غير المصنفين (يلزم تحديد قديم/جديد)',
    unassignedDesc: 'هؤلاء الطلاب لم يُحدد لهم تصنيف (قديم أو جديد) في قاعدة البيانات.',
    unpaidDirectoryTitle: 'دليل الطلاب غير المسددين',
    unpaidDesc: 'الطلاب الذين عليهم مستحقات غير مسددة في الشهور المفتوحة (مسكرم وتكمت).'
  }
};

const LANGS = [
  { code: 'en', labelKey: 'english' },
  { code: 'so', labelKey: 'somali' },
  { code: 'am', labelKey: 'amharic' },
  { code: 'ar', labelKey: 'arabic' }
];

const TABS = [
  { key: 'home', labelKey: 'home', icon: FiHome, short: 'Home' },
  { key: 'students', labelKey: 'students', icon: FiUsers, short: 'Stud' },
  { key: 'attendance', labelKey: 'attendance', icon: FiCheckCircle, short: 'Atten' },
  { key: 'marks', labelKey: 'marks', icon: FiClipboard, short: 'Marks' },
  { key: 'faults', labelKey: 'faults', icon: FiAlertTriangle, short: 'Faults' },
  { key: 'finance', labelKey: 'finance', icon: FiDollarSign, short: 'Fin' },
  { key: 'sms', labelKey: 'sms', icon: FiMessageSquare, short: 'SMS' },
  { key: 'settings', labelKey: 'settings', icon: FiSettings, short: 'Set' }
];

const fmt = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const birr = (n) => fmt(n) + ' Birr';

const exportFinancePdf = (f, branchFilter) => {
  if (!f) return;
  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(139, 26, 26);
  doc.rect(0, 0, pageWidth, 54, 'F');
  doc.setFillColor(247, 148, 30);
  doc.rect(0, 54, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IQRA EDUCATIONAL COMPLEX', margin, 24);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 217, 160);
  doc.text('SUPER ADMIN COMPREHENSIVE MONTHLY PAYMENT & FEE AUDIT REPORT', margin, 40);

  const now = new Date();
  const dateStr = now.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Academic Year: ${f.academicYear || '2019 E.C.'}  |  Month: ${f.currentEthMonthName || 'Tikimt'}  |  Live Data: ${dateStr}`,
    pageWidth - margin, 32, { align: 'right' }
  );

  let currentY = 70;

  // 1. Executive Summary Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 26, 26);
  doc.text('1. Executive Financial & Enrollment Summary', margin, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value', 'Financial Metric', 'Amount (ETB)']],
    body: [
      [
        'Total Active Enrolled Students',
        `${fmt(f.grandStudents)} students`,
        'Total Fee Collected to Date',
        `${fmt(f.grandCollected)} ETB`
      ],
      [
        'Student Breakdown (Old / New / Unassigned)',
        `${fmt(f.grandOld)} Old  |  ${fmt(f.grandNew)} New  |  ${fmt(f.grandUnassigned)} Unassigned`,
        'Unlocked Due Outstanding (Months 1-2)',
        `${fmt(f.grandPendingUnlocked || f.grandPending)} ETB`
      ],
      [
        'Paying vs Scholarship / Free Students',
        `${fmt(f.grandPayingStudents)} Paying  |  ${fmt(f.grandFreeStudents)} Free`,
        'Advance Prepayments (Locked Months M3-M9)',
        `${fmt(f.grandAdvance)} ETB`
      ],
      [
        'Unlocked Unpaid Students Count',
        `${fmt(f.grandUnpaidUnlocked)} students with pending unlocked fee`,
        'Collections Today',
        `${fmt(f.grandCollectedToday)} ETB`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', width: contentWidth * 0.28 },
      1: { width: contentWidth * 0.22 },
      2: { fontStyle: 'bold', width: contentWidth * 0.28 },
      3: { width: contentWidth * 0.22, fontStyle: 'bold', textColor: [139, 26, 26] }
    }
  });

  currentY = doc.lastAutoTable.finalY + 16;

  // 2. Month-by-Month Collection Performance
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 26, 26);
  doc.text('2. Month-by-Month Target & Collection Performance', margin, currentY);
  currentY += 6;

  const m1Rate = f.grandM1Expected > 0 ? Math.round((f.grandM1Collected / f.grandM1Expected) * 100) : 0;
  const m2Rate = f.grandM2Expected > 0 ? Math.round((f.grandM2Collected / f.grandM2Expected) * 100) : 0;
  const unlRate = f.grandExpected > 0 ? Math.round(((f.grandCollectedUnlocked || f.grandCollected) / f.grandExpected) * 100) : 0;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Month', 'Status', 'Target Expected (ETB)', 'Total Collected (ETB)', 'Pending Outstanding (ETB)', 'Collection Rate (%)']],
    body: [
      ['Month 1: Meskerem (Tuition + Registration)', 'Unlocked (Due)', `${fmt(f.grandM1Expected)} ETB`, `${fmt(f.grandM1Collected)} ETB`, `${fmt(Math.max(f.grandM1Expected - f.grandM1Collected, 0))} ETB`, `${m1Rate}%`],
      ['Month 2: Tikimt (Monthly Tuition)', 'Unlocked (Due)', `${fmt(f.grandM2Expected)} ETB`, `${fmt(f.grandM2Collected)} ETB`, `${fmt(Math.max(f.grandM2Expected - f.grandM2Collected, 0))} ETB`, `${m2Rate}%`],
      ['Months 3 to 9: Prepayments Early', 'Locked (Prepaid)', '-', `${fmt(f.grandAdvance)} ETB`, '-', 'Advance']
    ],
    foot: [
      ['TOTAL UNLOCKED PERIOD (M1 & M2)', 'Current Horizon', `${fmt(f.grandExpected)} ETB`, `${fmt(f.grandCollectedUnlocked || f.grandCollected)} ETB`, `${fmt(f.grandPendingUnlocked || f.grandPending)} ETB`, `${unlRate}%`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [80, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [253, 235, 211], textColor: [139, 26, 26], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3.5 }
  });

  currentY = doc.lastAutoTable.finalY + 16;

  // 3. Standard Fee Schedule Table
  if (f.feeSchedule && f.feeSchedule.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text('3. Approved Standard Fee Structure (Monthly Tuition & Registration)', margin, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Category / Level', 'Classes Covered', 'Monthly Tuition', 'Old Student Reg', 'New Student Reg', 'Month 1 Old (Total)', 'Month 1 New (Total)']],
      body: f.feeSchedule.map(s => [
        s.category,
        s.classes,
        `${fmt(s.monthlyFee)} ETB`,
        `${fmt(s.oldRegFee)} ETB`,
        `${fmt(s.newRegFee)} ETB`,
        `${fmt(s.m1Old)} ETB`,
        `${fmt(s.m1New)} ETB`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  }

  // 4. Branch Comparative Summary Table
  const branchesList = f.byBranch || [];
  if (branchesList.length > 0) {
    if (currentY > pageHeight - 130) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text('4. Branch Comparative Financial Summary (Target vs Collected)', margin, currentY);
    currentY += 6;

    const branchRows = branchesList.map(b => [
      b.branchName || b.branchCode,
      fmt(b.totalStudents),
      `${fmt(b.payingStudents)} / ${fmt(b.freeStudents)}`,
      `${fmt(b.m1Expected)} / ${fmt(b.m1Collected)}`,
      `${fmt(b.m2Expected)} / ${fmt(b.m2Collected)}`,
      `${fmt(b.expected)} ETB`,
      `${fmt(b.collectedUnlocked || b.collected)} ETB`,
      `${fmt(b.pendingUnlocked || b.pending)} ETB`,
      `${b.rate || 0}%`,
      `${fmt(b.advanceCollected)} ETB`
    ]);

    const branchTotals = [
      'ALL BRANCHES (TOTAL)',
      fmt(f.grandStudents),
      `${fmt(f.grandPayingStudents)} / ${fmt(f.grandFreeStudents)}`,
      `${fmt(f.grandM1Expected)} / ${fmt(f.grandM1Collected)}`,
      `${fmt(f.grandM2Expected)} / ${fmt(f.grandM2Collected)}`,
      `${fmt(f.grandExpected)} ETB`,
      `${fmt(f.grandCollectedUnlocked || f.grandCollected)} ETB`,
      `${fmt(f.grandPendingUnlocked || f.grandPending)} ETB`,
      `${f.grandRate || 0}%`,
      `${fmt(f.grandAdvance)} ETB`
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Branch', 'Enrolled', 'Paying/Free', 'M1 Exp / Coll', 'M2 Exp / Coll', 'Total Expected', 'Total Collected', 'Unlocked Due', 'Rate', 'Advance (M3-M9)']],
      body: branchRows,
      foot: [branchTotals],
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: [253, 235, 211], textColor: [139, 26, 26], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3.5 }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  }

  // 5. Detailed Class-by-Class Tables for Each Branch
  branchesList.forEach((b, bIdx) => {
    const classes = b.classes || [];
    if (classes.length === 0) return;

    if (currentY > pageHeight - 140 || bIdx > 0) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text(
      `5.${bIdx + 1} ${b.branchName || b.branchCode} — Detailed Class-by-Class Target & Collection Breakdown`,
      margin, currentY
    );
    currentY += 6;

    const classRows = classes.map(c => [
      c.className,
      fmt(c.totalStudents || c.students),
      `${fmt(c.oldStudents)} / ${fmt(c.newStudents)}`,
      fmt(c.payingStudents),
      `${fmt(c.monthlyFee)}`,
      `${fmt(c.m1Expected)} / ${fmt(c.m1Collected)}`,
      `${fmt(c.m2Expected)} / ${fmt(c.m2Collected)}`,
      `${fmt(c.expected)} ETB`,
      `${fmt(c.collectedUnlocked || c.collected)} ETB`,
      `${fmt(c.pendingUnlocked || c.pending)} ETB`,
      `${c.rate || 0}%`
    ]);

    const bTotal = [
      `${b.branchName || b.branchCode} TOTAL`,
      fmt(b.totalStudents),
      `${fmt(b.oldStudents)} / ${fmt(b.newStudents)}`,
      fmt(b.payingStudents),
      '-',
      `${fmt(b.m1Expected)} / ${fmt(b.m1Collected)}`,
      `${fmt(b.m2Expected)} / ${fmt(b.m2Collected)}`,
      `${fmt(b.expected)} ETB`,
      `${fmt(b.collectedUnlocked || b.collected)} ETB`,
      `${fmt(b.pendingUnlocked || b.pending)} ETB`,
      `${b.rate || 0}%`
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Class', 'Total', 'Old / New', 'Paying', 'Monthly', 'M1 Exp / Coll', 'M2 Exp / Coll', 'Total Expected', 'Total Collected', 'Unlocked Due', 'Rate']],
      body: classRows,
      foot: [bTotal],
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: [253, 235, 211], textColor: [139, 26, 26], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  });

  // 6. Unassigned Students Table (Old / New Not Set)
  const unassignedList = f.unassignedStudents || [];
  if (unassignedList.length > 0) {
    doc.addPage();
    currentY = 40;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text(
      `6. Unassigned Students (${unassignedList.length} Students Requiring Old / New Classification)`,
      margin, currentY
    );
    currentY += 6;

    const unassignedRows = unassignedList.map((st, idx) => [
      (idx + 1).toString(),
      st.branch || st.branchCode,
      st.class,
      st.studentName,
      'Status NULL (Pending Admin Classification)'
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Branch', 'Class', 'Student Name', 'System Action Required']],
      body: unassignedRows,
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [254, 243, 199] }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  }

  // 7. Unpaid Students Directory (Unlocked Months)
  const unpaidList = f.unpaidStudents || [];
  if (unpaidList.length > 0) {
    doc.addPage();
    currentY = 40;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text(
      `7. Detailed Unpaid Students Directory (Unlocked Months) — ${unpaidList.length} Students Outstanding`,
      margin, currentY
    );
    currentY += 6;

    const unpaidRows = unpaidList.map((st, idx) => [
      (idx + 1).toString(),
      st.branch || st.branchCode,
      st.class,
      st.studentName,
      `${st.unpaidMonthsCount} Month(s)`,
      (st.unpaidMonths || []).join(', '),
      `${fmt(st.totalDue)} ETB`
    ]);

    const totalUnpaidSum = unpaidList.reduce((acc, st) => acc + (st.totalDue || 0), 0);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Branch', 'Class', 'Student Name', 'Months Due', 'Unpaid Months Breakdown', 'Total Due (ETB)']],
      body: unpaidRows,
      foot: [['TOTAL UNPAID OUTSTANDING', '', '', '', `${unpaidList.length} students`, '', `${fmt(totalUnpaidSum)} ETB`]],
      theme: 'grid',
      headStyles: { fillColor: [139, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    currentY = doc.lastAutoTable.finalY + 16;
  }

  // 8. Advance Prepayments for Locked Months
  const allLockedPayments = [];
  branchesList.forEach(b => {
    (b.lockedMonthPayments || []).forEach(p => allLockedPayments.push(p));
  });

  if (allLockedPayments.length > 0) {
    if (currentY > pageHeight - 120) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 26, 26);
    doc.text(
      `8. Advance Prepayments for Locked Months (Months 3 to 9) — ${allLockedPayments.length} Total Prepayments`,
      margin, currentY
    );
    currentY += 6;

    const lockedRows = allLockedPayments.map((p, idx) => [
      (idx + 1).toString(),
      p.branch,
      p.class,
      p.studentName,
      p.monthName || `Month ${p.monthNumber}`,
      (p.receiptNumber && p.receiptNumber !== 'N/A' && String(p.receiptNumber).trim())
        ? String(p.receiptNumber).trim()
        : ('RCP-' + String(p.invoiceNumber || idx + 1).padStart(6, '0')),
      `${fmt(p.paidAmount)} ETB`
    ]);

    const totalLockedAmount = allLockedPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Branch', 'Class', 'Student Name', 'Target Prepaid Month', 'Receipt #', 'Amount Paid']],
      body: lockedRows,
      foot: [['TOTAL ADVANCE PREPAYMENTS', '', '', '', '', `${allLockedPayments.length} payments`, `${fmt(totalLockedAmount)} ETB`]],
      theme: 'grid',
      headStyles: { fillColor: [80, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: [253, 235, 211], textColor: [139, 26, 26], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 }
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Iqra Educational Complex — Confidential Financial Audit Report', margin, pageHeight - 16);
    doc.text(`Generated: ${dateStr}`, pageWidth / 2, pageHeight - 16, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
  }

  const timeStamp = now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  doc.save(`Iqra_Monthly_Payment_Report_${timeStamp}.pdf`);
};

const SuperAdmin = () => {
  const [lang, setLang] = useState(localStorage.getItem('superAdminLang') || 'en');
  const [dark, setDark] = useState(localStorage.getItem('superAdminTheme') === 'dark');
  const t = (key) => I18N[lang]?.[key] || I18N.en[key] || key;
  // FIX: hide the Finance tab from the 'abdi' account (per-user menu)
  const loggedInUser = localStorage.getItem('superAdminUser') || '';
  const visibleTabs = TABS.filter(tb => !(loggedInUser === 'abdi' && tb.key === 'finance'));

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('superAdminToken'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('ALL');
  const [branchOpen, setBranchOpen] = useState(false);
  const [tab, setTab] = useState('home');

  const [students, setStudents] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [faults, setFaults] = useState(null);
  const [finance, setFinance] = useState(null);
  const [registrations, setRegistrations] = useState(null);

  const [regFrom, setRegFrom] = useState(() => new Date().toISOString().substring(0, 10));
  const [regTo, setRegTo] = useState(() => new Date().toISOString().substring(0, 10));

  const [attViewMode, setAttViewMode] = useState('month'); // 'month' | 'week' | 'date'
  const [attYear, setAttYear] = useState('2019');
  const [attMonth, setAttMonth] = useState('2');
  const [attWeek, setAttWeek] = useState('1');
  const [attDay, setAttDay] = useState('');
  const [attLeaderboardTab, setAttLeaderboardTab] = useState('absent'); // 'absent' | 'present' | 'late' | 'permission'

  const [finMonth, setFinMonth] = useState('');
  const [faultYear, setFaultYear] = useState('');
  const [faultMonth, setFaultMonth] = useState('');
  const [mkYear, setMkYear] = useState('');
  const [mkTerm, setMkTerm] = useState('1');
  const [marksClassFilter, setMarksClassFilter] = useState('ALL');
  const [marksSearch, setMarksSearch] = useState('');
  const [marksRankView, setMarksRankView] = useState('highest'); // 'highest' | 'lowest'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Finance Tab filters and pagination states
  const [unpaidSearch, setUnpaidSearch] = useState('');
  const [unpaidBranchFilter, setUnpaidBranchFilter] = useState('ALL');
  const [unpaidMonthsFilter, setUnpaidMonthsFilter] = useState('ALL');
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [unassignedSearch, setUnassignedSearch] = useState('');

  const handleDownloadPdf = () => {
    if (!finance || pdfGenerating) return;
    try {
      setPdfGenerating(true);
      exportFinancePdf(finance, branch);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const [accForm, setAccForm] = useState({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
  const [accMsg, setAccMsg] = useState('');
  const [accError, setAccError] = useState('');
  const [branchAdmins, setBranchAdmins] = useState([]);
  const [branchAdminForms, setBranchAdminForms] = useState({});
  const [branchAdminMsg, setBranchAdminMsg] = useState('');
  const [branchAdminError, setBranchAdminError] = useState('');
  const [branchAdminLoading, setBranchAdminLoading] = useState(false);
  const [dailySettings, setDailySettings] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [dailyMsg, setDailyMsg] = useState('');
  const [dailyError, setDailyError] = useState('');
  const [dailyLoading, setDailyLoading] = useState(false);
  const [accLoading, setAccLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('superAdminLang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('superAdminTheme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await api.post('/super-admin/login', loginForm);
      localStorage.setItem('superAdminToken', res.data.token);
      localStorage.setItem('superAdminUser', res.data?.user?.username || loginForm.username);
      setIsLoggedIn(true);
    } catch (err) {
      // stay on the super-admin page — never redirect to the admin login
      setLoginError(err.response?.data?.error || t('loginFailed') || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    setIsLoggedIn(false);
  };

  const loadData = useCallback(async (keys = ['branches', 'students', 'attendance', 'finance', 'faults']) => {
    setLoading(true);
    setError('');
    try {
      const b = branch === 'ALL' ? 'ALL' : branch;
      const tasks = [];
      const idx = {};
      const add = (key, promise) => { idx[key] = tasks.length; tasks.push(promise); };

      if (keys.includes('branches')) add('branches', api.get('/super-admin/branches', { timeout: 60000 }));
      if (keys.includes('students')) add('students', api.get('/super-admin/report/students', { timeout: 90000, params: { branchCode: b } }));
      if (keys.includes('attendance')) add('attendance', api.get('/super-admin/report/attendance', { timeout: 90000, params: {
        branchCode: b, viewMode: attViewMode, year: attYear || undefined, month: attMonth || undefined,
        week: attViewMode === 'week' ? (attWeek || undefined) : undefined,
        day: attViewMode === 'date' ? (attDay || undefined) : undefined,
      } }));
      if (keys.includes('marks')) add('marks', api.get('/super-admin/report/marks', { timeout: 90000, params: { branchCode: b, academic_year: mkYear || undefined, term: mkTerm || undefined } }));
      if (keys.includes('faults')) add('faults', api.get('/super-admin/report/faults', { timeout: 90000, params: { branchCode: b, year: faultYear || undefined, month: faultMonth || undefined } }));
      if (keys.includes('finance')) add('finance', api.get('/super-admin/report/finance', { timeout: 90000, params: { branchCode: b, month: finMonth || undefined } }));
      if (keys.includes('registrations')) add('registrations', api.get('/super-admin/report/registrations', { timeout: 120000, params: { branchCode: b, from: regFrom || undefined, to: regTo || undefined } }));

      const results = await Promise.allSettled(tasks);
      const ok = (key) => {
        const i = idx[key];
        if (i === undefined) return null;
        const r = results[i];
        return r && r.status === 'fulfilled' ? r.value : null;
      };

      const branchesRes = ok('branches');
      if (branchesRes?.data?.branches) {
        const ALLOWED = ['IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];
        const all = branchesRes.data.branches;
        const matched = all.filter((x) => ALLOWED.includes(String(x.branch_code).toUpperCase()));
        setBranches(matched.map((x) => ({ code: x.branch_code, name: x.branch_name })));
      }
      const stu = ok('students'); if (stu?.data?.data) setStudents(stu.data.data);
      const att = ok('attendance'); if (att?.data?.data) setAttendance(att.data.data);
      const mk = ok('marks'); if (mk?.data?.data) setMarks(mk.data.data);
      const flt = ok('faults'); if (flt?.data?.data) setFaults(flt.data.data);
      const fin = ok('finance'); if (fin?.data?.data) setFinance(fin.data.data);
      const reg = ok('registrations'); if (reg?.data?.data) setRegistrations(reg.data.data);

      const is401 = results.some((r) => r.status === 'rejected' && r.reason?.response?.status === 401);
      if (is401) handleLogout();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, [branch, attViewMode, attYear, attMonth, attWeek, attDay, mkYear, mkTerm, faultYear, faultMonth, finMonth, regFrom, regTo]);

  // Load only what the active tab needs (the old code loaded every report on
  // every filter change, which made the app slow).
  const loadAll = useCallback(async () => {
    const keysByTab = {
      home: ['branches', 'students', 'attendance', 'finance', 'faults'],
      students: ['branches', 'students', 'registrations'],
      attendance: ['attendance'],
      marks: ['marks'],
      faults: ['faults'],
      finance: ['finance'],
      sms: [],
      settings: [],
    };
    await loadData(keysByTab[tab] || ['branches']);
  }, [loadData, tab]);

  useEffect(() => {
    if (isLoggedIn) loadAll();
  }, [isLoggedIn, loadAll]);

  const loadBranchAdmins = useCallback(async () => {
    try {
      setBranchAdminError('');
      const res = await api.get('/super-admin/branch-admins', { timeout: 40000 });
      if (res.data?.success) {
        setBranchAdmins(res.data.data || []);
        const forms = {};
        for (const b of res.data.data || []) forms[b.branchCode] = { username: b.username || '', password: '' };
        setBranchAdminForms(forms);
      }
    } catch (e) {
      setBranchAdminError(e.response?.data?.error || 'Failed to load branch admins');
    }
  }, []);

  const loadDailyReport = useCallback(async () => {
    try {
      setDailyError('');
      const res = await api.get('/super-admin/daily-report/settings', { timeout: 30000 });
      if (res.data?.success) setDailySettings(res.data.data);
    } catch (e) {
      setDailyError(e.response?.data?.error || 'Failed to load daily report settings');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && tab === 'settings') {
      loadBranchAdmins();
      loadDailyReport();
    }
  }, [isLoggedIn, tab, loadBranchAdmins, loadDailyReport]);

  const saveDailySettings = async (patch = {}) => {
    setDailyLoading(true);
    setDailyMsg('');
    setDailyError('');
    try {
      const base = dailySettings || {};
      const body = { ...base, ...patch };
      const res = await api.put('/super-admin/daily-report/settings', {
        daily_report_enabled: body.daily_report_enabled !== false,
        recipients: body.recipients || '',
        send_hour: body.send_hour == null ? 8 : body.send_hour
      });
      if (res.data?.success) {
        setDailySettings(res.data.data);
        setDailyMsg('Daily report settings saved');
      }
    } catch (e) {
      setDailyError(e.response?.data?.error || 'Save failed');
    } finally {
      setDailyLoading(false);
    }
  };

  const previewDaily = async () => {
    setDailyLoading(true);
    setDailyError('');
    try {
      const res = await api.get('/super-admin/daily-report/preview', { timeout: 120000 });
      if (res.data?.success) setDailySummary(res.data.data);
    } catch (e) {
      setDailyError(e.response?.data?.error || 'Preview failed');
    } finally {
      setDailyLoading(false);
    }
  };

  const sendDailyNow = async () => {
    setDailyLoading(true);
    setDailyMsg('');
    setDailyError('');
    try {
      const res = await api.post('/super-admin/daily-report/send', {}, { timeout: 120000 });
      const d = res.data?.data || {};
      if (d.sent) setDailyMsg('Daily report sent to ' + (d.recipients || []).join(', '));
      else setDailyError('Not sent: ' + (d.reason || d.error || d.status || 'unknown'));
      if (d.summary) setDailySummary(d.summary);
    } catch (e) {
      setDailyError(e.response?.data?.error || 'Send failed');
    } finally {
      setDailyLoading(false);
    }
  };

  const handleBranchAdminSave = async (code) => {
    const f = branchAdminForms[code] || {};
    if (!f.username && !f.password) { setBranchAdminError('Enter a new username or password'); return; }
    if (f.password && String(f.password).length < 4) { setBranchAdminError('Password must be at least 4 characters'); return; }
    setBranchAdminLoading(true);
    setBranchAdminMsg('');
    setBranchAdminError('');
    try {
      const res = await api.put('/super-admin/branch-admins/' + code, {
        username: f.username || undefined,
        newPassword: f.password || undefined
      });
      setBranchAdminMsg(res.data?.message || (code + ' admin updated'));
      await loadBranchAdmins();
    } catch (e) {
      setBranchAdminError(e.response?.data?.error || 'Update failed');
    } finally {
      setBranchAdminLoading(false);
    }
  };

  const handleAccountSave = async (e) => {
    e.preventDefault();
    setAccMsg('');
    setAccError('');
    if (accForm.newPassword && accForm.newPassword.length < 4) {
      setAccError(t('passwordTooShort'));
      return;
    }
    if (accForm.newPassword && accForm.newPassword !== accForm.confirmPassword) {
      setAccError(t('passwordMismatch'));
      return;
    }
    setAccLoading(true);
    try {
      await api.put('/super-admin/account', {
        currentPassword: accForm.currentPassword,
        newUsername: accForm.newUsername || undefined,
        newPassword: accForm.newPassword || undefined
      });
      setAccMsg(t('accountUpdated'));
      setAccForm({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setAccError(err.response?.data?.error || 'Update failed');
    } finally {
      setAccLoading(false);
    }
  };

  // ---------------- LOGIN SCREEN ----------------
  if (!isLoggedIn) {
    return (
      <div className={styles.loginWrap}>
        <div className={`${styles.loginCard} ${dark ? styles.loginCardDark : ''}`}>
          <div className={styles.loginLogo}>I</div>
          <h1 className={styles.loginTitle}>{t('appName')}</h1>
          <p className={styles.loginSub}>{t('loginSub')}</p>
          {loginError && <div className={styles.loginError}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <input
              className={styles.loginInput}
              type="text"
              placeholder={t('username')}
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
            <input
              className={styles.loginInput}
              type="password"
              placeholder={t('password')}
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <button type="submit" className={styles.loginBtn} disabled={loginLoading}>
              {loginLoading ? t('signingIn') : t('signIn')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------- REPORT COMPONENTS ----------------
  const BranchSelector = () => {
    const currentName = branch === 'ALL'
      ? t('allBranches')
      : branches.find((b) => b.code === branch)?.name || branch;
    return (
      <div className={styles.branchSelectWrap}>
        <button className={styles.branchSelectBtn} onClick={() => setBranchOpen((o) => !o)}>
          <span>{currentName}</span>
          <FiChevronDown />
        </button>
        {branchOpen && (
          <>
            <div className={styles.branchBackdrop} onClick={() => setBranchOpen(false)} />
            <div className={styles.branchDropdown}>
              <button
                className={`${styles.branchOption} ${branch === 'ALL' ? styles.branchOptionActive : ''}`}
                onClick={() => { setBranch('ALL'); setBranchOpen(false); }}
              >
                <span>{t('allBranches')}</span>
                {branch === 'ALL' && <FiCheck className={styles.branchCheck} />}
              </button>
              {branches.map((b) => (
                <button
                  key={b.code}
                  className={`${styles.branchOption} ${branch === b.code ? styles.branchOptionActive : ''}`}
                  onClick={() => { setBranch(b.code); setBranchOpen(false); }}
                >
                  <span>{b.name} <small>({b.code})</small></span>
                  {branch === b.code && <FiCheck className={styles.branchCheck} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const ALLOWED_BRANCH_CODES = ['IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];
  const activeBranches = (data) => {
    if (!data) return [];
    const list = data.byBranch || data.branches || [];
    return list.filter(
      (b) => !b.error && ALLOWED_BRANCH_CODES.includes(String(b.branchCode).toUpperCase())
    );
  };

  const HomeTab = () => {
    const stuBranches = activeBranches(students);
    const finBranches = activeBranches(finance);
    const attBranches = activeBranches(attendance);
    return (
      <>
        <div className={styles.hero}>
          <div className={styles.heroLabel}>{t('totalStudents')}</div>
          <div className={styles.heroValue}>{fmt(students?.grandTotal)}</div>
          <div className={styles.heroSub}>
            {fmt(students?.grandMale)} {t('boys')} · {fmt(students?.grandFemale)} {t('girls')} · {t('across')} {stuBranches.length} {t('branchesWord')}
          </div>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('attendanceRate')}</div>
            <div className={styles.statValue}>{attendance?.grandRate ?? 0}%</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('collected')}</div>
            <div className={styles.statValueGold}>{fmt(finance?.grandCollected)}</div>
            <div className={styles.statLabel}>Birr</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('pendingFees')}</div>
            <div className={styles.statValueRed}>{fmt(finance?.grandPending)}</div>
            <div className={styles.statLabel}>Birr</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('faultsCount')}</div>
            <div className={styles.statValue}>{fmt(faults?.grandTotal)}</div>
          </div>
        </div>

        <h3 className={styles.sectionTitle}>{t('byBranch')} <small>({stuBranches.length})</small></h3>
        <div className={styles.card}>
          {stuBranches.map((b) => {
            const fin = finBranches.find((x) => x.branchCode === b.branchCode);
            const att = attBranches.find((x) => x.branchCode === b.branchCode);
            return (
              <div key={b.branchCode} className={styles.branchItem}>
                <div className={styles.branchHead}>
                  <div className={styles.branchDot}>{String(b.branchName || b.branchCode).charAt(0)}</div>
                  <div className={styles.branchName}>{b.branchName}</div>
                  <div className={styles.branchBadge}>{fmt(b.total)}</div>
                </div>
                <div className={styles.branchStats}>
                  <div className={styles.miniStat}>{t('attendanceRate')}<b>{att ? `${att.rate}%` : '—'}</b></div>
                  <div className={styles.miniStat}>{t('collected')}<b>{fin ? birr(fin.collected) : '—'}</b></div>
                  <div className={styles.miniStat}>{t('pending')}<b>{fin ? birr(fin.pending) : '—'}</b></div>
                </div>
              </div>
            );
          })}
          {stuBranches.length === 0 && <div className={styles.empty}>{t('noBranchData')}</div>}
        </div>
      </>
    );
  };

  const StudentsTab = () => {
    const stuBranches = activeBranches(students);
    const regBranches = activeBranches(registrations);
    const regForBranch = (code) => regBranches.find((x) => x.branchCode === code);
    const regForClass = (branchCode, className) => {
      const rb = regForBranch(branchCode);
      return rb?.classes?.find((c) => c.className === className);
    };

    const allAdded = (registrations?.byBranch || [])
      .filter((b) => !b.error)
      .flatMap((b) => b.added || []);

    return (
      <>
        <div className={styles.hero}>
          <div className={styles.heroLabel}>{t('totalStudents')}</div>
          <div className={styles.heroValue}>{fmt(students?.grandTotal)}</div>
          <div className={styles.heroSub}>
            {fmt(students?.grandMale)} {t('boys')} · {fmt(students?.grandFemale)} {t('girls')}
          </div>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('newStudents')}</div>
            <div className={styles.statValue}>{fmt(registrations?.grandNew)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('oldStudents')}</div>
            <div className={styles.statValueGold}>{fmt(registrations?.grandOld)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('addedToday')}</div>
            <div className={styles.statValueGold}>{fmt(registrations?.grandAddedToday)}</div>
          </div>
        </div>

        <h3 className={styles.sectionTitle}>{t('addedByDate')}</h3>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('addedByDateTitle')}</div>
          <div className={styles.filterRow}>
            <label>{t('from')}
              <input type="date" value={regFrom} onChange={(e) => setRegFrom(e.target.value)} />
            </label>
            <label>{t('to')}
              <input type="date" value={regTo} onChange={(e) => setRegTo(e.target.value)} />
            </label>
          </div>
          <div className={styles.hero} style={{ marginTop: 12 }}>
            <div className={styles.heroLabel}>{t('studentsAdded')}</div>
            <div className={styles.heroValue}>{fmt(registrations?.grandAdded ?? 0)}</div>
            <div className={styles.heroSub}>
              {fmt(allAdded.filter((s) => s.type === 'new').length)} {t('newStudents')} · {fmt(allAdded.filter((s) => s.type === 'old').length)} {t('oldStudents')}
            </div>
          </div>
          {allAdded.length > 0 && (
            <table className={styles.table} style={{ marginTop: 12 }}>
              <thead>
                <tr><th>{t('student')}</th><th>{t('class')}</th><th>{t('branch')}</th><th>{t('typeWord')}</th></tr>
              </thead>
              <tbody>
                {allAdded.map((s, i) => (
                  <tr key={i}>
                    <td>{s.studentName}</td>
                    <td>{s.className}</td>
                    <td>{s.branchCode}</td>
                    <td><b>{s.type === 'new' ? t('newStudents') : s.type === 'old' ? t('oldStudents') : '—'}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {allAdded.length === 0 && <div className={styles.empty}>{t('noStudentsAdded')}</div>}
        </div>

        <h3 className={styles.sectionTitle}>{t('studentsTitle')}</h3>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('perBranchDetail')}</div>
        </div>

        {stuBranches.map((b) => {
          const filled = (b.classes || []).filter((c) => c.students > 0);
          const rb = regForBranch(b.branchCode);
          return (
          <div key={b.branchCode} className={styles.card}>
            <div className={styles.cardTitle}>
              {b.branchName} ({b.branchCode}) — {fmt(b.total)} {t('students.title')} · {t('newStudents')} {fmt(rb?.newCount ?? 0)} / {t('oldStudents')} {fmt(rb?.oldCount ?? 0)}
            </div>
            {filled.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr><th>{t('class')}</th><th>{t('newStudents')}</th><th>{t('oldStudents')}</th><th>{t('total')}</th></tr>
              </thead>
              <tbody>
                {filled.map((c) => {
                  const rc = regForClass(b.branchCode, c.className);
                  return (
                  <tr key={c.className}>
                    <td>{c.className}</td>
                    <td>{fmt(rc?.newCount ?? 0)}</td>
                    <td>{fmt(rc?.oldCount ?? 0)}</td>
                    <td><b>{fmt(c.students)}</b></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            ) : (
              <div className={styles.empty}>{t('noClasses')}</div>
            )}
          </div>
          );
        })}
        {stuBranches.length === 0 && <div className={styles.empty}>{t('noBranchData')}</div>}
      </>
    );
  };

  const AttendanceTab = () => {
    const a = attendance;
    const ringStyle = {
      background: `conic-gradient(#8b1a1a ${a?.grandRate || 0}%, ${dark ? '#3a2924' : '#f2e9e3'} ${a?.grandRate || 0}% 100%)`
    };
    const maxTotal = Math.max(1, ...(a?.byBranch || []).filter((b) => !b.error).map((b) => b.total || 0));

    return (
      <>
        {/* View Mode Segment Switcher */}
        <div className={styles.viewSegment}>
          <button
            type="button"
            className={`${styles.viewSegmentBtn} ${attViewMode === 'month' ? styles.viewSegmentBtnActive : ''}`}
            onClick={() => setAttViewMode('month')}
          >
            📅 Monthly View
          </button>
          <button
            type="button"
            className={`${styles.viewSegmentBtn} ${attViewMode === 'week' ? styles.viewSegmentBtnActive : ''}`}
            onClick={() => setAttViewMode('week')}
          >
            📆 Weekly View
          </button>
          <button
            type="button"
            className={`${styles.viewSegmentBtn} ${attViewMode === 'date' ? styles.viewSegmentBtnActive : ''}`}
            onClick={() => setAttViewMode('date')}
          >
            📌 Daily (By Date) View
          </button>
        </div>

        {/* Filter Controls based on View Mode */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            {attViewMode === 'month' && '📅 Filter by Ethiopian Month'}
            {attViewMode === 'week' && '📆 Filter by Ethiopian Week'}
            {attViewMode === 'date' && '📌 Filter by Ethiopian Date'}
          </div>
          <div className={styles.filterRow}>
            <label>{t('year')}
              <input type="number" placeholder="2019" value={attYear} onChange={(e) => setAttYear(e.target.value)} />
            </label>
            <label>{t('month')}
              <select value={attMonth} onChange={(e) => setAttMonth(e.target.value)}>
                <option value="">{t('allMonths')}</option>
                {ETH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            {attViewMode === 'week' && (
              <label>Week Number
                <select value={attWeek} onChange={(e) => setAttWeek(e.target.value)}>
                  <option value="1">Week 1</option>
                  <option value="2">Week 2</option>
                  <option value="3">Week 3</option>
                  <option value="4">Week 4</option>
                  <option value="5">Week 5</option>
                </select>
              </label>
            )}
            {attViewMode === 'date' && (
              <label>Day (1 - 30)
                <input
                  type="number"
                  min="1"
                  max="30"
                  placeholder="e.g. 5"
                  value={attDay}
                  onChange={(e) => setAttDay(e.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        {/* Overall Ring & KPI Stats */}
        <div className={styles.card}>
          <div className={styles.ringWrap}>
            <div className={styles.ring} style={ringStyle}>
              <div className={styles.ringInner}>{a?.grandRate ?? 0}%</div>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendRow}><span className={`${styles.dot} ${styles.dotGreen}`} /> {t('present')} <b>{fmt(a?.grandPresent)}</b></div>
              <div className={styles.legendRow}><span className={`${styles.dot} ${styles.dotGold}`} /> {t('late')} <b>{fmt(a?.grandLate)}</b></div>
              <div className={styles.legendRow}><span className={`${styles.dot} ${styles.dotRed}`} /> {t('absent')} <b>{fmt(a?.grandAbsent)}</b></div>
              <div className={styles.legendRow}><span className={`${styles.dot} ${styles.dotBlue}`} /> Permission / Leave <b>{fmt(a?.grandPermission)}</b></div>
              <div className={styles.legendRow}>{t('total')} {t('records')} <b>{fmt(a?.grandTotal)}</b></div>
            </div>
          </div>
        </div>

        {/* Branch Detailed Breakdown */}
        <h3 className={styles.sectionTitle}>{t('byBranch')}</h3>
        {activeBranches(a).map((b) => {
          const filled = (b.classes || []).filter((c) => (c.total || 0) > 0);
          const activeLeaderboard = (b.leaderboards && b.leaderboards[
            attLeaderboardTab === 'absent' ? 'mostAbsent' :
            attLeaderboardTab === 'present' ? 'mostPresent' :
            attLeaderboardTab === 'late' ? 'mostLate' : 'mostPermission'
          ]) || [];

          return (
            <div key={b.branchCode} className={styles.card}>
              <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span>{b.branchName} — <span style={{ color: '#107c41' }}>{b.rate}% Attendance Rate</span></span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                  {fmt(b.total)} Records (P: {fmt(b.present)} · L: {fmt(b.late)} · A: {fmt(b.absent)} · Perm: {fmt(b.permission)})
                </span>
              </div>

              <div className={styles.barRow}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(b.total / maxTotal) * 100}%` }} />
                </div>
              </div>

              {/* Attendance Leaderboards Section */}
              <div style={{ marginTop: 14, marginBottom: 12, padding: '12px 14px', background: 'var(--inputBg)', borderRadius: 10, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🏆 Student Leaderboards ({attViewMode.toUpperCase()} VIEW)
                  </span>
                  <div className={styles.pillTabRow} style={{ margin: 0 }}>
                    <button
                      type="button"
                      className={`${styles.pillTabBtn} ${attLeaderboardTab === 'absent' ? styles.pillTabBtnActive : ''}`}
                      onClick={() => setAttLeaderboardTab('absent')}
                    >
                      🔴 Most Absent
                    </button>
                    <button
                      type="button"
                      className={`${styles.pillTabBtn} ${attLeaderboardTab === 'present' ? styles.pillTabBtnActive : ''}`}
                      onClick={() => setAttLeaderboardTab('present')}
                    >
                      🟢 Most Present
                    </button>
                    <button
                      type="button"
                      className={`${styles.pillTabBtn} ${attLeaderboardTab === 'late' ? styles.pillTabBtnActive : ''}`}
                      onClick={() => setAttLeaderboardTab('late')}
                    >
                      🟡 Most Late
                    </button>
                    <button
                      type="button"
                      className={`${styles.pillTabBtn} ${attLeaderboardTab === 'permission' ? styles.pillTabBtnActive : ''}`}
                      onClick={() => setAttLeaderboardTab('permission')}
                    >
                      🔵 Permission / Leave
                    </button>
                  </div>
                </div>

                {activeLeaderboard.length > 0 ? (
                  <div className={styles.tableScroll}>
                    <table className={styles.tableDetailed}>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Student Name</th>
                          <th>Class</th>
                          <th>
                            {attLeaderboardTab === 'absent' && 'Days Absent'}
                            {attLeaderboardTab === 'present' && 'Days Present'}
                            {attLeaderboardTab === 'late' && 'Times Late'}
                            {attLeaderboardTab === 'permission' && 'Leaves / Permissions'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeLeaderboard.map((s, idx) => (
                          <tr key={idx}>
                            <td style={{ color: 'var(--muted)', fontWeight: 600 }}>#{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                            <td><span className={`${styles.badgePill} ${styles.badgeOld}`}>{s.class_name}</span></td>
                            <td>
                              <b style={{
                                color: attLeaderboardTab === 'absent' ? '#b21e23' :
                                       attLeaderboardTab === 'present' ? '#107c41' :
                                       attLeaderboardTab === 'late' ? '#b8860b' : '#2563eb'
                              }}>
                                {s.count}
                              </b>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '6px 0' }}>
                    No records found for this category in the selected timeframe.
                  </div>
                )}
              </div>

              {/* Class by Class Breakdown Table */}
              <div style={{ fontWeight: 700, fontSize: 12.5, margin: '10px 0 6px 0' }}>
                📊 Class-by-Class Attendance Summary
              </div>
              {filled.length > 0 ? (
                <div className={styles.tableScroll}>
                  <table className={styles.tableDetailed}>
                    <thead>
                      <tr>
                        <th>{t('class')}</th>
                        <th>{t('present')}</th>
                        <th>{t('late')}</th>
                        <th>{t('absent')}</th>
                        <th>Permission</th>
                        <th>{t('total')}</th>
                        <th>{t('rate')} (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filled.map((c) => (
                        <tr key={c.className}>
                          <td><b>{c.className}</b></td>
                          <td style={{ color: '#107c41', fontWeight: 600 }}>{fmt(c.present)}</td>
                          <td style={{ color: '#b8860b', fontWeight: 600 }}>{fmt(c.late)}</td>
                          <td style={{ color: '#b21e23', fontWeight: 600 }}>{fmt(c.absent)}</td>
                          <td style={{ color: '#2563eb', fontWeight: 600 }}>{fmt(c.permission)}</td>
                          <td><b>{fmt(c.total)}</b></td>
                          <td>
                            <span className={`${styles.badgePill} ${c.rate >= 80 ? styles.badgeOld : styles.badgeRed}`}>
                              {c.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.empty}>{t('noAttendance')}</div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const MarksTab = () => {
    const m = marks;
    const filteredBranches = (m?.byBranch || []).filter(b => !b.error);

    return (
      <>
        {/* Term & Search Filter Card */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>🎯 Marks & Academic Performance Filter</div>
          <div className={styles.filterRow}>
            <label>{t('term')}
              <select value={mkTerm} onChange={(e) => setMkTerm(e.target.value)}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                {String(branch || '').toUpperCase().includes('BILAL') && <option value="3">Term 3</option>}
                {String(branch || '').toUpperCase().includes('BILAL') && <option value="4">Term 4</option>}
              </select>
            </label>
            <label>Search Class or Student
              <input
                type="text"
                placeholder="Search e.g. G7, Abdirahman..."
                value={marksSearch}
                onChange={(e) => setMarksSearch(e.target.value)}
              />
            </label>
            <label>Filter by Class
              <select value={marksClassFilter} onChange={(e) => setMarksClassFilter(e.target.value)}>
                <option value="ALL">All Classes</option>
                {Array.from(new Set(
                  filteredBranches.flatMap(b => (b.classes || []).map(c => c.className).filter(Boolean))
                )).sort().map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Grand KPIs */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Graded Students</div>
            <div className={styles.statValue}>{fmt(m?.grandGradedStudents || 0)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Recorded Subjects</div>
            <div className={styles.statValueGold}>{fmt(m?.grandSubjectsCount || 0)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Overall Average Score</div>
            <div className={styles.statValue} style={{ color: '#107c41' }}>
              {m?.grandAvgScore ? `${m.grandAvgScore}` : '0.0'}
            </div>
          </div>
        </div>

        {/* Branch & Class Top Scorers */}
        <h3 className={styles.sectionTitle}>🏆 Top Performing Students ("Big Mark") by Class & Branch</h3>

        {filteredBranches.map(b => {
          let classesList = (b.classes || []);
          if (marksClassFilter !== 'ALL') {
            classesList = classesList.filter(c => (c.className || '').toUpperCase() === marksClassFilter.toUpperCase());
          }
          if (marksSearch) {
            const q = marksSearch.toLowerCase();
            classesList = classesList.filter(c => {
              const matchClass = (c.className || '').toLowerCase().includes(q);
              const matchStudent = (c.bigMarkStudents || c.topStudents || []).some(s => ((s.studentName || s.name || '')).toLowerCase().includes(q));
              return matchClass || matchStudent;
            });
          }

          return (
            <div key={b.branchCode} className={styles.card}>
              <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span>{b.branchName} — Term {m?.term || mkTerm}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                  {b.gradedStudents || b.totalGradedStudents || 0} Graded Students · {b.subjectsCount || 0} Subjects · Branch Avg: <b>{b.avgScore || b.avgPct || 0}</b>
                </span>
              </div>

              {classesList.length > 0 ? (
                classesList.map(c => {
                  const subjectList = c.subjectTopScorers || c.topBySubject || [];
                  return (
                    <div key={c.className} style={{ marginTop: 14, marginBottom: 14, padding: '14px', background: 'var(--inputBg)', borderRadius: 10, border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          🏫 Class {c.className}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`${styles.badgePill} ${styles.badgeOld}`}>{c.studentCount || c.totalGradedStudents || 0} Students</span>
                          <span className={`${styles.badgePill} ${styles.badgeNew}`}>{c.subjectCount || c.subjectsCount || 0} Subjects</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#107c41' }}>Class Avg: {c.classAvgScore || c.avgScore || 0}</span>
                          {c.highestTotalMark !== undefined && (
                            <span className={`${styles.badgePill} ${styles.badgeNew}`} style={{ background: '#dcfce7', color: '#15803d' }}>
                              🏆 High Mark: {c.highestTotalMark} pts
                            </span>
                          )}
                          {c.lowestTotalMark !== undefined && (
                            <span className={`${styles.badgePill} ${styles.badgeRed}`} style={{ background: '#fee2e2', color: '#991b1b' }}>
                              🔻 Low Mark: {c.lowestTotalMark} pts
                            </span>
                          )}
                        </div>
                      </div>

                      {/* High vs Low Rank Toggle */}
                      <div className={styles.pillTabRow} style={{ margin: '8px 0 10px 0' }}>
                        <button
                          type="button"
                          className={`${styles.pillTabBtn} ${marksRankView === 'highest' ? styles.pillTabBtnActive : ''}`}
                          onClick={() => setMarksRankView('highest')}
                        >
                          🏆 Highest Rank ("Big Mark" Students)
                        </button>
                        <button
                          type="button"
                          className={`${styles.pillTabBtn} ${marksRankView === 'lowest' ? styles.pillTabBtnActive : ''}`}
                          onClick={() => setMarksRankView('lowest')}
                        >
                          🔻 Lowest Rank ("Lowest Mark" Students)
                        </button>
                      </div>

                      {(() => {
                        const displayStudents = marksRankView === 'highest'
                          ? (c.bigMarkStudents || c.topStudents || [])
                          : (c.lowestStudents || []);

                        return displayStudents && displayStudents.length > 0 ? (
                          <div className={styles.tableScroll}>
                            <table className={styles.tableDetailed}>
                              <thead>
                                <tr>
                                  <th style={{ width: 40 }}>Rank</th>
                                  <th>Student Name</th>
                                  <th>Total Score</th>
                                  <th>Average</th>
                                  <th>Subject Scores Breakdown</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayStudents.map((st, stIdx) => {
                                  const sName = st.studentName || st.name || 'Student';
                                  const subjectsArr = Array.isArray(st.subjects)
                                    ? st.subjects
                                    : Object.entries(st.subjects || {}).map(([subject, score]) => ({ subject, score }));

                                  return (
                                    <tr key={st.rank ? `${st.rank}-${stIdx}` : stIdx}>
                                      <td>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: 24,
                                          height: 24,
                                          borderRadius: '50%',
                                          fontWeight: 700,
                                          fontSize: 11,
                                          background: st.rank === 1 ? '#ffd700' : st.rank === 2 ? '#c0c0c0' : st.rank === 3 ? '#cd7f32' : 'var(--card)',
                                          color: st.rank <= 3 ? '#000' : 'var(--text)'
                                        }}>
                                          {st.rank || (stIdx + 1)}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 600 }}>{sName}</td>
                                      <td><b style={{ color: '#107c41' }}>{fmt(st.totalScore || 0)}</b></td>
                                      <td><b>{st.avgScore || 0}</b></td>
                                      <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 650 }}>
                                          {subjectsArr.map((sub, sIdx) => (
                                            <span
                                              key={sIdx}
                                              className={`${styles.subjectBadge} ${Number(sub.score) >= 90 ? styles.subjectBadgeHigh : ''}`}
                                              title={`${sub.subject}: ${sub.score}`}
                                            >
                                              <b>{sub.subject}:</b> {sub.score}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '6px 0' }}>
                            No ranked students found for this view.
                          </div>
                        );
                      })()}

                      {/* Subject Top Scorers */}
                      {subjectList.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                            📚 Highest Scorer by Subject
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                            {subjectList.map((sub, subIdx) => {
                              const top = (sub.topStudents || [])[0];
                              return (
                                <div key={subIdx} style={{
                                  padding: '8px 10px',
                                  background: 'var(--card)',
                                  border: '1px solid var(--line)',
                                  borderRadius: 8,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                                      {sub.subject}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                                      {top?.studentName || top?.name || '—'}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#107c41' }}>
                                    {top?.score !== undefined ? top.score : (top?.total !== undefined ? top.total : '—')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.empty}>No class mark sheets found matching the current filter.</div>
              )}
            </div>
          );
        })}
        {filteredBranches.length === 0 && <div className={styles.empty}>{t('noBranchData')}</div>}
      </>
    );
  };

  const FaultsTab = () => {
    const f = faults;
    const maxTotal = Math.max(1, ...(f?.byBranch || []).filter((b) => !b.error).map((b) => b.total));
    return (
      <>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('filterEthDate')}</div>
          <div className={styles.filterRow}>
            <label>{t('year')}
              <input type="number" placeholder="2018" value={faultYear} onChange={(e) => setFaultYear(e.target.value)} />
            </label>
            <label>{t('month')}
              <select value={faultMonth} onChange={(e) => setFaultMonth(e.target.value)}>
                <option value="">{t('allMonths')}</option>
                {ETH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className={styles.hero}>
          <div className={styles.heroLabel}>{t('faultsCount')}</div>
          <div className={styles.heroValue}>{fmt(f?.grandTotal)}</div>
        </div>

        <h3 className={styles.sectionTitle}>{t('byBranch')}</h3>
        {activeBranches(f).map((b) => (
          <div key={b.branchCode} className={styles.card}>
            <div className={styles.cardTitle}>{b.branchName} — {fmt(b.total)} {t('faults')}</div>
            <div className={styles.barRow}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${(b.total / maxTotal) * 100}%` }} />
              </div>
            </div>
            {b.classes.length > 0 && (
              <table className={styles.table}>
                <thead><tr><th>{t('class')}</th><th>{t('faults')}</th></tr></thead>
                <tbody>
                  {b.classes.map((c) => (
                    <tr key={c.className}><td>{c.className}</td><td><b>{fmt(c.faults)}</b></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {b.classes.length === 0 && <div className={styles.empty}>{t('noFaults')}</div>}
          </div>
        ))}
      </>
    );
  };

  const FinanceTab = () => {
    const f = finance;
    const byClass = f?.byClass || [];
    const maxExpected = Math.max(1, ...byClass.map((c) => c.expected || 0));
    const rate = f?.grandExpected > 0 ? Math.round((f.grandCollected / f.grandExpected) * 100) : 0;
    const branchesList = activeBranches(f);

    // Collect all locked month prepayments
    const allLockedPayments = [];
    branchesList.forEach(b => {
      (b.lockedMonthPayments || []).forEach(p => allLockedPayments.push(p));
    });

    // Unassigned students filter
    const unassignedList = f?.unassignedStudents || [];
    const filteredUnassigned = unassignedList.filter(s => {
      if (!unassignedSearch) return true;
      const q = unassignedSearch.toLowerCase();
      return (s.studentName || '').toLowerCase().includes(q) ||
             (s.class || '').toLowerCase().includes(q) ||
             (s.branch || '').toLowerCase().includes(q);
    });

    // Unpaid students filter & pagination
    const unpaidList = f?.unpaidStudents || [];
    const filteredUnpaid = unpaidList.filter(s => {
      if (unpaidBranchFilter !== 'ALL' && s.branch !== unpaidBranchFilter) return false;
      if (unpaidMonthsFilter !== 'ALL') {
        if (unpaidMonthsFilter === '>1') {
          if ((s.unpaidMonthsCount || 0) <= 1) return false;
        } else if (String(s.unpaidMonthsCount) !== String(unpaidMonthsFilter)) {
          return false;
        }
      }
      if (unpaidSearch) {
        const q = unpaidSearch.toLowerCase();
        const matchName = (s.studentName || '').toLowerCase().includes(q);
        const matchClass = (s.class || '').toLowerCase().includes(q);
        if (!matchName && !matchClass) return false;
      }
      return true;
    });

    const unpaidPageSize = 15;
    const unpaidTotalPages = Math.max(1, Math.ceil(filteredUnpaid.length / unpaidPageSize));
    const currentUnpaidPage = Math.min(unpaidPage, unpaidTotalPages);
    const pagedUnpaid = filteredUnpaid.slice((currentUnpaidPage - 1) * unpaidPageSize, currentUnpaidPage * unpaidPageSize);

    return (
      <>
        {/* Action Header Card with Download Button & Live Badge */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div className={styles.liveBadge}>
              <span className={styles.liveDot} />
              {t('liveAudit')} · {f?.academicYear || '2019 E.C.'} ({f?.currentEthMonthName || 'Tikimt'})
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <button
            className={styles.downloadPdfBtn}
            onClick={handleDownloadPdf}
            disabled={pdfGenerating || !f}
          >
            <FiDownload style={{ fontSize: 18 }} />
            {pdfGenerating ? t('generatingPdf') : t('downloadPdfReport')}
          </button>

          <div className={styles.filterRow} style={{ marginTop: 6 }}>
            <label>{t('month')}
              <select value={finMonth} onChange={(e) => setFinMonth(e.target.value)}>
                <option value="">{t('allMonths')}</option>
                {ETH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Hero Card */}
        <div className={styles.hero}>
          <div className={styles.heroLabel}>{t('collectedToday')}</div>
          <div className={styles.heroValue}>{fmt(f?.grandCollectedToday)} <span style={{ fontSize: 18 }}>Birr</span></div>
          <div className={styles.heroSub}>
            {t('collected')} {birr(f?.grandCollected)} · {rate}% {t('ofExpected')} {birr(f?.grandExpected)} · {birr(f?.grandPendingUnlocked || f?.grandPending)} {t('pending')}
          </div>
        </div>

        {/* Executive KPI Stats Grid */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('totalStudents')}</div>
            <div className={styles.statValue}>{fmt(f?.grandStudents)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              <span className={`${styles.badgePill} ${styles.badgeOld}`}>{fmt(f?.grandOld)} {t('oldStudents')}</span>{' '}
              <span className={`${styles.badgePill} ${styles.badgeNew}`}>{fmt(f?.grandNew)} {t('newStudents')}</span>{' '}
              {f?.grandUnassigned > 0 && <span className={`${styles.badgePill} ${styles.badgeUnassigned}`}>{fmt(f?.grandUnassigned)} {t('unassigned')}</span>}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('freeStudents')}</div>
            <div className={styles.statValue}>{fmt(f?.grandFreeStudents)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {fmt(f?.grandPayingStudents)} {t('paying')}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('unpaidDue')}</div>
            <div className={styles.statValueRed}>{fmt(f?.grandUnpaidUnlocked)} <small style={{ fontSize: 13 }}>students</small></div>
            <div style={{ fontSize: 11, color: '#b21e23', fontWeight: 700, marginTop: 4 }}>
              {birr(f?.grandPendingUnlocked || f?.grandPending)}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t('advancePaymentsTitle')}</div>
            <div className={styles.statValueGold}>{fmt(f?.grandAdvance)} <small style={{ fontSize: 13 }}>Birr</small></div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {allLockedPayments.length} payments recorded
            </div>
          </div>
        </div>

        {/* Month-by-Month Expected vs Collected Performance */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('monthPerformance')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginTop: 10 }}>
            <div style={{ background: 'var(--inputBg)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#8b1a1a', marginBottom: 8 }}>Month 1 · Meskerem (Tuition + Reg)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Expected:</span>
                <b>{birr(f?.grandM1Expected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Collected:</span>
                <b style={{ color: '#15803d' }}>{birr(f?.grandM1Collected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Collection Rate:</span>
                <span className={`${styles.badgePill} ${styles.badgeGreen}`}>
                  {f?.grandM1Expected > 0 ? Math.round((f.grandM1Collected / f.grandM1Expected) * 100) : 0}%
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--inputBg)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#8b1a1a', marginBottom: 8 }}>Month 2 · Tikimt (Monthly Tuition)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Expected:</span>
                <b>{birr(f?.grandM2Expected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Collected:</span>
                <b style={{ color: '#15803d' }}>{birr(f?.grandM2Collected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Collection Rate:</span>
                <span className={`${styles.badgePill} ${styles.badgeGreen}`}>
                  {f?.grandM2Expected > 0 ? Math.round((f.grandM2Collected / f.grandM2Expected) * 100) : 0}%
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--inputBg)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>Total Unlocked Months (M1 + M2)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Total Expected:</span>
                <b>{birr(f?.grandExpectedUnlocked || f?.grandExpected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>Total Collected:</span>
                <b style={{ color: '#15803d' }}>{birr(f?.grandCollectedUnlocked || f?.grandCollected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Outstanding Due:</span>
                <b style={{ color: '#b91c1c' }}>{birr(f?.grandPendingUnlocked || f?.grandPending)}</b>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
            ℹ️ {t('unlockedNote')}
          </div>
        </div>

        {/* Standard Fee Schedule Card */}
        {f?.feeSchedule && f.feeSchedule.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{t('standardFeeSchedule')}</div>
            <div className={styles.tableScroll}>
              <table className={styles.tableDetailed}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Classes</th>
                    <th>{t('monthlyFee')}</th>
                    <th>Old Reg</th>
                    <th>New Reg</th>
                    <th>M1 Total (Old)</th>
                    <th>M1 Total (New)</th>
                  </tr>
                </thead>
                <tbody>
                  {f.feeSchedule.map((fs, idx) => (
                    <tr key={idx}>
                      <td>{fs.category}</td>
                      <td>{fs.classes}</td>
                      <td><b>{fmt(fs.monthlyFee)} Birr</b></td>
                      <td>{fmt(fs.oldRegFee)} Birr</td>
                      <td>{fmt(fs.newRegFee)} Birr</td>
                      <td><span className={`${styles.badgePill} ${styles.badgeOld}`}>{fmt(fs.m1Old)} Birr</span></td>
                      <td><span className={`${styles.badgePill} ${styles.badgeNew}`}>{fmt(fs.m1New)} Birr</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Class-by-Class Breakdown per Branch */}
        <h3 className={styles.sectionTitle}>{t('byBranch')}</h3>
        {branchesList.map((b) => {
          const filled = (b.classes || []).filter((c) => (c.totalStudents || c.students) > 0);
          const totalM1 = filled.reduce((acc, c) => acc + (c.m1PaidCount || 0), 0);
          const totalM2 = filled.reduce((acc, c) => acc + (c.m2PaidCount || 0), 0);

          return (
            <div key={b.branchCode} className={styles.card}>
              <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span>{b.branchName || b.branchCode}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {fmt(b.totalStudents)} {t('studentsCount')} · {t('collected')} <b style={{ color: '#107c41' }}>{birr(b.collected)}</b>
                </span>
              </div>

              <div style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`${styles.badgePill} ${styles.badgeOld}`}>{fmt(b.oldStudents)} {t('oldStudents')}</span>
                <span className={`${styles.badgePill} ${styles.badgeNew}`}>{fmt(b.newStudents)} {t('newStudents')}</span>
                {b.unassignedStudents > 0 && <span className={`${styles.badgePill} ${styles.badgeUnassigned}`}>{fmt(b.unassignedStudents)} {t('unassigned')}</span>}
                <span>· {fmt(b.freeStudents)} {t('freeStudents')}</span>
                <span>· <b style={{ color: '#b21e23' }}>{fmt(b.unpaidUnlocked)} {t('unpaidDue')}</b></span>
                {b.advanceCollected > 0 && <span>· <b style={{ color: '#c96a0a' }}>{fmt(b.advanceCollected)} Birr advance</b></span>}
              </div>

              {filled.length > 0 ? (
                <div className={styles.tableScroll}>
                  <table className={styles.tableDetailed}>
                    <thead>
                      <tr>
                        <th>{t('class')}</th>
                        <th>{t('total')}</th>
                        <th>{t('oldStudents')}</th>
                        <th>{t('newStudents')}</th>
                        <th>Free</th>
                        <th>Paying</th>
                        <th>{t('monthlyFee')}</th>
                        <th>{t('regFee')} (O/N)</th>
                        <th>{t('m1Paid')}</th>
                        <th>M1 Exp / Col</th>
                        <th>{t('m2Paid')}</th>
                        <th>M2 Exp / Col</th>
                        <th>{t('unpaidDue')}</th>
                        <th>Total Exp</th>
                        <th>Total Col</th>
                        <th>Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filled.map((c) => (
                        <tr key={c.className}>
                          <td>{c.className}</td>
                          <td><b>{fmt(c.totalStudents || c.students)}</b></td>
                          <td>{fmt(c.oldStudents)}</td>
                          <td>{fmt(c.newStudents)}</td>
                          <td>{c.freeStudents > 0 ? <span className={`${styles.badgePill} ${styles.badgeGreen}`}>{c.freeStudents}</span> : '0'}</td>
                          <td>{fmt(c.payingStudents)}</td>
                          <td>{fmt(c.monthlyFee)}</td>
                          <td style={{ fontSize: 10.5 }}>{fmt(c.oldRegFee)} / {fmt(c.newRegFee)}</td>
                          <td>{fmt(c.m1PaidCount)}</td>
                          <td style={{ fontSize: 10.5 }}>
                            <span style={{ color: 'var(--muted)' }}>{fmt(c.m1Expected)}</span> / <b style={{ color: '#15803d' }}>{fmt(c.m1Collected)}</b>
                          </td>
                          <td>{fmt(c.m2PaidCount)}</td>
                          <td style={{ fontSize: 10.5 }}>
                            <span style={{ color: 'var(--muted)' }}>{fmt(c.m2Expected)}</span> / <b style={{ color: '#15803d' }}>{fmt(c.m2Collected)}</b>
                          </td>
                          <td>
                            {c.unpaidUnlockedCount > 0 ? (
                              <span className={`${styles.badgePill} ${styles.badgeRed}`}>{fmt(c.unpaidUnlockedCount)}</span>
                            ) : (
                              <span style={{ color: '#15803d', fontWeight: 600 }}>0</span>
                            )}
                          </td>
                          <td><b>{fmt(c.expectedUnlocked || c.expected)}</b></td>
                          <td><b style={{ color: '#15803d' }}>{fmt(c.collectedUnlocked || c.collected)}</b></td>
                          <td>
                            <span className={`${styles.badgePill} ${styles.badgeNew}`}>
                              {c.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.tableTotalRow}>
                        <td>TOTAL</td>
                        <td>{fmt(b.totalStudents)}</td>
                        <td>{fmt(b.oldStudents)}</td>
                        <td>{fmt(b.newStudents)}</td>
                        <td>{fmt(b.freeStudents)}</td>
                        <td>{fmt(b.payingStudents)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>{fmt(totalM1)}</td>
                        <td style={{ fontSize: 10.5 }}>{fmt(b.m1Expected)} / {fmt(b.m1Collected)}</td>
                        <td>{fmt(totalM2)}</td>
                        <td style={{ fontSize: 10.5 }}>{fmt(b.m2Expected)} / {fmt(b.m2Collected)}</td>
                        <td><span className={`${styles.badgePill} ${styles.badgeRed}`}>{fmt(b.unpaidUnlocked)}</span></td>
                        <td>{fmt(b.expectedUnlocked || b.expected)} Birr</td>
                        <td>{fmt(b.collectedUnlocked || b.collected)} Birr</td>
                        <td>{b.rate}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className={styles.empty}>{t('noInvoices')}</div>
              )}
            </div>
          );
        })}

        {/* Unassigned Students Section (23 Students) */}
        <div className={styles.card}>
          <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>⚠️ {t('unassignedTitle')} ({filteredUnassigned.length})</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
              Total across all branches: {unassignedList.length}
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, background: 'var(--inputBg)', padding: '8px 12px', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
            ℹ️ {t('unassignedDesc')}
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search unassigned student by name, class, or branch..."
              value={unassignedSearch}
              onChange={(e) => setUnassignedSearch(e.target.value)}
            />
          </div>

          {filteredUnassigned.length > 0 ? (
            <div className={styles.tableScroll}>
              <table className={styles.tableDetailed}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>{t('branch')}</th>
                    <th>{t('class')}</th>
                    <th>{t('student')}</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnassigned.map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                      <td><b>{s.branch}</b></td>
                      <td><span className={`${styles.badgePill} ${styles.badgeOld}`}>{s.class}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                      <td>
                        <span className={`${styles.badgePill} ${styles.badgeUnassigned}`}>
                          Classification Required (NULL)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>No unassigned students match your search.</div>
          )}
        </div>

        {/* Unpaid Students Directory (637 Students) */}
        <div className={styles.card}>
          <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>🚨 {t('unpaidDirectoryTitle')} ({filteredUnpaid.length})</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
              Showing {pagedUnpaid.length} of {filteredUnpaid.length} students
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, background: 'var(--inputBg)', padding: '8px 12px', borderRadius: 8, borderLeft: '4px solid #b21e23' }}>
            ℹ️ {t('unpaidDesc')}
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search unpaid student name or class..."
              value={unpaidSearch}
              onChange={(e) => {
                setUnpaidSearch(e.target.value);
                setUnpaidPage(1);
              }}
            />

            <select
              className={styles.searchInput}
              value={unpaidBranchFilter}
              onChange={(e) => {
                setUnpaidBranchFilter(e.target.value);
                setUnpaidPage(1);
              }}
            >
              <option value="ALL">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branchCode} value={b.branchName || b.branchCode}>
                  {b.branchName || b.branchCode}
                </option>
              ))}
            </select>

            <select
              className={styles.searchInput}
              value={unpaidMonthsFilter}
              onChange={(e) => {
                setUnpaidMonthsFilter(e.target.value);
                setUnpaidPage(1);
              }}
            >
              <option value="ALL">All Unpaid (Any Months)</option>
              <option value="1">1 Month Unpaid Only</option>
              <option value="2">2 Months Unpaid Only</option>
              <option value=">1">More Than 1 Month Unpaid (2+ Months)</option>
            </select>
          </div>

          {filteredUnpaid.length > 0 ? (
            <>
              <div className={styles.tableScroll}>
                <table className={styles.tableDetailed}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>{t('branch')}</th>
                      <th>{t('class')}</th>
                      <th>{t('student')}</th>
                      <th>Unpaid Count</th>
                      <th>Unpaid Months</th>
                      <th>Total Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUnpaid.map((s, idx) => {
                      const rowNum = (currentUnpaidPage - 1) * unpaidPageSize + idx + 1;
                      return (
                        <tr key={idx}>
                          <td style={{ color: 'var(--muted)' }}>{rowNum}</td>
                          <td><b>{s.branch}</b></td>
                          <td><span className={`${styles.badgePill} ${styles.badgeOld}`}>{s.class}</span></td>
                          <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                          <td>
                            <span className={`${styles.badgePill} ${styles.badgeRed}`}>
                              {s.unpaidMonthsCount} month{s.unpaidMonthsCount > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ fontSize: 11.5, color: '#b21e23', fontWeight: 500 }}>
                            {(s.unpaidMonths || []).join(', ')}
                          </td>
                          <td>
                            <b style={{ color: '#b21e23' }}>{fmt(s.totalDue)} Birr</b>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className={styles.paginationRow}>
                <button
                  className={styles.pageBtn}
                  disabled={currentUnpaidPage <= 1}
                  onClick={() => setUnpaidPage(p => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span>
                  Page <b>{currentUnpaidPage}</b> of <b>{unpaidTotalPages}</b> ({filteredUnpaid.length} total)
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={currentUnpaidPage >= unpaidTotalPages}
                  onClick={() => setUnpaidPage(p => Math.min(unpaidTotalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <div className={styles.empty}>No unpaid students match your search/filter criteria.</div>
          )}
        </div>

        {/* Advance Payments for Locked Months */}
        {allLockedPayments.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              {t('advancePaymentsTitle')} ({allLockedPayments.length})
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.tableDetailed}>
                <thead>
                  <tr>
                    <th>{t('branch')}</th>
                    <th>{t('class')}</th>
                    <th>{t('student')}</th>
                    <th>{t('month')}</th>
                    <th>Receipt #</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allLockedPayments.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.branch}</td>
                      <td><b>{p.class}</b></td>
                      <td>{p.studentName}</td>
                      <td><span className={`${styles.badgePill} ${styles.badgeNew}`}>{p.monthName || `Month ${p.monthNumber}`}</span></td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                        {(p.receiptNumber && p.receiptNumber !== 'N/A' && String(p.receiptNumber).trim())
                          ? String(p.receiptNumber).trim()
                          : ('RCP-' + String(p.invoiceNumber || idx + 1).padStart(6, '0'))}
                      </td>
                      <td><b style={{ color: '#107c41' }}>{fmt(p.paidAmount)} Birr</b></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.tableTotalRow}>
                    <td colSpan={5}>TOTAL ADVANCE PREPAYMENTS</td>
                    <td>{fmt(f?.grandAdvance)} Birr</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Existing By Class bars */}
        <h3 className={styles.sectionTitle}>{t('byClass')} <small>({t('allBranchesNote')})</small></h3>
        <div className={styles.card}>
          {byClass.length > 0 ? (
            byClass.map((c) => (
              <div key={c.className} className={styles.barRow}>
                <div className={styles.barTop}>
                  <span>{c.className} · {fmt(c.students || c.totalStudents)} {t('studentsCount')}</span>
                  <span>{fmt(c.collected)} / {fmt(c.expected)}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(c.collected / maxExpected) * 100}%`, background: 'linear-gradient(90deg,#f7941e,#ffb04d)' }}
                  />
                </div>
                <div className={styles.barTop} style={{ marginTop: 3 }}>
                  <span style={{ color: 'var(--muted)' }}>{t('pending')} {birr(c.pending)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>{t('noInvoices')}</div>
          )}
        </div>
      </>
    );
  };

  const SettingsTab = () => {
    return (
      <>
        <div className={styles.card}>
          <div className={styles.settingGroup}>
            <h3 className={styles.settingGroupTitle}><FiUser /> {t('account')}</h3>
            {accMsg && <div className={styles.successBox}>{accMsg}</div>}
            {accError && <div className={styles.errorBox}>{accError}</div>}
            <form onSubmit={handleAccountSave}>
              <input
                className={styles.settingsInput}
                type="password"
                placeholder={t('currentPassword')}
                value={accForm.currentPassword}
                onChange={(e) => setAccForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
              />
              <input
                className={styles.settingsInput}
                type="text"
                placeholder={t('newUsername')}
                value={accForm.newUsername}
                onChange={(e) => setAccForm((f) => ({ ...f, newUsername: e.target.value }))}
              />
              <input
                className={styles.settingsInput}
                type="password"
                placeholder={t('newPassword')}
                value={accForm.newPassword}
                onChange={(e) => setAccForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
              <input
                className={styles.settingsInput}
                type="password"
                placeholder={t('confirmPassword')}
                value={accForm.confirmPassword}
                onChange={(e) => setAccForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
              <button type="submit" className={styles.saveBtn} disabled={accLoading}>
                {accLoading ? t('saving') : t('save')}
              </button>
            </form>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.settingGroup}>
            <h3 className={styles.settingGroupTitle}><FiKey /> Branch Admin Accounts (IQRA2 – IQRA5)</h3>
            <div className={styles.toggleDesc} style={{ marginBottom: 10 }}>
              Change the username or password used to log in to each branch admin page.
            </div>
            {branchAdminMsg && <div className={styles.successBox}>{branchAdminMsg}</div>}
            {branchAdminError && <div className={styles.errorBox}>{branchAdminError}</div>}
            {branchAdmins.length === 0 ? (
              <div className={styles.empty}>Loading...</div>
            ) : branchAdmins.map((b) => (
              <div key={b.branchCode} style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {b.branchCode} — {b.branchName} {b.name ? '(' + b.name + ')' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    className={styles.settingsInput}
                    placeholder={'New username (current: ' + (b.username || '—') + ')'}
                    value={(branchAdminForms[b.branchCode] || {}).username || ''}
                    onChange={(e) => setBranchAdminForms((f) => ({ ...f, [b.branchCode]: { ...(f[b.branchCode] || {}), username: e.target.value } }))}
                    style={{ flex: 1, minWidth: 170 }}
                  />
                  <input
                    className={styles.settingsInput}
                    type="password"
                    placeholder="New password"
                    value={(branchAdminForms[b.branchCode] || {}).password || ''}
                    onChange={(e) => setBranchAdminForms((f) => ({ ...f, [b.branchCode]: { ...(f[b.branchCode] || {}), password: e.target.value } }))}
                    style={{ flex: 1, minWidth: 170 }}
                  />
                  <button type="button" className={styles.saveBtn} disabled={branchAdminLoading} onClick={() => handleBranchAdminSave(b.branchCode)}>
                    {branchAdminLoading ? t('saving') : t('save')}
                  </button>
                </div>
                {b.error ? <div className={styles.errorBox} style={{ marginTop: 6 }}>{b.error}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.settingGroup}>
            <h3 className={styles.settingGroupTitle}><FiMessageSquare /> Daily Report Notification</h3>
            <div className={styles.toggleDesc} style={{ marginBottom: 10 }}>
              Sends a daily email with today's totals (students, new registrations, attendance, fees, faults).
            </div>
            {dailyMsg && <div className={styles.successBox}>{dailyMsg}</div>}
            {dailyError && <div className={styles.errorBox}>{dailyError}</div>}
            {!dailySettings ? (
              <div className={styles.empty}>Loading...</div>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={dailySettings.daily_report_enabled !== false}
                    onChange={(e) => saveDailySettings({ daily_report_enabled: e.target.checked })}
                  />
                  Send the daily report automatically
                </label>
                <input
                  className={styles.settingsInput}
                  placeholder="Recipients (comma separated emails)"
                  value={dailySettings.recipients || ''}
                  onChange={(e) => setDailySettings({ ...dailySettings, recipients: e.target.value })}
                />
                <input
                  className={styles.settingsInput}
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Send hour (0-23, server time)"
                  value={dailySettings.send_hour == null ? 8 : dailySettings.send_hour}
                  onChange={(e) => setDailySettings({ ...dailySettings, send_hour: parseInt(e.target.value) || 0 })}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  <button type="button" className={styles.saveBtn} disabled={dailyLoading} onClick={() => saveDailySettings()}>Save</button>
                  <button type="button" className={styles.saveBtn} disabled={dailyLoading} onClick={previewDaily}>Preview today</button>
                  <button type="button" className={styles.saveBtn} disabled={dailyLoading} onClick={sendDailyNow}>Send now</button>
                </div>
                <div className={styles.toggleDesc} style={{ marginTop: 8 }}>
                  Recipients in use: {((dailySettings.resolvedRecipients || []).join(', ')) || 'none — add emails above'}
                </div>
                {dailySummary && (
                  <div className={styles.toggleDesc} style={{ marginTop: 8 }}>
                    Today: {dailySummary.students} students · {dailySummary.newRegistrations} new registrations · attendance {dailySummary.attendanceRate}% · collected {dailySummary.collected} Birr · pending {dailySummary.pending} Birr · faults {dailySummary.faults}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.settingGroup}>
            <h3 className={styles.settingGroupTitle}><FiGlobe /> {t('preferences')}</h3>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{t('language')}</span>
                <div className={styles.toggleDesc}>{t('languageDesc')}</div>
              </div>
            </div>
            <div className={styles.langGrid}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  className={`${styles.langBtn} ${lang === l.code ? styles.langBtnActive : ''}`}
                  onClick={() => setLang(l.code)}
                >
                  {t(l.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingGroup}>
            <h3 className={styles.settingGroupTitle}><FiMoon /> {t('darkMode')}</h3>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{t('darkMode')}</span>
                <div className={styles.toggleDesc}>{t('darkModeDesc')}</div>
              </div>
              <div
                className={`${styles.switch} ${dark ? styles.switchOn : ''}`}
                onClick={() => setDark((d) => !d)}
              >
                <div className={styles.switchKnob} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const tabContent = {
    home: <HomeTab />,
    students: <StudentsTab />,
    attendance: <AttendanceTab />,
    marks: <MarksTab />,
    faults: <FaultsTab />,
    finance: <FinanceTab />,
    sms: <SmsCounter />,
    settings: <SettingsTab />
  };

  const currentBranchName = branch === 'ALL'
    ? t('allBranches')
    : branches.find((b) => b.code === branch)?.name || branch;

  return (
    <div className={styles.wrap}>
      <div className={`${styles.app} ${dark ? styles.appDark : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.logo}>I</div>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>{t('appName')}</h1>
              <p className={styles.subtitle}>{currentBranchName}</p>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title={t('logout')}>
              <FiLogOut size={12} />
            </button>
          </div>
          <BranchSelector />
        </div>

        <div className={styles.content}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {loading && !students ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : (
            tabContent[tab]
          )}
        </div>

        <div className={styles.nav}>
          {visibleTabs.map((tb) => {
            const Icon = tb.icon;
            return (
              <button
                key={tb.key}
                className={`${styles.navItem} ${tab === tb.key ? styles.navItemActive : ''}`}
                onClick={() => setTab(tb.key)}
              >
                <Icon />
                <span>{tb.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
