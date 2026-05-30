const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Automatically apply late fees to overdue invoices
 * This runs silently in the background when invoices are fetched
 * APPLIES ALL APPLICABLE LATE FEE RULES CUMULATIVELY
 * NOTE: Due date already includes grace period, so late fee applies immediately after due date
 */
async function applyLateFeesAutomatically() {
  try {
    const today = new Date();
    
    // Get all active late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' } // Apply rules in order from shortest to longest grace period
    });

    if (lateFeeRules.length === 0) {
      return { appliedCount: 0, message: 'No active late fee rules' };
    }

    // Get all unpaid/partially paid invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
        }
      }
    });

    let appliedCount = 0;

    for (const invoice of invoices) {
      // Check if invoice is overdue
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      if (daysPastDue <= 0) {
        // Not yet due
        continue;
      }

      // Calculate total late fee from ALL applicable rules
      // NOTE: Due date already includes grace period, so we apply late fees immediately
      let totalLateFee = 0;
      let appliedRules = [];

      for (const rule of lateFeeRules) {
        // Apply late fee immediately after due date (no additional grace period)
        // The grace period was already added to the due date when invoice was created
        let lateFeeAmount = 0;
        if (rule.type === 'FIXED_AMOUNT') {
          lateFeeAmount = parseFloat(rule.value);
        } else if (rule.type === 'PERCENTAGE') {
          lateFeeAmount = (parseFloat(invoice.totalAmount) * parseFloat(rule.value)) / 100;
        }

        totalLateFee += lateFeeAmount;
        appliedRules.push({ name: rule.name, amount: lateFeeAmount });
      }

      // Only update if there's a late fee to apply and it's different from current
      if (totalLateFee > 0 && parseFloat(invoice.lateFeeAmount) !== totalLateFee) {
        try {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              lateFeeAmount: totalLateFee,
              netAmount: parseFloat(invoice.totalAmount) + totalLateFee - parseFloat(invoice.discountAmount),
              status: 'OVERDUE'
            }
          });

          appliedCount++;
          console.log(`✓ Auto-applied late fees to invoice ${invoice.invoiceNumber}: ${totalLateFee} Birr (${daysPastDue} days past due) - Rules: ${appliedRules.map(r => `${r.name}: ${r.amount}`).join(', ')}`);
        } catch (error) {
          console.error(`✗ Failed to apply late fee to invoice ${invoice.invoiceNumber}:`, error.message);
        }
      }
    }

    if (appliedCount > 0) {
      console.log(`🔔 Auto-applied late fees to ${appliedCount} overdue invoices`);
    }

    return { appliedCount, message: `Applied late fees to ${appliedCount} invoices` };

  } catch (error) {
    console.error('Error in automatic late fee application:', error);
    return { appliedCount: 0, error: error.message };
  }
}

module.exports = {
  applyLateFeesAutomatically
};
