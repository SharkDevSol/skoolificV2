const nodemailer = require('nodemailer');
const db = require('../config/db');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class GuardianNotificationService {
  constructor() {
    this.isRunning = false;
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('📧 Email transporter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
    }
  }

  // Start the notification service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Guardian notification service is already running');
      return;
    }

    this.isRunning = true;
    console.log('📬 Guardian notification service started');

    // Schedule daily attendance reports (runs at 4:00 PM)
    this.scheduleDailyAttendanceReports();

    // Schedule monthly payment summaries (runs on 1st of each month at 8:00 AM)
    this.scheduleMonthlyPaymentSummaries();
  }

  // Stop the notification service
  stop() {
    if (this.dailyInterval) clearInterval(this.dailyInterval);
    if (this.monthlyInterval) clearInterval(this.monthlyInterval);
    this.isRunning = false;
    console.log('🛑 Guardian notification service stopped');
  }

  // Schedule daily attendance reports
  scheduleDailyAttendanceReports() {
    // Check every minute if it's time to send
    this.dailyInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Send at 4:00 PM (16:00)
      if (hour === 16 && minute === 0) {
        console.log('📊 Sending daily attendance reports...');
        await this.sendDailyAttendanceReports();
      }
    }, 60000); // Check every minute
  }

  // Schedule monthly payment summaries
  scheduleMonthlyPaymentSummaries() {
    // Check every hour if it's the 1st of the month at 8:00 AM
    this.monthlyInterval = setInterval(async () => {
      const now = new Date();
      const day = now.getDate();
      const hour = now.getHours();

      // Send on 1st of month at 8:00 AM
      if (day === 1 && hour === 8) {
        console.log('💰 Sending monthly payment summaries...');
        await this.sendMonthlyPaymentSummaries();
      }
    }, 3600000); // Check every hour
  }

  // Send daily attendance reports to all guardians
  async sendDailyAttendanceReports() {
    try {
      const guardians = await this.getAllGuardiansWithWards();
      
      for (const guardian of guardians) {
        try {
          const attendanceData = await this.getWardAttendanceForToday(guardian.wards);
          await this.sendAttendanceEmail(guardian, attendanceData);
        } catch (error) {
          console.error(`Failed to send attendance report to ${guardian.guardian_name}:`, error.message);
        }
      }
      
      console.log(`✅ Sent attendance reports to ${guardians.length} guardians`);
    } catch (error) {
      console.error('❌ Failed to send daily attendance reports:', error);
    }
  }

  // Send monthly payment summaries to all guardians
  async sendMonthlyPaymentSummaries() {
    try {
      const guardians = await this.getAllGuardiansWithWards();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      for (const guardian of guardians) {
        try {
          const paymentData = await this.getWardPaymentSummary(guardian.wards, lastMonth);
          await this.sendPaymentEmail(guardian, paymentData, lastMonth);
        } catch (error) {
          console.error(`Failed to send payment summary to ${guardian.guardian_name}:`, error.message);
        }
      }
      
      console.log(`✅ Sent payment summaries to ${guardians.length} guardians`);
    } catch (error) {
      console.error('❌ Failed to send monthly payment summaries:', error);
    }
  }

  // Get all guardians with their wards
  async getAllGuardiansWithWards() {
    const tablesResult = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
      ['classes_schema']
    );

    const classes = tablesResult.rows.map(row => row.table_name);
    const guardiansMap = new Map();

    for (const className of classes) {
      try {
        const result = await db.query(`
          SELECT 
            guardian_name,
            guardian_phone,
            guardian_username,
            guardian_relation,
            student_name,
            school_id,
            class_id,
            '${className}' as class
          FROM classes_schema."${className}"
          WHERE guardian_name IS NOT NULL 
            AND guardian_name != ''
            AND (is_active = TRUE OR is_active IS NULL)
        `);

        for (const row of result.rows) {
          const key = row.guardian_username || row.guardian_phone;
          if (!guardiansMap.has(key)) {
            guardiansMap.set(key, {
              guardian_name: row.guardian_name,
              guardian_phone: row.guardian_phone,
              guardian_username: row.guardian_username,
              guardian_relation: row.guardian_relation,
              wards: []
            });
          }
          guardiansMap.get(key).wards.push({
            student_name: row.student_name,
            school_id: row.school_id,
            class_id: row.class_id,
            class: className
          });
        }
      } catch (error) {
        console.warn(`Error fetching guardians from ${className}:`, error.message);
      }
    }

    return Array.from(guardiansMap.values());
  }

  // Get attendance data for wards for today
  async getWardAttendanceForToday(wards) {
    const today = new Date();
    const ethDate = this.gregorianToEthiopian(today);
    const attendanceData = [];

    for (const ward of wards) {
      try {
        const schemaName = `class_${ward.class}_daily_attendance`;
        const result = await db.query(`
          SELECT 
            student_name,
            status,
            check_in_time,
            check_out_time,
            marked_at
          FROM "${schemaName}".attendance
          WHERE school_id = $1 
            AND attendance_date = $2
        `, [ward.school_id, `${ethDate.month}/${ethDate.day}/${ethDate.year}`]);

        attendanceData.push({
          ward: ward.student_name,
          class: ward.class,
          attendance: result.rows[0] || { status: 'Not Marked' }
        });
      } catch (error) {
        console.warn(`Error fetching attendance for ${ward.student_name}:`, error.message);
        attendanceData.push({
          ward: ward.student_name,
          class: ward.class,
          attendance: { status: 'Error' }
        });
      }
    }

    return attendanceData;
  }

  // Get payment summary for wards for a specific month
  async getWardPaymentSummary(wards, month) {
    const paymentData = [];
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    for (const ward of wards) {
      try {
        // Convert school_id and class_id to UUID format
        const studentUuid = this.convertToUuid(ward.school_id, ward.class_id);

        const invoices = await prisma.invoice.findMany({
          where: {
            studentId: studentUuid,
            dueDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            items: true,
            paymentAllocations: {
              include: {
                payment: true
              }
            }
          }
        });

        const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.netAmount), 0);
        const paidAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);
        const balance = totalAmount - paidAmount;

        paymentData.push({
          ward: ward.student_name,
          class: ward.class,
          totalAmount,
          paidAmount,
          balance,
          status: balance === 0 ? 'Paid' : balance < totalAmount ? 'Partially Paid' : 'Unpaid',
          invoices: invoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            amount: parseFloat(inv.netAmount),
            paid: parseFloat(inv.paidAmount),
            status: inv.status,
            dueDate: inv.dueDate
          }))
        });
      } catch (error) {
        console.warn(`Error fetching payment for ${ward.student_name}:`, error.message);
      }
    }

    return paymentData;
  }

  // Send attendance email
  async sendAttendanceEmail(guardian, attendanceData) {
    if (!this.transporter || !guardian.guardian_phone) {
      console.warn(`Cannot send email to ${guardian.guardian_name}: No email configured`);
      return;
    }

    const emailBody = this.generateAttendanceEmailBody(guardian, attendanceData);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: guardian.guardian_phone, // Assuming phone field contains email
      subject: `Daily Attendance Report - ${new Date().toLocaleDateString()}`,
      html: emailBody
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Attendance email sent to ${guardian.guardian_name}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${guardian.guardian_name}:`, error.message);
    }
  }

  // Send payment email
  async sendPaymentEmail(guardian, paymentData, month) {
    if (!this.transporter || !guardian.guardian_phone) {
      console.warn(`Cannot send email to ${guardian.guardian_name}: No email configured`);
      return;
    }

    const emailBody = this.generatePaymentEmailBody(guardian, paymentData, month);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: guardian.guardian_phone,
      subject: `Monthly Payment Summary - ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      html: emailBody
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Payment email sent to ${guardian.guardian_name}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${guardian.guardian_name}:`, error.message);
    }
  }

  // Generate attendance email HTML
  generateAttendanceEmailBody(guardian, attendanceData) {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let rows = '';
    for (const data of attendanceData) {
      const statusColor = data.attendance.status === 'present' ? '#4CAF50' : 
                         data.attendance.status === 'absent' ? '#f44336' : 
                         data.attendance.status === 'late' ? '#FF9800' : '#9E9E9E';
      
      rows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.ward}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.class}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">
              ${data.attendance.status || 'Not Marked'}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.attendance.check_in_time || '-'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.attendance.check_out_time || '-'}</td>
        </tr>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; }
          table { width: 100%; border-collapse: collapse; background: white; margin-top: 20px; }
          th { background: #2196F3; color: white; padding: 12px; text-align: left; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Daily Attendance Report</h2>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Dear ${guardian.guardian_name},</p>
            <p>Here is the attendance summary for your ward(s) today:</p>
            
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <p>This is an automated message from your school management system.</p>
            <p>For any queries, please contact the school administration.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate payment email HTML
  generatePaymentEmailBody(guardian, paymentData, month) {
    const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let rows = '';
    let totalDue = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    for (const data of paymentData) {
      totalDue += data.totalAmount;
      totalPaid += data.paidAmount;
      totalBalance += data.balance;

      const statusColor = data.status === 'Paid' ? '#4CAF50' : 
                         data.status === 'Partially Paid' ? '#FF9800' : '#f44336';
      
      rows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.ward}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.class}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">ETB ${data.totalAmount.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">ETB ${data.paidAmount.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">ETB ${data.balance.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">
              ${data.status}
            </span>
          </td>
        </tr>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; }
          table { width: 100%; border-collapse: collapse; background: white; margin-top: 20px; }
          th { background: #4CAF50; color: white; padding: 12px; text-align: left; }
          .summary { background: #e8f5e9; padding: 15px; margin-top: 20px; border-radius: 8px; }
          .summary-item { display: flex; justify-content: space-between; padding: 8px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 Monthly Payment Summary</h2>
            <p>${monthName}</p>
          </div>
          <div class="content">
            <p>Dear ${guardian.guardian_name},</p>
            <p>Here is the payment summary for your ward(s) for ${monthName}:</p>
            
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Total Due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="summary">
              <h3 style="margin-top: 0;">Overall Summary</h3>
              <div class="summary-item">
                <strong>Total Amount Due:</strong>
                <span>ETB ${totalDue.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <strong>Total Paid:</strong>
                <span style="color: #4CAF50;">ETB ${totalPaid.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <strong>Total Balance:</strong>
                <span style="color: ${totalBalance > 0 ? '#f44336' : '#4CAF50'};">ETB ${totalBalance.toFixed(2)}</span>
              </div>
            </div>

            ${totalBalance > 0 ? `
              <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <strong>⚠️ Payment Reminder:</strong> You have an outstanding balance of ETB ${totalBalance.toFixed(2)}. 
                Please make payment at your earliest convenience to avoid late fees.
              </p>
            ` : `
              <p style="margin-top: 20px; padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                <strong>✅ All Paid:</strong> Thank you for keeping your payments up to date!
              </p>
            `}
          </div>
          <div class="footer">
            <p>This is an automated message from your school management system.</p>
            <p>For payment inquiries, please contact the school finance office.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Convert school_id and class_id to UUID format
  convertToUuid(schoolId, classId) {
    const schoolIdPadded = String(schoolId).padStart(4, '0');
    const classIdPadded = String(classId).padStart(12, '0');
    return `00000000-0000-0000-${schoolIdPadded}-${classIdPadded}`;
  }

  // Convert Gregorian to Ethiopian calendar
  gregorianToEthiopian(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let ethYear = year - 7;
    let ethMonth = month + 4;
    let ethDay = day + 10;

    if (ethMonth > 12) {
      ethMonth -= 12;
      ethYear += 1;
    }

    if (ethDay > 30) {
      ethDay -= 30;
      ethMonth += 1;
      if (ethMonth > 12) {
        ethMonth = 1;
        ethYear += 1;
      }
    }

    return { year: ethYear, month: ethMonth, day: ethDay };
  }
}

module.exports = new GuardianNotificationService();
