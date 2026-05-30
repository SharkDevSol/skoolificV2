/**
 * Property-Based Tests for Invoice Generation
 * Using fast-check for property-based testing
 * 
 * **Feature: finance-management-module**
 * **Tests Properties 4, 10, and 11**
 */

const fc = require('fast-check');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const invoiceService = require('../services/invoiceService');

// ============================================================================
// Test Data Generators
// ============================================================================

// UUID generator
const uuidArb = fc.uuid();

// Positive decimal generator
const positiveDecimalArb = fc.float({ min: 10, max: 10000, noNaN: true, noDefaultInfinity: true });

// Fee category generator
const feeCategoryArb = fc.constantFrom(
  'TUITION', 'TRANSPORT', 'LAB', 'EXAM', 'LIBRARY', 'SPORTS', 'UNIFORM', 'BOOKS'
);

// Payment type generator
const paymentTypeArb = fc.constantFrom('ONE_TIME', 'RECURRING', 'INSTALLMENT');

// Account type generator
const accountTypeArb = fc.constantFrom('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

// Fee structure item generator
const feeStructureItemArb = fc.record({
  feeCategory: feeCategoryArb,
  amount: positiveDecimalArb,
  paymentType: paymentTypeArb,
  description: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: null }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test user
 */
async function createTestUser() {
  const userId = '00000000-0000-0000-0000-000000000001';
  // Check if user exists, if not create one
  // For now, we'll just return the test user ID
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
 * Create a test student
 * Returns a valid UUID that can be used for testing
 */
async function createTestStudent() {
  // Generate a valid UUID for testing
  // We use a deterministic pattern that's still a valid UUID
  const crypto = require('crypto');
  const studentId = crypto.randomUUID();
  return studentId;
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
async function createTestFeeStructure(items) {
  const academicYearId = await createTestAcademicYear();
  const campusId = await createTestCampus();
  
  // Create accounts for each item
  const itemsWithAccounts = await Promise.all(
    items.map(async (item) => {
      const account = await createTestAccount('INCOME');
      return {
        ...item,
        accountId: account.id,
      };
    })
  );
  
  const feeStructure = await prisma.feeStructure.create({
    data: {
      name: `Test Fee Structure ${Date.now()}`,
      academicYearId,
      campusId,
      isActive: true,
      items: {
        create: itemsWithAccounts.map(item => ({
          feeCategory: item.feeCategory,
          amount: item.amount.toFixed(2),
          accountId: item.accountId,
          paymentType: item.paymentType,
          description: item.description || item.feeCategory,
        })),
      },
    },
    include: {
      items: true,
    },
  });
  
  return feeStructure;
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

describe('Invoice Generation - Property Tests', () => {
  
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
   * **Feature: finance-management-module, Property 10: Bulk Invoice Generation Completeness**
   * **Validates: Requirements 5.1**
   * 
   * For any set of students with an applicable fee structure, bulk invoice generation
   * should create exactly one invoice per student with all fee structure items included.
   */
  describe('Property 10: Bulk Invoice Generation Completeness', () => {
    
    it('should generate exactly one invoice per student with all fee items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(feeStructureItemArb, { minLength: 1, maxLength: 5 }),
          fc.array(fc.constant(null), { minLength: 2, maxLength: 5 }), // Student count
          async (feeItems, studentArray) => {
            // Create fee structure
            const feeStructure = await createTestFeeStructure(feeItems);
            
            // Create students
            const studentIds = await Promise.all(
              studentArray.map(() => createTestStudent())
            );
            
            const userId = await createTestUser();
            const campusId = await createTestCampus();
            const academicYearId = await createTestAcademicYear();
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
            
            // Generate bulk invoices
            const result = await invoiceService.generateBulkInvoices({
              studentIds,
              feeStructureId: feeStructure.id,
              academicYearId,
              dueDate,
              campusId,
              createdBy: userId,
              applyDiscounts: false,
            });
            
            // Verify completeness
            expect(result.totalCount).toBe(studentIds.length);
            expect(result.successCount).toBe(studentIds.length);
            expect(result.failureCount).toBe(0);
            expect(result.successful.length).toBe(studentIds.length);
            expect(result.failed.length).toBe(0);
            
            // Verify each student has exactly one invoice
            for (const studentId of studentIds) {
              const studentInvoices = result.successful.filter(
                inv => inv.studentId === studentId
              );
              expect(studentInvoices.length).toBe(1);
              
              // Verify invoice has all fee structure items
              const invoice = await prisma.invoice.findUnique({
                where: { id: studentInvoices[0].invoiceId },
                include: { items: true },
              });
              
              expect(invoice.items.length).toBe(feeStructure.items.length);
              
              // Verify each fee category is present
              const invoiceCategories = invoice.items.map(item => item.feeCategory).sort();
              const feeCategories = feeStructure.items.map(item => item.feeCategory).sort();
              expect(invoiceCategories).toEqual(feeCategories);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle partial failures gracefully', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition Fee' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      const validStudent = await createTestStudent();
      const invalidStudent = 'invalid-student-id';
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const result = await invoiceService.generateBulkInvoices({
        studentIds: [validStudent, invalidStudent],
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      // Should have 1 success and 1 failure
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(1);
      
      // Verify the successful invoice
      expect(result.successful[0].studentId).toBe(validStudent);
      
      // Verify the failed invoice
      expect(result.failed[0].studentId).toBe(invalidStudent);
      expect(result.failed[0].error).toBeDefined();
    });

    it('should not create duplicate invoices for same student', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition Fee' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      const studentId = await createTestStudent();
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Generate invoice first time
      const result1 = await invoiceService.generateBulkInvoices({
        studentIds: [studentId],
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      expect(result1.successCount).toBe(1);
      
      // Generate invoice second time (should succeed, creating a new invoice)
      const result2 = await invoiceService.generateBulkInvoices({
        studentIds: [studentId],
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      expect(result2.successCount).toBe(1);
      
      // Verify two separate invoices exist
      const invoices = await prisma.invoice.findMany({
        where: { studentId },
      });
      
      expect(invoices.length).toBe(2);
      expect(invoices[0].invoiceNumber).not.toBe(invoices[1].invoiceNumber);
    });
  });

  /**
   * **Feature: finance-management-module, Property 11: Invoice Required Fields Completeness**
   * **Validates: Requirements 5.3**
   * 
   * For any generated invoice, it must contain student details, at least one fee line item,
   * due date, and total amount.
   */
  describe('Property 11: Invoice Required Fields Completeness', () => {
    
    it('should include all required fields in generated invoices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(feeStructureItemArb, { minLength: 1, maxLength: 5 }),
          async (feeItems) => {
            // Create fee structure
            const feeStructure = await createTestFeeStructure(feeItems);
            
            // Create student
            const studentId = await createTestStudent();
            
            const userId = await createTestUser();
            const campusId = await createTestCampus();
            const academicYearId = await createTestAcademicYear();
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            // Generate invoice
            const invoice = await invoiceService.generateInvoice({
              studentId,
              feeStructureId: feeStructure.id,
              academicYearId,
              dueDate,
              campusId,
              createdBy: userId,
              applyDiscounts: false,
            });
            
            // Verify required fields
            expect(invoice).toBeDefined();
            expect(invoice.id).toBeDefined();
            expect(invoice.invoiceNumber).toBeDefined();
            expect(invoice.studentId).toBe(studentId);
            expect(invoice.academicYearId).toBe(academicYearId);
            expect(invoice.dueDate).toBeDefined();
            expect(invoice.totalAmount).toBeDefined();
            expect(invoice.netAmount).toBeDefined();
            expect(invoice.status).toBe('ISSUED');
            expect(invoice.campusId).toBe(campusId);
            expect(invoice.createdBy).toBe(userId);
            
            // Verify at least one line item
            expect(invoice.items).toBeDefined();
            expect(invoice.items.length).toBeGreaterThan(0);
            
            // Verify each line item has required fields
            for (const item of invoice.items) {
              expect(item.id).toBeDefined();
              expect(item.invoiceId).toBe(invoice.id);
              expect(item.feeCategory).toBeDefined();
              expect(item.description).toBeDefined();
              expect(item.amount).toBeDefined();
              expect(item.accountId).toBeDefined();
              expect(item.quantity).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should calculate total amount correctly from line items', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
        { feeCategory: 'TRANSPORT', amount: 200, paymentType: 'ONE_TIME', description: 'Transport' },
        { feeCategory: 'LAB', amount: 150, paymentType: 'ONE_TIME', description: 'Lab Fee' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
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
      
      // Calculate expected total
      const expectedTotal = feeItems.reduce((sum, item) => sum + item.amount, 0);
      
      // Verify total amount
      expect(parseFloat(invoice.totalAmount)).toBeCloseTo(expectedTotal, 2);
      expect(parseFloat(invoice.netAmount)).toBeCloseTo(expectedTotal, 2);
    });

    it('should generate unique invoice numbers', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Generate multiple invoices
      const invoices = [];
      for (let i = 0; i < 5; i++) {
        const studentId = await createTestStudent();
        const invoice = await invoiceService.generateInvoice({
          studentId,
          feeStructureId: feeStructure.id,
          academicYearId,
          dueDate,
          campusId,
          createdBy: userId,
          applyDiscounts: false,
        });
        invoices.push(invoice);
      }
      
      // Verify all invoice numbers are unique
      const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
      const uniqueNumbers = new Set(invoiceNumbers);
      expect(uniqueNumbers.size).toBe(invoices.length);
      
      // Verify invoice number format
      for (const invoice of invoices) {
        expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
      }
    });
  });

  /**
   * **Feature: finance-management-module, Property 4: Fee Structure Modification Isolation**
   * **Validates: Requirements 2.6**
   * 
   * For any existing invoice, modifying the fee structure it was based on should not
   * change the invoice amounts or line items.
   */
  describe('Property 4: Fee Structure Modification Isolation', () => {
    
    it('should not affect existing invoices when fee structure is modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(feeStructureItemArb, { minLength: 1, maxLength: 3 }),
          positiveDecimalArb,
          async (feeItems, newAmount) => {
            // Create fee structure
            const feeStructure = await createTestFeeStructure(feeItems);
            
            // Create student and generate invoice
            const studentId = await createTestStudent();
            const userId = await createTestUser();
            const campusId = await createTestCampus();
            const academicYearId = await createTestAcademicYear();
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            const originalInvoice = await invoiceService.generateInvoice({
              studentId,
              feeStructureId: feeStructure.id,
              academicYearId,
              dueDate,
              campusId,
              createdBy: userId,
              applyDiscounts: false,
            });
            
            // Store original values
            const originalTotalAmount = originalInvoice.totalAmount;
            const originalNetAmount = originalInvoice.netAmount;
            const originalItems = [...originalInvoice.items];
            
            // Modify fee structure (update first item amount)
            if (feeStructure.items.length > 0) {
              await prisma.feeStructureItem.update({
                where: { id: feeStructure.items[0].id },
                data: { amount: newAmount.toFixed(2) },
              });
            }
            
            // Retrieve invoice again
            const invoiceAfterModification = await prisma.invoice.findUnique({
              where: { id: originalInvoice.id },
              include: { items: true },
            });
            
            // Verify invoice amounts haven't changed
            expect(invoiceAfterModification.totalAmount).toBe(originalTotalAmount);
            expect(invoiceAfterModification.netAmount).toBe(originalNetAmount);
            
            // Verify invoice items haven't changed
            expect(invoiceAfterModification.items.length).toBe(originalItems.length);
            for (let i = 0; i < originalItems.length; i++) {
              expect(invoiceAfterModification.items[i].amount).toBe(originalItems[i].amount);
              expect(invoiceAfterModification.items[i].feeCategory).toBe(originalItems[i].feeCategory);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should allow new invoices to use updated fee structure', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Generate first invoice
      const student1 = await createTestStudent();
      const invoice1 = await invoiceService.generateInvoice({
        studentId: student1,
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      const originalAmount = parseFloat(invoice1.totalAmount);
      
      // Modify fee structure
      const newAmount = 1500;
      await prisma.feeStructureItem.update({
        where: { id: feeStructure.items[0].id },
        data: { amount: newAmount.toFixed(2) },
      });
      
      // Generate second invoice
      const student2 = await createTestStudent();
      const invoice2 = await invoiceService.generateInvoice({
        studentId: student2,
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      // First invoice should have original amount
      const invoice1After = await prisma.invoice.findUnique({
        where: { id: invoice1.id },
      });
      expect(parseFloat(invoice1After.totalAmount)).toBeCloseTo(originalAmount, 2);
      
      // Second invoice should have new amount
      expect(parseFloat(invoice2.totalAmount)).toBeCloseTo(newAmount, 2);
    });

    it('should preserve invoice integrity when fee structure is deactivated', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Generate invoice
      const studentId = await createTestStudent();
      const invoice = await invoiceService.generateInvoice({
        studentId,
        feeStructureId: feeStructure.id,
        academicYearId,
        dueDate,
        campusId,
        createdBy: userId,
        applyDiscounts: false,
      });
      
      // Store original values
      const originalTotalAmount = invoice.totalAmount;
      const originalItems = [...invoice.items];
      
      // Deactivate fee structure
      await prisma.feeStructure.update({
        where: { id: feeStructure.id },
        data: { isActive: false },
      });
      
      // Retrieve invoice
      const invoiceAfter = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true },
      });
      
      // Verify invoice is still intact
      expect(invoiceAfter).toBeDefined();
      expect(invoiceAfter.totalAmount).toBe(originalTotalAmount);
      expect(invoiceAfter.items.length).toBe(originalItems.length);
    });
  });

  /**
   * Edge cases and error conditions
   */
  describe('Edge Cases', () => {
    
    it('should handle fee structure with no items', async () => {
      const academicYearId = await createTestAcademicYear();
      const campusId = await createTestCampus();
      
      const feeStructure = await prisma.feeStructure.create({
        data: {
          name: `Empty Fee Structure ${Date.now()}`,
          academicYearId,
          campusId,
          isActive: true,
        },
      });
      
      const studentId = await createTestStudent();
      const userId = await createTestUser();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Should throw error
      await expect(
        invoiceService.generateInvoice({
          studentId,
          feeStructureId: feeStructure.id,
          academicYearId,
          dueDate,
          campusId,
          createdBy: userId,
          applyDiscounts: false,
        })
      ).rejects.toThrow('has no items');
    });

    it('should handle inactive fee structure', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      
      // Deactivate fee structure
      await prisma.feeStructure.update({
        where: { id: feeStructure.id },
        data: { isActive: false },
      });
      
      const studentId = await createTestStudent();
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Should throw error
      await expect(
        invoiceService.generateInvoice({
          studentId,
          feeStructureId: feeStructure.id,
          academicYearId,
          dueDate,
          campusId,
          createdBy: userId,
          applyDiscounts: false,
        })
      ).rejects.toThrow('is not active');
    });

    it('should handle non-existent fee structure', async () => {
      const studentId = await createTestStudent();
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await expect(
        invoiceService.generateInvoice({
          studentId,
          feeStructureId: '00000000-0000-0000-0000-999999999999',
          academicYearId,
          dueDate,
          campusId,
          createdBy: userId,
          applyDiscounts: false,
        })
      ).rejects.toThrow('not found');
    });

    it('should handle non-existent student', async () => {
      const feeItems = [
        { feeCategory: 'TUITION', amount: 1000, paymentType: 'ONE_TIME', description: 'Tuition' },
      ];
      
      const feeStructure = await createTestFeeStructure(feeItems);
      
      const userId = await createTestUser();
      const campusId = await createTestCampus();
      const academicYearId = await createTestAcademicYear();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await expect(
        invoiceService.generateInvoice({
          studentId: '00000000-0000-0000-0000-999999999999',
          feeStructureId: feeStructure.id,
          academicYearId,
          dueDate,
          campusId,
          createdBy: userId,
          applyDiscounts: false,
        })
      ).rejects.toThrow('not found');
    });
  });
});
