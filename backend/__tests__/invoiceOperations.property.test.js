/**
 * Property-Based Tests for Invoice Operations
 * Using fast-check for property-based testing
 * 
 * **Feature: finance-management-module**
 * **Tests Property 12: Invoice Reversal Preservation**
 */

const fc = require('fast-check');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const invoiceService = require('../services/invoiceService');

// ============================================================================
// Test Data Generators
// ============================================================================

// Positive decimal generator
const positiveDecimalArb = fc.float({ min: 100, max: 10000, noNaN: true, noDefaultInfinity: true });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test user
 */
async function createTestUser() {
  const userId = '00000000-0000-0000-0000-000000000001';
  return userId;
}

/**
 * Create a test campus
 */
async function createTestCampus() {
  const campusId = '00000000-0000-0000-0000-000000000002';
  return campusId;
}

/**
 * Create a test academic year
 */
async function createTestAcademicYear() {
  const academicYearId = '00000000-0000-0000-0000-000000000003';
  return academicYearId;
}

/**
 * Create a test student with valid UUID
 */
async function createTestStudent() {
  // Generate a valid UUID for testing
  const uuid = require('crypto').randomUUID();
  return uuid;
}

/**
 * Create a test account
 */
async function createTestAccount(type = 'INCOME') {
  const userId = await createTestUser();
  
  return await prisma.account.create({
    data: {
      code: `TEST-ACC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Test ${type} Account`,
      type: type,
      isActive: true,
      isLeaf: true,
      createdBy: userId,
    },
  });
}

/**
 * Create a test fee structure with items
 */
async function createTestFeeStructure(amount) {
  const academicYearId = await createTestAcademicYear();
  const campusId = await createTestCampus();
  
  // Create account for the item
  const account = await createTestAccount('INCOME');
  
  const feeStructure = await prisma.feeStructure.create({
    data: {
      name: `Test Fee Structure ${Date.now()}`,
      academicYearId,
      campusId,
      isActive: true,
      items: {
        create: [{
          feeCategory: 'TUITION',
          amount: amount.toFixed(2),
          accountId: account.id,
          paymentType: 'ONE_TIME',
          description: 'Tuition Fee',
        }],
      },
    },
    include: {
      items: true,
    },
  });
  
  return feeStructure;
}

/**
 * Create a test invoice
 */
