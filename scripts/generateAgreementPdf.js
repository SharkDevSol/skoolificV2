const fs = require('fs');
const path = require('path');
const { jsPDF } = require('../APP/node_modules/jspdf');

const letterheadPath = 'C:/Users/hp/.gemini/antigravity/brain/a8468624-58d0-47fd-b695-e2b6c12ce5a7/.user_uploaded/media_1793720116540_2bd61daf.png';
const outputPath = 'C:/Users/hp/.gemini/antigravity/brain/a8468624-58d0-47fd-b695-e2b6c12ce5a7/Skoolific_School_Service_Agreement.pdf';

const imgBase64 = 'data:image/png;base64,' + fs.readFileSync(letterheadPath).toString('base64');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = 210;
const pageHeight = 297;
const leftMargin = 22;
const rightMargin = 188;
const contentWidth = rightMargin - leftMargin; // 166mm

function applyBackground() {
  doc.addImage(imgBase64, 'PNG', 0, 0, pageWidth, pageHeight);
}

// ================= PAGE 1 =================
applyBackground();

let y = 54;

// Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(15, 23, 42); // slate-900
doc.text('MASTER SOFTWARE SERVICE & LICENSE AGREEMENT', pageWidth / 2, y, { align: 'center' });

y += 5;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(37, 99, 235); // royal blue
doc.text('SKOOLIFIC SCHOOL MANAGEMENT SYSTEM (skoolific.com)', pageWidth / 2, y, { align: 'center' });

y += 6;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(51, 65, 85);
const preamble = 'This Agreement is entered into between ONECO Solution ("Provider") and the undersigned Educational Institution ("School") for the provision, continuous technical support, and updates of the Skoolific School Management Platform.';
const splitPreamble = doc.splitTextToSize(preamble, contentWidth);
doc.text(splitPreamble, leftMargin, y);
y += splitPreamble.length * 4 + 2;

// Section 1: Parties
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('1. PARTIES & INSTITUTION DETAILS', leftMargin, y);
y += 4;

// Party boxes
const boxWidth = (contentWidth - 4) / 2;
const boxHeight = 34;

