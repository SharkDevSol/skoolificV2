/**
 * Automatic Monthly Invoice Generation Script
 * Run this script at the beginning of each month to generate invoices for all students
 * 
 * Usage: node backend/scripts/generate-monthly-invoices.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Convert composite student ID to UUID format
 */
function compositeIdToUuid(compositeId) {
  const parts = compositeId.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid composite ID format: ${compositeId}`);
  }
  const schoolId = parts[0].padStart(4, '0');
  const classId = parts[1].padStart(12, '0');
  return `00000000-0000-0000-${schoolId}-${classId}`;
}

/**
 * Get all students from PostgreSQL
 */
async function getAllStudents() {
  const pool = require('../config/db');
  
  // Get all class names
  const classesResult = await pool.query(`
    SELECT class_names FROM school_schema_points.classes WHERE id = 1
  `);
  
  if (!classesResult.rows.length || !classesResult.rows[0].class_names) {
    return [];
  }

  const classNames = classesResult.rows[0].class_names;
  const allStudents = [];

  // Fetch students from each class
  for (const className of classNames) {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) continue;

    try {
      const result = await pool.query(`
        SELECT 
          school_id,
          class_id,
          student_name
        FROM classes_schema."${className}"
        WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
      `);

      result.rows.forEach(student => {
        allStudents.push({
          id: `${student.school_id}-${student.class_id}`,
          name: student.student_name,
          className: className
        });
      });
    } catch (error) {
      console.error(`Error fetching students from ${className}:`, error.message);
    }
  }

  return allStudents;
}

/**
 * Check if student has unpaid invoices from previous months
 */
async function getUnpaidAmount(studentUuid, currentMonth, currentYear) {
  const invoices = await prisma.invoice.findMany({
    where: {
      studentId: studentUuid,
      status: {
        in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
      }
    }
  });

  let unpaidAmount = 0;
  invoices.forEach(invoice => {
    const balance = parseFloat(invoice.netAmount) - parseFloat(invoice.paidAmount);
    unpaidAmount += balance;
  });

  return unpaidAmount;
}

/**
 * Calculate late fees for overdue invoices
 */
async function calculateLateFees(studentUuid) {
  const today = new Date();
  
  // Get all overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      studentId: studentUuid,
      status: {
        in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
      },
      dueDate: {
        lt: today
      }
    }
  });

  let totalLateFee = 0;

  for (const invoice of overdueInvoices) {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    
    // Apply late fee if more than 10 days overdue
    if (daysOverdue > 10) {
      // Get active late fee rules
      const lateFeeRules = await prisma.lateFeeRule.findMany({
        where: {
          isActive: true,
          gracePeriodDays: {
            lte: daysOverdue
          }
        },
        orderBy: {
          gracePeriodDays: 'desc'
        },
        take: 1
      });

      if (lateFeeRules.length > 0) {
        const rule = lateFeeRules[0];
        let lateFee = 0;

        if (rule.type === 'FIXED_AMOUNT') {
          lateFee = parseFloat(rule.value);
        } else if (rule.type === 'PERCENTAGE') {
          const balance = parseFloat(invoice.netAmount) - parseFloat(invoice.paidAmount);
          lateFee = balance * (parseFloat(rule.value) / 100);
        }

        totalLateFee += lateFee;

        // Update invoice with late fee if not already applied
        if (parseFloat(invoice.lateFeeAmount) === 0) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              lateFeeAmount: lateFee,
              netAmount: parseFloat(invoice.totalAmount) + parseFloat(invoice.discountAmount) + lateFee,
              status: 'OVERDUE'
            }
          });
          console.log(`  ⚠️  Applied late fee $${lateFee.toFixed(2)} to invoice ${invoice.invoiceNumber}`);
        }
      }
    }
  }

  return totalLateFee;
}

/**
 * Generate invoices for a specific month
 */
async function generateMonthlyInvoices(month, year) {
  console.log(`\n🔄 Generating invoices for ${month}/${year}...\n`);

  try {
    // Get all active fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        isActive: true
      },
      include: {
        items: true
      }
    });

    if (feeStructures.length === 0) {
      console.log('❌ No active fee structures found. Please create fee structures first.');
      return;
    }

    // Get all students
    const students = await getAllStudents();
    console.log(`📋 Found ${students.length} students\n`);

    if (students.length === 0) {
      console.log('❌ No students found in the system.');
      return;
    }

    // Group students by class
    const studentsByClass = {};
    students.forEach(student => {
      if (!studentsByClass[student.className]) {
        studentsByClass[student.className] = [];
      }
      studentsByClass[student.className].push(student);
    });

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Generate invoices for each class
    for (const feeStructure of feeStructures) {
      const className = feeStructure.gradeLevel;
      const classStudents = studentsByClass[className] || [];

      if (classStudents.length === 0) {
        console.log(`⚠️  No students found for ${className}`);
        continue;
      }

      console.log(`\n📚 Processing ${className} (${classStudents.length} students)...`);

      for (const student of classStudents) {
        try {
          const studentUuid = compositeIdToUuid(student.id);

          // Check if invoice already exists for this month
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);

          const existingInvoice = await prisma.invoice.findFirst({
            where: {
              studentId: studentUuid,
              academicYearId: feeStructure.academicYearId,
              issueDate: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          });

          if (existingInvoice) {
            totalSkipped++;
            continue;
          }

          // Calculate unpaid amount from previous months
          const unpaidAmount = await getUnpaidAmount(studentUuid, month, year);

          // Calculate late fees
          const lateFees = await calculateLateFees(studentUuid);

          // Calculate current month fee
          const currentMonthFee = feeStructure.items.reduce((sum, item) => 
            sum + parseFloat(item.amount), 0
          );

          // Total amount = current month + unpaid previous months
          const totalAmount = currentMonthFee + unpaidAmount;

          // Generate invoice number
          const prefix = `INV-${year}-`;
          const latestInvoice = await prisma.invoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: 'desc' }
          });
          
          let nextNumber = 1;
          if (latestInvoice) {
            const currentNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
            nextNumber = currentNumber + 1;
          }
          
          const invoiceNumber = `${prefix}${nextNumber.toString().padStart(6, '0')}`;

          // Due date is end of current month
          const dueDate = new Date(year, month, 0);

          // Create invoice
          const invoice = await prisma.$transaction(async (tx) => {
            const inv = await tx.invoice.create({
              data: {
                invoiceNumber,
                studentId: studentUuid,
                academicYearId: feeStructure.academicYearId,
                termId: null,
                issueDate: new Date(),
                dueDate: dueDate,
                totalAmount: currentMonthFee,
                discountAmount: 0,
                lateFeeAmount: 0,
                netAmount: totalAmount,
                paidAmount: 0,
                status: 'ISSUED',
                campusId: feeStructure.campusId || '00000000-0000-0000-0000-000000000001',
                createdBy: '00000000-0000-0000-0000-000000000001' // System user
              }
            });

            // Create invoice items
            await Promise.all(
              feeStructure.items.map(item =>
                tx.invoiceItem.create({
                  data: {
                    invoiceId: inv.id,
                    feeCategory: item.feeCategory,
                    description: item.description || `${item.feeCategory} fee for ${student.name}`,
                    amount: item.amount,
                    accountId: item.accountId,
                    quantity: 1
                  }
                })
              )
            );

            // Add unpaid amount as a separate item if exists
            if (unpaidAmount > 0) {
              await tx.invoiceItem.create({
                data: {
                  invoiceId: inv.id,
                  feeCategory: 'ARREARS',
                  description: `Unpaid balance from previous months`,
                  amount: unpaidAmount,
                  accountId: feeStructure.items[0].accountId,
                  quantity: 1
                }
              });
            }

            return inv;
          });

          totalGenerated++;
          
          if (unpaidAmount > 0) {
            console.log(`  ✅ ${student.name}: $${currentMonthFee.toFixed(2)} + $${unpaidAmount.toFixed(2)} arrears = $${totalAmount.toFixed(2)}`);
          } else {
            console.log(`  ✅ ${student.name}: $${totalAmount.toFixed(2)}`);
          }

        } catch (error) {
          totalErrors++;
          console.error(`  ❌ ${student.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Summary:`);
    console.log(`   ✅ Generated: ${totalGenerated}`);
    console.log(`   ⏭️  Skipped (already exists): ${totalSkipped}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error generating invoices:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  let month, year;
  
  if (args.length >= 2) {
    month = parseInt(args[0]);
    year = parseInt(args[1]);
  } else {
    // Default to current month
    const now = new Date();
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📅 AUTOMATIC MONTHLY INVOICE GENERATION');
  console.log('='.repeat(60));

  await generateMonthlyInvoices(month, year);

  console.log('✅ Invoice generation complete!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