async function createTestInvoice(amount) {
  const feeStructure = await createTestFeeStructure(amount);
  const studentId = await createTestStudent();
  const userId = await createTestUser();
  const campusId = await createTestCampus();
  const academicYearId = await createTestAcademicYear();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const invoice = await invoiceService.generateInvoice({
    studentId,
    feeStructureId: feeStructure.id,
    academicYearId,
    dueDate,
    campusId,
    createdBy: userId,
    applyDiscounts: false,
  });
  
  return invoice;
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({
    where: {
      invoiceNumber: {
        startsWith: 'INV-',
      },
    },
  });
  await prisma.feeStructureItem.deleteMany({});
  await prisma.feeStructure.deleteMany({
    where: {
      name: {
        startsWith: 'Test Fee Structure',
      },
    },
  });
  await prisma.account.deleteMany({
    where: {
      code: {
        startsWith: 'TEST-ACC-',
      },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      entityType: 'Invoice',
    },
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Invoice Operations - Property Tests', () => {
  
  // Clean up before and after all tests
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // Clean up between tests
  afterEach(async () => {
    await cleanupTestData();
  });

  /**
   * **Feature: finance-management-module, Property 12: Invoice Reversal Preservation**
   * **Validates: Requirements 5.5**
   * 
   * For any invoice reversal, the original invoice record must remain in the database
   * with its original values, and a corresponding credit note must be created.
   */
  describe('Property 12: Invoice Reversal Preservation', () => {
    
    it('should preserve original invoice data when reversed', async () => {
      await fc.assert(
        fc.asyncProperty(
          positiveDecimalArb,
          fc.string({ minLength: 10, maxLength: 200 }),
          async (amount, reason) => {
            // Create invoice
            const invoice = await createTestInvoice(amount);
            
            // Store original values
            const originalId = invoice.id;
            const originalInvoiceNumber = invoice.invoiceNumber;
            const originalStudentId = invoice.studentId;
            const originalTotalAmount = invoice.totalAmount;
            const originalNetAmount = invoice.netAmount;
            const originalStatus = invoice.status;
            const originalItems = [...invoice.items];
            
            // Reverse invoice
            const userId = await createTestUser();
            const result = await invoiceService.reverseInvoice(
              invoice.id,
              reason,
              userId
            );
            
            // Verify result structure
            expect(result).toBeDefined();
            expect(result.originalInvoice).toBeDefined();
            expect(result.cancelledInvoice).toBeDefined();
            expect(result.reason).toBe(reason);
            
            // Retrieve invoice from database
            const invoiceAfterReversal = await prisma.invoice.findUnique({
              where: { id: originalId },
              include: { items: true }
            });
            
            // Verify invoice still exists
            expect(invoiceAfterReversal).toBeDefined();
            expect(invoiceAfterReversal.id).toBe(originalId);
            
            // Verify original values are preserved
            expect(invoiceAfterReversal.invoiceNumber).toBe(originalInvoiceNumber);
            expect(invoiceAfterReversal.studentId).toBe(originalStudentId);
            expect(invoiceAfterReversal.totalAmount).toBe(originalTotalAmount);
            expect(invoiceAfterReversal.netAmount).toBe(originalNetAmount);
            
            // Verify status is changed to CANCELLED
            expect(invoiceAfterReversal.status).toBe('CANCELLED');
            expect(originalStatus).not.toBe('CANCELLED'); // Original was not cancelled
            
            // Verify invoice items are preserved
            expect(invoiceAfterReversal.items.length).toBe(originalItems.length);
            for (let i = 0; i < originalItems.length; i++) {
              expect(invoiceAfterReversal.items[i].feeCategory).toBe(originalItems[i].feeCategory);
              expect(invoiceAfterReversal.items[i].amount).toBe(originalItems[i].amount);
            }
            
            // Verify audit trail exists
            const auditLogs = await prisma.auditLog.findMany({
              where: {
                entityType: 'Invoice',
                entityId: originalId,
                action: 'UPDATE'
              },
              orderBy: {
                timestamp: 'desc'
              }
            });
            
            expect(auditLogs.length).toBeGreaterThan(0);
            const reversalLog = auditLogs[0];
            expect(reversalLog.userId).toBe(userId);
            expect(reversalLog.newValue).toContain('CANCELLED');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should prevent reversal of already cancelled invoices', async () => {
      const amount = 1000;
      const invoice = await createTestInvoice(amount);
      const userId = await createTestUser();
      
      // Reverse invoice first time
      await invoiceService.reverseInvoice(invoice.id, 'First reversal', userId);
      
      // Try to reverse again
      await expect(
        invoiceService.reverseInvoice(invoice.id, 'Second reversal', userId)
      ).rejects.toThrow('already cancelled');
    });

    it('should prevent reversal of invoices with payments', async () => {
      const amount = 1000;
      const invoice = await createTestInvoice(amount);
      
      // Simulate a payment by updating paidAmount
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: '500.00', status: 'PARTIALLY_PAID' }
      });
      
      const userId = await createTestUser();
      
      // Try to reverse invoice with payments
      await expect(
        invoiceService.reverseInvoice(invoice.id, 'Reversal attempt', userId)
      ).rejects.toThrow('Cannot reverse invoice with payments');
    });

    it('should maintain referential integrity after reversal', async () => {
      const amount = 1000;
      const invoice = await createTestInvoice(amount);
      const userId = await createTestUser();
      
      // Get related data before reversal
      const itemsBefore = await prisma.invoiceItem.findMany({
        where: { invoiceId: invoice.id }
      });
      
      // Reverse invoice
      await invoiceService.reverseInvoice(invoice.id, 'Test reversal', userId);
      
      // Verify related data still exists
      const itemsAfter = await prisma.invoiceItem.findMany({
        where: { invoiceId: invoice.id }
      });
      
      expect(itemsAfter.length).toBe(itemsBefore.length);
      expect(itemsAfter.length).toBeGreaterThan(0);
    });

    it('should handle concurrent reversal attempts', async () => {
      const amount = 1000;
      const invoice = await createTestInvoice(amount);
      const userId = await createTestUser();
      
      // Try to reverse the same invoice concurrently
      const promises = Array(3).fill(null).map((_, idx) => 
        invoiceService.reverseInvoice(invoice.id, `Reversal ${idx}`, userId)
      );
      
      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);
      
      // Failed ones should have "already cancelled" error
      failed.forEach(result => {
        expect(result.reason.message).toContain('already cancelled');
      });
      
      // Verify invoice is cancelled only once
      const finalInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      });
      
      expect(finalInvoice.status).toBe('CANCELLED');
    });
  });
});