// Provider Box
doc.setDrawColor(203, 213, 225);
doc.setFillColor(248, 250, 252);
doc.roundedRect(leftMargin, y, boxWidth, boxHeight, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text('SERVICE PROVIDER: ONECO SOLUTION', leftMargin + 3, y + 4.5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('Product: Skoolific SMS (skoolific.com)', leftMargin + 3, y + 9);
doc.text('HQ: Dire Dawa, Ethiopia', leftMargin + 3, y + 13);
doc.text('Phone: +251 936 311 768 / +251 980 030 903', leftMargin + 3, y + 17);
doc.text('Email: onecosolutionset@gmail.com', leftMargin + 3, y + 21);
doc.text('Website: oneco.solutions', leftMargin + 3, y + 25);
doc.text('Authorized: Management / Technical Team', leftMargin + 3, y + 29);

// School Box
doc.roundedRect(leftMargin + boxWidth + 4, y, boxWidth, boxHeight, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text('CLIENT (THE SCHOOL):', leftMargin + boxWidth + 7, y + 4.5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('School Name: ____________________________________', leftMargin + boxWidth + 7, y + 9);
doc.text('Branch / Campus: ________________________________', leftMargin + boxWidth + 7, y + 13);
doc.text('Director / Rep: ___________________________________', leftMargin + boxWidth + 7, y + 17);
doc.text('Phone: _________________ Email: __________________', leftMargin + boxWidth + 7, y + 21);
doc.text('Location / City: ___________________________________', leftMargin + boxWidth + 7, y + 25);
doc.text('Selected Plan: [  ] Standard   [  ] Premium   [  ] Custom', leftMargin + boxWidth + 7, y + 29);

y += boxHeight + 5;

// Section 2: Pricing & Payment Model
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('2. PRICING STRUCTURE & ANNUAL PER-STUDENT BILLING', leftMargin, y);
y += 4;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(51, 65, 85);
const pricingP1 = 'The software licensing fee is calculated strictly on an active student headcount per academic year. Biometric attendance hardware is acquired separately as a one-time outright purchase owned fully by the School.';
const splitPricing = doc.splitTextToSize(pricingP1, contentWidth);
doc.text(splitPricing, leftMargin, y);
y += splitPricing.length * 3.5 + 2;

// Pricing Table
const thHeight = 6;
const rowHeight = 7;
const tableY = y;
const col1 = leftMargin;
const col2 = leftMargin + 65;
const col3 = leftMargin + 115;
const col4 = rightMargin;

// Table Header
doc.setFillColor(241, 245, 249);
doc.setDrawColor(203, 213, 225);
doc.rect(col1, tableY, contentWidth, thHeight, 'FD');
doc.setFont('helvetica', 'bold');
doc.setFontSize(7.5);
doc.setTextColor(15, 23, 42);
doc.text('Item & Description', col1 + 3, tableY + 4.2);
doc.text('Unit Rate (ETB)', col2 + 3, tableY + 4.2);
doc.text('Quantity / Baseline', col3 + 3, tableY + 4.2);
doc.text('Total Amount (ETB)', col4 - 3, tableY + 4.2, { align: 'right' });

// Row 1: Software Subscription
doc.rect(col1, tableY + thHeight, contentWidth, rowHeight, 'D');
doc.setFont('helvetica', 'bold');
doc.setFontSize(7.5);
doc.setTextColor(15, 23, 42);
doc.text('Annual Software Subscription', col1 + 3, tableY + thHeight + 4.5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('_________ ETB / student / yr', col2 + 3, tableY + thHeight + 4.5);
doc.text('_________ Active Students', col3 + 3, tableY + thHeight + 4.5);
doc.text('___________________ ETB', col4 - 3, tableY + thHeight + 4.5, { align: 'right' });

// Row 2: Biometric Device
doc.rect(col1, tableY + thHeight + rowHeight, contentWidth, rowHeight, 'D');
doc.setFont('helvetica', 'bold');
doc.setFontSize(7.5);
doc.setTextColor(15, 23, 42);
doc.text('Biometric Attendance Terminal(s)', col1 + 3, tableY + thHeight + rowHeight + 3.2);
doc.setFont('helvetica', 'normal');
doc.setFontSize(6.5);
doc.text('One-time purchase; owned by School', col1 + 3, tableY + thHeight + rowHeight + 5.8);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('_________ ETB / device', col2 + 3, tableY + thHeight + rowHeight + 4.5);
doc.text('_________ Machine(s)', col3 + 3, tableY + thHeight + rowHeight + 4.5);
doc.text('___________________ ETB', col4 - 3, tableY + thHeight + rowHeight + 4.5, { align: 'right' });

// Row 3: Setup & Onboarding
doc.rect(col1, tableY + thHeight + rowHeight * 2, contentWidth, rowHeight, 'D');
doc.setFont('helvetica', 'bold');
doc.setFontSize(7.5);
doc.setTextColor(15, 23, 42);
doc.text('System Setup & Staff Training', col1 + 3, tableY + thHeight + rowHeight * 2 + 4.5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('Included / Complimentary', col2 + 3, tableY + thHeight + rowHeight * 2 + 4.5);
doc.text('Full Administrative Staff', col3 + 3, tableY + thHeight + rowHeight * 2 + 4.5);
doc.text('0.00 ETB', col4 - 3, tableY + thHeight + rowHeight * 2 + 4.5, { align: 'right' });

// Total Row
doc.setFillColor(248, 250, 252);
doc.rect(col1, tableY + thHeight + rowHeight * 3, contentWidth, rowHeight, 'FD');
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text('TOTAL CONTRACT INVESTMENT:', col2 + 3, tableY + thHeight + rowHeight * 3 + 4.8);
doc.text('___________________ ETB', col4 - 3, tableY + thHeight + rowHeight * 3 + 4.8, { align: 'right' });

y = tableY + thHeight + rowHeight * 4 + 4;

// Section 3: Biometric Hardware Terms
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('3. BIOMETRIC HARDWARE PURCHASE & OWNERSHIP', leftMargin, y);
y += 4;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(51, 65, 85);
const bioTerms = [
  '• Outright Ownership: Biometric machines are purchased outright and become the permanent asset of the School upon receipt of payment.',
  '• Hardware Installation: ONECO Solution provides physical setup, network routing, local device pairing, and database synchronization.',
  '• Warranty: Hardware carries a 12-month manufacturer defect warranty. Ongoing software sync & webhook maintenance is covered under support.'
];
for (const b of bioTerms) {
  doc.text(b, leftMargin, y);
  y += 4;
}
y += 2;

// Section 4: Software Scope
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('4. SYSTEM MODULES & SERVICE DELIVERABLES', leftMargin, y);
y += 4;

const modules = [
  '• Student Lifecycle: Digital enrollment, class sections, guardian links, auto student ID cards, promotion, and graduation records.',
  '• Academic & Exams: 2-Term (or 4-Term) grading sheets, continuous assessments, automated ranking, subject breakdowns, printable reports.',
  '• Financial Management: Fee billing, cashier receipts, live pending balances, bank deposit approvals, and multi-branch ledger reports.',
  '• Portals & Multi-User: Dedicated logins for Super Admin, School Admin, Cashiers, Teachers, and Guardians with granular permissions.'
];
for (const m of modules) {
  doc.text(m, leftMargin, y);
  y += 3.8;
}

// Page 1 footer note
doc.setFont('helvetica', 'italic');
doc.setFontSize(7);
doc.setTextColor(100, 116, 139);
doc.text('Page 1 of 2 — Master SaaS Agreement (Skoolific • ONECO Solution) — Continued on Page 2', pageWidth / 2, 260, { align: 'center' });


// ================= PAGE 2 =================
doc.addPage();
applyBackground();

y = 54;

// Section 5: Updates, Roadmaps & Fast-track policy
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('5. SYSTEM UPDATES, FEATURE ROADMAP & FAST-TRACK POLICY', leftMargin, y);
y += 4.5;

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(37, 99, 235);
doc.text('A. Standard Approved System Updates (Included Free of Charge):', leftMargin, y);
y += 3.5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.8);
doc.setTextColor(51, 65, 85);
const pUpdates = 'ONECO Solution commits to continuous platform evolution. Approved general improvements, security patches, government compliance updates, and standard new features developed for Skoolific are deployed every 5 to 6 months to all subscribed schools at NO additional cost.';
const splitUpdates = doc.splitTextToSize(pUpdates, contentWidth);
doc.text(splitUpdates, leftMargin, y);
y += splitUpdates.length * 3.5 + 2;

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(220, 38, 38); // red
doc.text('B. Expedited / Fast-Track Custom Feature Requests:', leftMargin, y);
y += 3.5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.8);
doc.setTextColor(51, 65, 85);
const pFastTrack = 'If the School requests a specialized custom feature, unique workflow modification, or urgent development outside the standard 5-6 month release roadmap, ONECO Solution will prepare a dedicated project quotation. Fast-track custom engineering requires separate written approval and payment of an agreed Fast-Track Development Fee: ________________________ ETB.';
const splitFast = doc.splitTextToSize(pFastTrack, contentWidth);
doc.text(splitFast, leftMargin, y);
y += splitFast.length * 3.5 + 3;

// Section 6: Support & SLA
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('6. CONTINUOUS TECHNICAL SUPPORT & SERVICE LEVEL AGREEMENT (SLA)', leftMargin, y);
y += 4.5;

const supportItems = [
  '• Dedicated Support Lines: Phone & WhatsApp (+251 936 311 768 / +251 980 030 903), Email: onecosolutionset@gmail.com.',
  '• Remote Assistance: Real-time screen-sharing (AnyDesk / TeamViewer) for immediate troubleshooting and staff guidance.',
  '• Incident Response: Critical system disruptions (portal unavailable) responded to within 1-2 hours (target resolution within 6 hours). Standard operational queries answered within the same business day.',
  '• Staff Training & Onboarding: Comprehensive administrator, teacher, and cashier training provided at initial launch.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.8);
doc.setTextColor(51, 65, 85);
for (const s of supportItems) {
  doc.text(s, leftMargin, y);
  y += 3.8;
}
y += 2;

// Section 7: Data Ownership
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('7. DATA OWNERSHIP, SECURITY & PRIVACY', leftMargin, y);
y += 4.5;

const dataText = 'The School retains exclusive 100% legal ownership of all student biodata, attendance logs, academic marks, and financial transaction records. ONECO Solution shall strictly maintain confidentiality and shall never sell, inspect, or transfer School data to third parties. Secure daily cloud backups and SSL encryption are enforced.';
const splitData = doc.splitTextToSize(dataText, contentWidth);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.8);
doc.setTextColor(51, 65, 85);
doc.text(splitData, leftMargin, y);
y += splitData.length * 3.5 + 3;

// Section 8: Term & Payment Schedule
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('8. CONTRACT TERM & PAYMENT SCHEDULE', leftMargin, y);
y += 4.5;

const termsText = [
  '• Contract Duration: Valid for one (1) Academic Year from _____ / _____ / 2026 to _____ / _____ / 2027 (Renewable annually).',
  '• Payment Schedule: 50% advance due upon contract signing and deployment; remaining 50% due within ________ calendar days or upon commencement of Term 2.'
];
for (const t of termsText) {
  doc.text(t, leftMargin, y);
  y += 3.8;
}
y += 4;

// Section 9: Signatures & Stamp
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(15, 23, 42);
doc.text('9. AUTHORIZATION & EXECUTION SIGNATURES', leftMargin, y);
y += 4;

const signBoxWidth = (contentWidth - 6) / 2;
const signBoxHeight = 44;

// Sign Box ONECO
doc.setFillColor(250, 250, 250);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(leftMargin, y, signBoxWidth, signBoxHeight, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text('FOR ONECO SOLUTION (PROVIDER):', leftMargin + 3, y + 4.5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('Representative: ________________________________', leftMargin + 3, y + 9);
doc.text('Title: _________________________________________', leftMargin + 3, y + 13.5);
doc.text('Signature: __________________ Date: ____/____/2026', leftMargin + 3, y + 18);

// Stamp space
doc.setDrawColor(148, 163, 184);
doc.setLineDashPattern([1.5, 1.5], 0);
doc.rect(leftMargin + 3, y + 21, signBoxWidth - 6, 20);
doc.setLineDashPattern([], 0);
doc.setFont('helvetica', 'italic');
doc.setFontSize(7);
doc.setTextColor(148, 163, 184);
doc.text('OFFICIAL ONECO SOLUTION STAMP / SEAL', leftMargin + signBoxWidth / 2, y + 31.5, { align: 'center' });

// Sign Box School
doc.setFillColor(250, 250, 250);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(leftMargin + signBoxWidth + 6, y, signBoxWidth, signBoxHeight, 2, 2, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(15, 23, 42);
doc.text('FOR THE SCHOOL (CLIENT):', leftMargin + signBoxWidth + 9, y + 4.5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(71, 85, 105);
doc.text('Authorized Name: ______________________________', leftMargin + signBoxWidth + 9, y + 9);
doc.text('Official Title: ___________________________________', leftMargin + signBoxWidth + 9, y + 13.5);
doc.text('Signature: __________________ Date: ____/____/2026', leftMargin + signBoxWidth + 9, y + 18);

// Stamp space
doc.setDrawColor(148, 163, 184);
doc.setLineDashPattern([1.5, 1.5], 0);
doc.rect(leftMargin + signBoxWidth + 9, y + 21, signBoxWidth - 6, 20);
doc.setLineDashPattern([], 0);
doc.setFont('helvetica', 'italic');
doc.setFontSize(7);
doc.setTextColor(148, 163, 184);
doc.text('OFFICIAL SCHOOL STAMP / SEAL', leftMargin + signBoxWidth + 9 + (signBoxWidth - 6) / 2, y + 31.5, { align: 'center' });

// Page 2 footer note
doc.setFont('helvetica', 'italic');
doc.setFontSize(7);
doc.setTextColor(100, 116, 139);
doc.text('Page 2 of 2 — Master SaaS Agreement (Skoolific • ONECO Solution) — Legally Binding Execution', pageWidth / 2, 260, { align: 'center' });

// Output
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, pdfBuffer);
console.log('Agreement PDF generated successfully at:', outputPath);
