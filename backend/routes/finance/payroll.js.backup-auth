const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../../middleware/auth');

// Generate payroll number
async function generatePayrollNumber(month, year) {
  const prefix = `PAY-${year}${String(month).padStart(2, '0')}`;
  const count = await prisma.payroll.count({
    where: { payrollNumber: { startsWith: prefix } }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

// Get all payrolls
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year, month, status } = req.query;
    
    const where = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (status) where.status = status;
    
    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        items: {
          include: {
            salaryStructure: true,
            details: true
          }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    
    res.json({ success: true, data: payrolls });
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch payrolls' } });
  }
});

// Get single payroll
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            salaryStructure: {
              include: { components: true }
            },
            details: {
              include: { account: true }
            }
          }
        }
      }
    });
    
    if (!payroll) {
      return res.status(404).json({ success: false, error: { message: 'Payroll not found' } });
    }
    
    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('Error fetching payroll:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch payroll' } });
  }
});

// Process payroll
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { month, year, staffIds } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // Check if payroll already exists
      const existing = await tx.payroll.findUnique({
        where: {
          month_year: {
            month: parseInt(month),
            year: parseInt(year)
          }
        }
      });
      
      if (existing) {
        throw new Error('Payroll for this period already exists');
      }
      
      // Get staff with salary structures
      const staffList = await tx.salaryStructure.findMany({
        where: {
          isActive: true,
          ...(staffIds && { staffCategory: { in: staffIds } })
        },
        include: {
          components: {
            include: { account: true }
          }
        }
      });
      
      if (staffList.length === 0) {
        throw new Error('No active staff found');
      }
      
      // Generate payroll number
      const payrollNumber = await generatePayrollNumber(month, year);
      
      // Calculate totals
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      
      const payrollItems = [];
      
      for (const structure of staffList) {
        const baseSalary = parseFloat(structure.baseSalary);
        let allowances = 0;
        let deductions = 0;
        const componentDetails = [];
        
        // Calculate allowances and deductions
        for (const component of structure.components) {
          const amount = component.calculationType === 'PERCENTAGE'
            ? (baseSalary * parseFloat(component.value)) / 100
            : parseFloat(component.value);
          
          if (component.componentType === 'ALLOWANCE') {
            allowances += amount;
          } else {
            deductions += amount;
          }
          
          componentDetails.push({
            componentType: component.componentType,
            componentName: component.name,
            amount,
            accountId: component.accountId
          });
        }
        
        const grossSalary = baseSalary + allowances;
        const netSalary = grossSalary - deductions;
        
        totalGross += grossSalary;
        totalDeductions += deductions;
        totalNet += netSalary;
        
        payrollItems.push({
          staffId: structure.staffCategory, // This should be actual staff ID
          salaryStructureId: structure.id,
          baseSalary,
          totalAllowances: allowances,
          totalDeductions: deductions,
          netSalary,
          details: componentDetails
        });
      }
      
      // Create payroll
      const payroll = await tx.payroll.create({
        data: {
          payrollNumber,
          month: parseInt(month),
          year: parseInt(year),
          status: 'DRAFT',
          totalGrossSalary: totalGross,
          totalDeductions,
          totalNetSalary: totalNet,
          createdBy: req.user.id,
          items: {
            create: payrollItems.map(item => ({
              staffId: item.staffId,
              salaryStructureId: item.salaryStructureId,
              baseSalary: item.baseSalary,
              totalAllowances: item.totalAllowances,
              totalDeductions: item.totalDeductions,
              netSalary: item.netSalary,
              details: {
                create: item.details
              }
            }))
          }
        },
        include: {
          items: {
            include: { details: true }
          }
        }
      });
      
      return payroll;
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing payroll:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to process payroll' } });
  }
});

// Approve payroll
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvalDate: new Date()
      }
    });
    
    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('Error approving payroll:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to approve payroll' } });
  }
});

// Mark payroll as paid
router.post('/:id/mark-paid', authenticateToken, async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const payroll = await tx.payroll.update({
        where: { id: req.params.id },
        data: {
          status: 'PAID',
          paymentDate: new Date()
        },
        include: { items: { include: { details: true } } }
      });
      
      // Create transaction for double-entry
      const transactionNumber = `TXN-PAY-${Date.now()}`;
      await tx.transaction.create({
        data: {
          transactionNumber,
          transactionDate: new Date(),
          description: `Payroll ${payroll.payrollNumber}`,
          sourceType: 'PAYROLL',
          sourceId: payroll.id,
          status: 'POSTED',
          postedBy: req.user.id,
          postedAt: new Date(),
          lines: {
            create: [
              // Debit: Salary Expense
              {
                accountId: '00000000-0000-0000-0000-000000000003', // Replace with actual salary expense account
                debitAmount: parseFloat(payroll.totalGrossSalary),
                creditAmount: 0,
                description: 'Salary expense'
              },
              // Credit: Cash/Bank
              {
                accountId: '00000000-0000-0000-0000-000000000001', // Replace with actual cash account
                debitAmount: 0,
                creditAmount: parseFloat(payroll.totalNetSalary),
                description: 'Salary payment'
              },
              // Credit: Deductions payable
              {
                accountId: '00000000-0000-0000-0000-000000000004', // Replace with actual deductions account
                debitAmount: 0,
                creditAmount: parseFloat(payroll.totalDeductions),
                description: 'Deductions'
              }
            ]
          }
        }
      });
      
      return payroll;
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error marking payroll as paid:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to mark payroll as paid' } });
  }
});

// Get payslip for staff
router.get('/:payrollId/payslip/:staffId', authenticateToken, async (req, res) => {
  try {
    const payrollItem = await prisma.payrollItem.findFirst({
      where: {
        payrollId: req.params.payrollId,
        staffId: req.params.staffId
      },
      include: {
        payroll: true,
        salaryStructure: true,
        details: {
          include: { account: true }
        }
      }
    });
    
    if (!payrollItem) {
      return res.status(404).json({ success: false, error: { message: 'Payslip not found' } });
    }
    
    res.json({ success: true, data: payrollItem });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch payslip' } });
  }
});

// Salary structures
router.get('/salary-structures', authenticateToken, async (req, res) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      where: { isActive: true },
      include: {
        components: {
          include: { account: true }
        }
      }
    });
    
    res.json({ success: true, data: structures });
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch salary structures' } });
  }
});

// Create salary structure
router.post('/salary-structures', authenticateToken, async (req, res) => {
  try {
    const { name, staffCategory, baseSalary, components } = req.body;
    
    const structure = await prisma.salaryStructure.create({
      data: {
        name,
        staffCategory,
        baseSalary: parseFloat(baseSalary),
        components: {
          create: components.map(comp => ({
            componentType: comp.componentType,
            name: comp.name,
            calculationType: comp.calculationType,
            value: parseFloat(comp.value),
            accountId: comp.accountId
          }))
        }
      },
      include: { components: true }
    });
    
    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create salary structure' } });
  }
});

module.exports = router;
