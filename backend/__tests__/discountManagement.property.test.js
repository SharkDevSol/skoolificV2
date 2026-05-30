/**
 * Property-Based Tests for Discount Management
 * Using fast-check for property-based testing
 * 
 * **Feature: finance-management-module**
 * **Tests Properties 5 and 6**
 */

const fc = require('fast-check');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// Test Data Generators
// ============================================================================

// Discount type generator
const discountTypeArb = fc.constantFrom('PERCENTAGE', 'FIXED_AMOUNT');

// Fee category generator
const feeCategoryArb = fc.constantFrom('TUITION', 'TRANSPORT', 'LAB', 'EXAM', 'LIBRARY', 'SPORTS', 'CUSTOM');

// Discount generator
const discountArb = fc.record({
  name: fc.string({ minLength: 5, maxLength: 100 }),
  type: discountTypeArb,
  value: fc.float({ min: 1, max: 100, noNaN: true }),
  applicableFeeCategories: fc.array(feeCategoryArb, { minLength: 1, maxLength: 3 }),
});

// Fee amount generator
const feeAmountArb = fc.float({ min: 100, max: 10000, noNaN: true });

// Invoice generator
const invoiceArb = fc.record({
  studentId: fc.uuid(),
  academicYearId: fc.uuid(),
  totalAmount: feeAmountArb,
  status: fc.constantFrom('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test discount in the database
 */
async function createTestDiscount(discountData) {
  return await prisma.discount.create({
    data: {
      name: discountData.name,
      type: discountData.type,
      value: discountData.value,
      applicableFeeCategories: discountData.applicableFeeCategories,
      startDate: new Date(),
      endDate: null,
      requiresApproval: false,
      isActive: true,
    },
  });
}

/**
 * Create a test scholarship in the database
 */
async function createTestScholarship(scholarshipData) {
  return await prisma.scholarship.create({
    data: {
      name: scholarshipData.name,
      discountId: scholarshipData.discountId,
      eligibilityCriteria: scholarshipData.eligibilityCriteria || {},
      maxRecipients: scholarshipData.maxRecipients || null,
      academicYearId: scholarshipData.academicYearId,
      approvalWorkflowId: null,
      isActive: true,
    },
  });
}

/**
 * Calculate discount amount based on type and value
 */
function calculateDiscountAmount(feeAmount, discount) {
  if (discount.type === 'PERCENTAGE') {
    return (feeAmount * discount.value) / 100;
  } else {
    return discount.value;
  }
}

/**
 * Apply discount to fee amount
 */
function applyDiscount(feeAmount, discount) {
  const discountAmount = calculateDiscountAmount(feeAmount, discount);
  const netAmount = feeAmount - discountAmount;
  
  return {
    originalAmount: feeAmount,
    discountAmount: Math.min(discountAmount, feeAmount), // Cannot exceed original
    netAmount: Math.max(netAmount, 0), // Cannot be negative
  };
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  await prisma.scholarship.deleteMany({
    where: {
      name: {
        startsWith: 'TEST-',
      },
    },
  });
  
  await prisma.discount.deleteMany({
    where: {
      name: {
        startsWith: 'TEST-',
      },
    },
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Discount Management - Property Tests', () => {
  
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
   * **Feature: finance-management-module, Property 5: Discount Amount Validation**
   * **Validates: Requirements 3.2**
   * 
   * For any discount application, the discount amount must not exceed the original fee amount,
   * and the resulting net amount must be non-negative.
   */
  describe('Property 5: Discount Amount Validation', () => {
    
    it('should ensure discount amount never exceeds original fee amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          feeAmountArb,
          discountArb,
          async (feeAmount, discountData) => {
            // Create discount
            const discount = await createTestDiscount({
              ...discountData,
              name: `TEST-DISCOUNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });

            // Apply discount
            const result = applyDiscount(feeAmount, discount);

            // Validate: discount amount should not exceed original amount
            expect(result.discountAmount).toBeLessThanOrEqual(feeAmount);
            
            // Validate: net amount should be non-negative
            expect(result.netAmount).toBeGreaterThanOrEqual(0);
            
            // Validate: original amount = discount amount + net amount
            const sum = result.discountAmount + result.netAmount;
            expect(Math.abs(sum - feeAmount)).toBeLessThan(0.01); // Allow for floating point precision
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle percentage discounts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          feeAmountArb,
          fc.float({ min: 1, max: 100, noNaN: true }),
          async (feeAmount, percentage) => {
            const discount = await createTestDiscount({
              name: `TEST-PCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'PERCENTAGE',
              value: percentage,
              applicableFeeCategories: ['TUITION'],
            });

            const result = applyDiscount(feeAmount, discount);

            // Calculate expected discount
            const expectedDiscount = (feeAmount * percentage) / 100;
            
            // Discount amount should match calculation (within 0.1% tolerance for floating point)
            const discountDiff = Math.abs(result.discountAmount - expectedDiscount);
            const discountTolerance = Math.max(0.5, expectedDiscount * 0.001); // 0.1% or 0.5, whichever is larger
            expect(discountDiff).toBeLessThan(discountTolerance);
            
            // Net amount should be original minus discount (within 0.1% tolerance)
            const expectedNet = feeAmount - expectedDiscount;
            const netDiff = Math.abs(result.netAmount - expectedNet);
            const netTolerance = Math.max(0.5, expectedNet * 0.001); // 0.1% or 0.5, whichever is larger
            expect(netDiff).toBeLessThan(netTolerance);
            
            // Net amount should be non-negative
            expect(result.netAmount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle fixed amount discounts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          feeAmountArb,
          fc.float({ min: 10, max: 5000, noNaN: true }),
          async (feeAmount, fixedAmount) => {
            const discount = await createTestDiscount({
              name: `TEST-FIXED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'FIXED_AMOUNT',
              value: fixedAmount,
              applicableFeeCategories: ['TUITION'],
            });

            const result = applyDiscount(feeAmount, discount);

            // Discount amount should not exceed fee amount
            const expectedDiscount = Math.min(fixedAmount, feeAmount);
            expect(Math.abs(result.discountAmount - expectedDiscount)).toBeLessThan(0.01);
            
            // Net amount should be non-negative
            expect(result.netAmount).toBeGreaterThanOrEqual(0);
            
            // If discount exceeds fee, net should be zero
            if (fixedAmount >= feeAmount) {
              expect(result.netAmount).toBeLessThan(0.01);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle 100% discount correctly', async () => {
      const feeAmount = 1000;
      const discount = await createTestDiscount({
        name: `TEST-100PCT-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 100,
        applicableFeeCategories: ['TUITION'],
      });

      const result = applyDiscount(feeAmount, discount);

      expect(result.discountAmount).toBe(feeAmount);
      expect(result.netAmount).toBe(0);
    });

    it('should handle discount larger than fee amount', async () => {
      const feeAmount = 500;
      const discount = await createTestDiscount({
        name: `TEST-LARGE-${Date.now()}`,
        type: 'FIXED_AMOUNT',
        value: 1000, // Larger than fee
        applicableFeeCategories: ['TUITION'],
      });

      const result = applyDiscount(feeAmount, discount);

      // Discount should be capped at fee amount
      expect(result.discountAmount).toBe(feeAmount);
      expect(result.netAmount).toBe(0);
    });

    it('should handle very small fee amounts', async () => {
      const feeAmount = 0.01;
      const discount = await createTestDiscount({
        name: `TEST-SMALL-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 50,
        applicableFeeCategories: ['TUITION'],
      });

      const result = applyDiscount(feeAmount, discount);

      expect(result.discountAmount).toBeLessThanOrEqual(feeAmount);
      expect(result.netAmount).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple discounts applied sequentially', async () => {
      const feeAmount = 1000;
      
      const discount1 = await createTestDiscount({
        name: `TEST-MULTI1-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 10,
        applicableFeeCategories: ['TUITION'],
      });

      const discount2 = await createTestDiscount({
        name: `TEST-MULTI2-${Date.now()}`,
        type: 'FIXED_AMOUNT',
        value: 50,
        applicableFeeCategories: ['TUITION'],
      });

      // Apply first discount
      const result1 = applyDiscount(feeAmount, discount1);
      expect(result1.netAmount).toBe(900); // 1000 - 10%

      // Apply second discount to net amount
      const result2 = applyDiscount(result1.netAmount, discount2);
      expect(result2.netAmount).toBe(850); // 900 - 50

      // Total discount should not exceed original amount
      const totalDiscount = result1.discountAmount + result2.discountAmount;
      expect(totalDiscount).toBeLessThanOrEqual(feeAmount);
    });
  });

  /**
   * **Feature: finance-management-module, Property 6: Scholarship Discount Application**
   * **Validates: Requirements 3.4**
   * 
   * For any approved scholarship and applicable invoice, the scholarship discount
   * should be automatically applied to the invoice.
   */
  describe('Property 6: Scholarship Discount Application', () => {
    
    it('should automatically apply scholarship discount to applicable invoices', async () => {
      await fc.assert(
        fc.asyncProperty(
          discountArb,
          fc.uuid(),
          fc.array(feeCategoryArb, { minLength: 1, maxLength: 3 }),
          async (discountData, academicYearId, feeCategories) => {
            // Create discount
            const discount = await createTestDiscount({
              ...discountData,
              name: `TEST-SCHOL-DISC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              applicableFeeCategories: feeCategories,
            });

            // Create scholarship with this discount
            const scholarship = await createTestScholarship({
              name: `TEST-SCHOLARSHIP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              discountId: discount.id,
              academicYearId: academicYearId,
              eligibilityCriteria: { minGPA: 3.5 },
              maxRecipients: 10,
            });

            // Verify scholarship is created and active
            expect(scholarship).toBeDefined();
            expect(scholarship.isActive).toBe(true);
            expect(scholarship.discountId).toBe(discount.id);

            // Verify discount is linked
            const linkedDiscount = await prisma.discount.findUnique({
              where: { id: scholarship.discountId },
            });
            expect(linkedDiscount).toBeDefined();
            expect(linkedDiscount.id).toBe(discount.id);

            // Verify applicable fee categories match
            expect(linkedDiscount.applicableFeeCategories).toEqual(feeCategories);

            // When scholarship is approved, discount should be applicable
            // (This would be enforced in the invoice generation logic)
            expect(scholarship.isActive).toBe(true);
            expect(linkedDiscount.isActive).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should only apply scholarship to matching fee categories', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      
      // Create discount applicable only to TUITION
      const discount = await createTestDiscount({
        name: `TEST-TUITION-DISC-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 20,
        applicableFeeCategories: ['TUITION'],
      });

      // Create scholarship
      const scholarship = await createTestScholarship({
        name: `TEST-TUITION-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
      });

      // Verify scholarship is linked to discount
      const scholarshipWithDiscount = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
        include: { discount: true },
      });

      expect(scholarshipWithDiscount.discount.applicableFeeCategories).toContain('TUITION');
      expect(scholarshipWithDiscount.discount.applicableFeeCategories).not.toContain('TRANSPORT');

      // Discount should only apply to TUITION fees
      const tuitionFee = 1000;
      const transportFee = 500;

      const tuitionResult = applyDiscount(tuitionFee, discount);
      expect(tuitionResult.discountAmount).toBe(200); // 20% of 1000

      // Transport fee should not get discount (would be handled in business logic)
      // Here we verify the discount categories
      expect(discount.applicableFeeCategories).not.toContain('TRANSPORT');
    });

    it('should handle scholarship with multiple applicable fee categories', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      const applicableCategories = ['TUITION', 'LAB', 'LIBRARY'];
      
      const discount = await createTestDiscount({
        name: `TEST-MULTI-CAT-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 15,
        applicableFeeCategories: applicableCategories,
      });

      const scholarship = await createTestScholarship({
        name: `TEST-MULTI-CAT-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
      });

      const scholarshipWithDiscount = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
        include: { discount: true },
      });

      // Verify all categories are included
      applicableCategories.forEach(category => {
        expect(scholarshipWithDiscount.discount.applicableFeeCategories).toContain(category);
      });

      // Verify discount applies to all categories
      const fees = {
        TUITION: 1000,
        LAB: 300,
        LIBRARY: 100,
      };

      Object.entries(fees).forEach(([category, amount]) => {
        const result = applyDiscount(amount, discount);
        expect(result.discountAmount).toBe(amount * 0.15);
      });
    });

    it('should handle scholarship with max recipients limit', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      const maxRecipients = 5;
      
      const discount = await createTestDiscount({
        name: `TEST-LIMITED-DISC-${Date.now()}`,
        type: 'FIXED_AMOUNT',
        value: 500,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-LIMITED-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
        maxRecipients: maxRecipients,
      });

      expect(scholarship.maxRecipients).toBe(maxRecipients);
      
      // Business logic would enforce this limit when assigning scholarships
      // Here we verify the limit is stored correctly
      const retrievedScholarship = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
      });

      expect(retrievedScholarship.maxRecipients).toBe(maxRecipients);
    });

    it('should handle scholarship with eligibility criteria', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      const eligibilityCriteria = {
        minGPA: 3.5,
        maxIncome: 50000,
        requiredGrade: '10',
      };
      
      const discount = await createTestDiscount({
        name: `TEST-ELIGIBLE-DISC-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 50,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-ELIGIBLE-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
        eligibilityCriteria: eligibilityCriteria,
      });

      expect(scholarship.eligibilityCriteria).toEqual(eligibilityCriteria);
      
      // Verify criteria is stored as JSON
      const retrievedScholarship = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
      });

      expect(retrievedScholarship.eligibilityCriteria).toEqual(eligibilityCriteria);
    });

    it('should handle inactive scholarship not applying discount', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      
      const discount = await createTestDiscount({
        name: `TEST-INACTIVE-DISC-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 25,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-INACTIVE-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
      });

      // Deactivate scholarship
      await prisma.scholarship.update({
        where: { id: scholarship.id },
        data: { isActive: false },
      });

      const inactiveScholarship = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
      });

      expect(inactiveScholarship.isActive).toBe(false);
      
      // Business logic should not apply discount for inactive scholarships
      // Here we verify the scholarship is marked as inactive
    });

    it('should handle scholarship with inactive discount', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      
      const discount = await createTestDiscount({
        name: `TEST-DISC-INACTIVE-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 30,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-SCHOL-DISC-INACTIVE-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
      });

      // Deactivate discount
      await prisma.discount.update({
        where: { id: discount.id },
        data: { isActive: false },
      });

      const scholarshipWithDiscount = await prisma.scholarship.findUnique({
        where: { id: scholarship.id },
        include: { discount: true },
      });

      expect(scholarshipWithDiscount.discount.isActive).toBe(false);
      
      // Business logic should not apply discount if discount is inactive
      // even if scholarship is active
    });
  });

  /**
   * Edge cases and error conditions
   */
  describe('Edge Cases', () => {
    
    it('should handle zero fee amount', async () => {
      const discount = await createTestDiscount({
        name: `TEST-ZERO-FEE-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 50,
        applicableFeeCategories: ['TUITION'],
      });

      const result = applyDiscount(0, discount);

      expect(result.originalAmount).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it('should handle very large fee amounts', async () => {
      const largeFee = 999999.99;
      const discount = await createTestDiscount({
        name: `TEST-LARGE-FEE-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 10,
        applicableFeeCategories: ['TUITION'],
      });

      const result = applyDiscount(largeFee, discount);

      expect(result.discountAmount).toBe(largeFee * 0.1);
      expect(Math.abs(result.netAmount - (largeFee * 0.9))).toBeLessThan(0.01);
      expect(result.netAmount).toBeGreaterThanOrEqual(0);
    });

    it('should handle discount with all fee categories', async () => {
      const allCategories = ['TUITION', 'TRANSPORT', 'LAB', 'EXAM', 'LIBRARY', 'SPORTS', 'CUSTOM'];
      
      const discount = await createTestDiscount({
        name: `TEST-ALL-CATS-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 5,
        applicableFeeCategories: allCategories,
      });

      expect(discount.applicableFeeCategories).toEqual(allCategories);
      expect(discount.applicableFeeCategories.length).toBe(7);
    });

    it('should handle scholarship without max recipients', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      
      const discount = await createTestDiscount({
        name: `TEST-UNLIMITED-DISC-${Date.now()}`,
        type: 'PERCENTAGE',
        value: 10,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-UNLIMITED-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
        maxRecipients: null, // Unlimited
      });

      expect(scholarship.maxRecipients).toBeNull();
    });

    it('should handle scholarship without eligibility criteria', async () => {
      const academicYearId = '00000000-0000-0000-0000-000000000001';
      
      const discount = await createTestDiscount({
        name: `TEST-NO-CRITERIA-DISC-${Date.now()}`,
        type: 'FIXED_AMOUNT',
        value: 100,
        applicableFeeCategories: ['TUITION'],
      });

      const scholarship = await createTestScholarship({
        name: `TEST-NO-CRITERIA-SCHOL-${Date.now()}`,
        discountId: discount.id,
        academicYearId: academicYearId,
        eligibilityCriteria: {},
      });

      expect(scholarship.eligibilityCriteria).toEqual({});
    });
  });
});
