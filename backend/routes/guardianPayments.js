const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const db = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

/**
 * GET /api/guardian-payments/:guardianUsername
 * Get payment information for all wards of a guardian
 */
router.get('/:guardianUsername', async (req, res) => {
  try {
    const { guardianUsername } = req.params;
    
    // Get all class tables
    const tablesResult = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1', 
      ['classes_schema']
    );
    
    const classes = tablesResult.rows.map(row => row.table_name);
    const wards = [];
    
    // Find all wards for this guardian
    for (const className of classes) {
      try {
        // Check if is_active column exists
        const columnsCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema' 
            AND table_name = $1 
            AND column_name = 'is_active'
        `, [className]);
        
        const hasIsActive = columnsCheck.rows.length > 0;
        
        // Build query with conditional is_active filter
        const whereClause = hasIsActive 
          ? `WHERE guardian_username = $1 AND (is_active = TRUE OR is_active IS NULL)`
          : `WHERE guardian_username = $1`;
        
        const result = await db.query(`
          SELECT 
            id,
            student_name,
            school_id,
            class_id,
            class
          FROM classes_schema."${className}"
          ${whereClause}
        `, [guardianUsername]);
        
        wards.push(...result.rows.map(row => ({
          ...row,
          class: row.class || className
        })));
      } catch (err) {
        console.warn(`Error fetching from ${className}:`, err.message);
      }
    }
    
    if (wards.length === 0) {
      return res.json({
        success: true,
        data: {
          wards: [],
          payments: [],
          unpaidCount: 0
        }
      });
    }
    
    // Get payment data for each ward
    const paymentData = [];
    let totalUnpaidCount = 0;
    
    for (const ward of wards) {
      // Convert school_id and id to UUID format used in invoices
      // Format: 00000000-0000-0000-00XX-0000000000YY where XX is school_id and YY is id
      const schoolIdNum = parseInt(ward.school_id);
      const idNum = parseInt(ward.id);
      const studentId = `00000000-0000-0000-${String(schoolIdNum).padStart(4, '0')}-${String(idNum).padStart(12, '0')}`;
      
      console.log(`Processing ward: ${ward.student_name}, studentId: ${studentId}`);
      
      // Get all invoices for this student
      const invoices = await prisma.invoice.findMany({
        where: {
          studentId: studentId
        },
        include: {
          items: true,
          paymentAllocations: {
            include: {
              payment: true
            }
          }
        },
        orderBy: {
          issueDate: 'desc'
        }
      });
      
      console.log(`Found ${invoices.length} invoices for ${ward.student_name}`);
      
      // Get current Ethiopian month to filter unlocked invoices
      const now = new Date();
      const ethiopianYear = now.getFullYear() - 7; // Approximate Ethiopian year
      const gregorianMonth = now.getMonth() + 1;
      
      // Approximate Ethiopian month (this is a simple conversion)
      // For accurate conversion, you'd need a proper Ethiopian calendar library
      let currentEthiopianMonth;
      if (gregorianMonth >= 9) {
        currentEthiopianMonth = gregorianMonth - 8; // Sep=1, Oct=2, etc.
      } else {
        currentEthiopianMonth = gregorianMonth + 4; // Jan=5, Feb=6, etc.
      }
      
      // Process invoices to get monthly payment details
      const monthlyPayments = invoices
        .filter(invoice => {
          const monthNumber = invoice.metadata?.monthNumber;
          // Only include invoices for unlocked months (current month and earlier)
          return monthNumber && monthNumber <= currentEthiopianMonth;
        })
        .map(invoice => {
        const totalAmount = parseFloat(invoice.netAmount);
        const paidAmount = parseFloat(invoice.paidAmount);
        const balance = totalAmount - paidAmount;
        const isPaid = invoice.status === 'PAID';
        const isOverdue = invoice.status === 'OVERDUE' || 
                         (new Date() > new Date(invoice.dueDate) && balance > 0);
        
        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          receiptNumber: invoice.receiptNumber,
          month: invoice.metadata?.month || 'Unknown',
          monthNumber: invoice.metadata?.monthNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount,
          paidAmount,
          balance,
          status: invoice.status,
          isPaid,
          isOverdue,
          items: invoice.items.map(item => ({
            description: item.description,
            amount: parseFloat(item.amount),
            feeCategory: item.feeCategory
          })),
          payments: invoice.paymentAllocations.map(alloc => ({
            amount: parseFloat(alloc.amount),
            paymentDate: alloc.payment.paymentDate,
            paymentMethod: alloc.payment.paymentMethod,
            receiptNumber: alloc.payment.receiptNumber
          }))
        };
      });
      
      const unpaidInvoices = monthlyPayments.filter(p => !p.isPaid);
      totalUnpaidCount += unpaidInvoices.length;
      
      // ALWAYS add ward to paymentData, even if they have no invoices
      paymentData.push({
        ward: {
          studentName: ward.student_name,
          schoolId: ward.school_id,
          classId: ward.class_id,
          class: ward.class
        },
        monthlyPayments,
        hasInvoices: invoices.length > 0,
        summary: {
          totalInvoices: monthlyPayments.length,
          paidInvoices: monthlyPayments.filter(p => p.isPaid).length,
          unpaidInvoices: unpaidInvoices.length,
          totalPaid: monthlyPayments.reduce((sum, p) => sum + p.paidAmount, 0),
          totalBalance: monthlyPayments.reduce((sum, p) => sum + p.balance, 0),
          overdueInvoices: monthlyPayments.filter(p => p.isOverdue).length
        }
      });
      
      console.log(`Added payment data for ${ward.student_name}: ${monthlyPayments.length} payments`);
    }
    
    console.log(`Total wards processed: ${wards.length}, Total payment data items: ${paymentData.length}`);
    
    res.json({
      success: true,
      data: {
        wards: wards.map(w => ({
          studentName: w.student_name,
          schoolId: w.school_id,
          classId: w.class_id,
          class: w.class
        })),
        payments: paymentData,
        unpaidCount: totalUnpaidCount,
        hasUnpaidInvoices: totalUnpaidCount > 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching guardian payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment information',
      details: error.message
    });
  }
});

module.exports = router;
