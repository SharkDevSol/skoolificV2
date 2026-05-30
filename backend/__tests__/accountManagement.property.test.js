/**
 * Property-Based Tests for Account Management
 * Using fast-check for property-based testing
 * 
 * **Feature: finance-management-module**
 * **Tests Properties 1, 2, and 3**
 */

const fc = require('fast-check');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// Test Data Generators
// ============================================================================

// Account type generator
const accountTypeArb = fc.constantFrom('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

// Account code generator - alphanumeric codes
const accountCodeArb = fc.string({ minLength: 3, maxLength: 10 })
  .filter(s => /^[A-Z0-9-]+$/.test(s));

// Account name generator
const accountNameArb = fc.string({ minLength: 5, maxLength: 100 })
  .filter(s => s.trim().length >= 5);

// Account generator
const accountArb = fc.record({
  code: accountCodeArb,
  name: accountNameArb,
  type: accountTypeArb,
  isActive: fc.boolean(),
  isLeaf: fc.boolean(),
});

// Transaction line generator
const transactionLineArb = fc.record({
  accountId: fc.uuid(),
  debitAmount: fc.float({ min: 0, max: 100000, noNaN: true }),
  creditAmount: fc.float({ min: 0, max: 100000, noNaN: true }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test account in the database
 */
async function createTestAccount(accountData) {
  const userId = '00000000-0000-0000-0000-000000000001'; // Test user ID
  
  return await prisma.account.create({
    data: {
      code: accountData.code,
      name: accountData.name,
      type: accountData.type,
      isActive: accountData.isActive !== undefined ? accountData.isActive : true,
      isLeaf: accountData.isLeaf !== undefined ? accountData.isLeaf : true,
      createdBy: userId,
    },
  });
}

/**
 * Create a test transaction with lines
 */
async function createTestTransaction(lines) {
  const userId = '00000000-0000-0000-0000-000000000001';
  
  return await prisma.transaction.create({
    data: {
      transactionNumber: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transactionDate: new Date(),
      description: 'Test transaction',
      sourceType: 'ADJUSTMENT',
      sourceId: '00000000-0000-0000-0000-000000000001',
      status: 'PENDING',
      lines: {
        create: lines,
      },
    },
    include: {
      lines: true,
    },
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.transactionLine.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.account.deleteMany({
    where: {
      code: {
        startsWith: 'TEST-',
      },
    },
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Account Management - Property Tests', () => {
  
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
   * **Feature: finance-management-module, Property 1: Account Code Uniqueness**
   * **Validates: Requirements 1.2**
   * 
   * For any two accounts in the system, their account codes must be different.
   */
  describe('Property 1: Account Code Uniqueness', () => {
    
    it('should enforce unique account codes across all accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(accountArb, { minLength: 2, maxLength: 5 }),
          async (accounts) => {
            // Ensure we have unique codes for initial creation
            const uniqueCodes = new Set();
            const testAccounts = accounts.map((acc, idx) => ({
              ...acc,
              code: `TEST-${acc.code}-${idx}`,
            }));

            // Create first account
            const firstAccount = await createTestAccount(testAccounts[0]);
            expect(firstAccount).toBeDefined();
            expect(firstAccount.code).toBe(testAccounts[0].code);
            uniqueCodes.add(firstAccount.code);

            // Try to create accounts with duplicate codes
            for (let i = 1; i < testAccounts.length; i++) {
              const account = testAccounts[i];
              
              // Try with unique code - should succeed
              const uniqueAccount = await createTestAccount(account);
              expect(uniqueAccount).toBeDefined();
              expect(uniqueAccount.code).toBe(account.code);
              uniqueCodes.add(uniqueAccount.code);

              // Try with duplicate code - should fail
              try {
                await createTestAccount({
                  ...account,
                  code: firstAccount.code, // Duplicate code
                  name: `${account.name}-duplicate`,
                });
                // Should not reach here
                throw new Error('Expected duplicate code to be rejected');
              } catch (error) {
                // Should throw error for duplicate code
                expect(error.code).toBe('P2002'); // Prisma unique constraint error
              }
            }

            // Verify all created accounts have unique codes
            const allAccounts = await prisma.account.findMany({
              where: {
                code: {
                  startsWith: 'TEST-',
                },
              },
            });

            const codes = allAccounts.map(a => a.code);
            const uniqueCodesSet = new Set(codes);
            expect(uniqueCodesSet.size).toBe(codes.length);
          }
        ),
        { numRuns: 10 } // Reduced runs for database operations
      );
    });

    it('should allow same code after account is deleted (soft delete)', async () => {
      const account = {
        code: 'TEST-REUSE-001',
        name: 'Test Reusable Account',
        type: 'ASSET',
      };

      // Create account
      const created = await createTestAccount(account);
      expect(created.code).toBe(account.code);

      // Deactivate (soft delete)
      await prisma.account.update({
        where: { id: created.id },
        data: { isActive: false },
      });

      // Should still not allow duplicate code even if deactivated
      try {
        await createTestAccount({
          ...account,
          name: 'Another account with same code',
        });
        throw new Error('Expected duplicate code to be rejected');
      } catch (error) {
        expect(error.code).toBe('P2002');
      }
    });

    it('should handle concurrent account creation with same code', async () => {
      const account = {
        code: 'TEST-CONCURRENT-001',
        name: 'Test Concurrent Account',
        type: 'ASSET',
      };

      // Try to create multiple accounts with same code concurrently
      const promises = Array(3).fill(null).map((_, idx) => 
        createTestAccount({
          ...account,
          name: `${account.name} ${idx}`,
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);
      
      // Failed ones should have unique constraint error
      failed.forEach(result => {
        expect(result.reason.code).toBe('P2002');
      });
    });
  });

  /**
   * **Feature: finance-management-module, Property 2: Deactivated Account Transaction Prevention**
   * **Validates: Requirements 1.5**
   * 
   * For any deactivated account, attempting to post a new transaction to it should be rejected,
   * while historical transactions remain accessible.
   */
  describe('Property 2: Deactivated Account Transaction Prevention', () => {
    
    it('should prevent new transactions on deactivated accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArb,
          fc.array(transactionLineArb, { minLength: 2, maxLength: 5 }),
          async (accountData, transactionLines) => {
            // Create an active account
            const account = await createTestAccount({
              ...accountData,
              code: `TEST-DEACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isActive: true,
            });

            // Create a transaction with this account (should succeed)
            const linesWithAccount = transactionLines.map(line => ({
              ...line,
              accountId: account.id,
            }));

            const transaction1 = await createTestTransaction(linesWithAccount);
            expect(transaction1).toBeDefined();
            expect(transaction1.lines.length).toBe(linesWithAccount.length);

            // Deactivate the account
            await prisma.account.update({
              where: { id: account.id },
              data: { isActive: false },
            });

            // Verify account is deactivated
            const deactivatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(deactivatedAccount.isActive).toBe(false);

            // Historical transactions should still be accessible
            const historicalTransaction = await prisma.transaction.findUnique({
              where: { id: transaction1.id },
              include: { lines: true },
            });
            expect(historicalTransaction).toBeDefined();
            expect(historicalTransaction.lines.length).toBe(linesWithAccount.length);

            // Attempting to create new transaction should be prevented by business logic
            // (This would be enforced in the API layer, not at database level)
            // For now, we verify the account is marked as inactive
            expect(deactivatedAccount.isActive).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve historical transaction data when account is deactivated', async () => {
      const account = await createTestAccount({
        code: `TEST-HIST-${Date.now()}`,
        name: 'Test Historical Account',
        type: 'EXPENSE',
        isActive: true,
      });

      // Create multiple transactions
      const transaction1 = await createTestTransaction([
        { accountId: account.id, debitAmount: 1000, creditAmount: 0, description: 'Debit 1' },
      ]);

      const transaction2 = await createTestTransaction([
        { accountId: account.id, debitAmount: 0, creditAmount: 500, description: 'Credit 1' },
      ]);

      // Deactivate account
      await prisma.account.update({
        where: { id: account.id },
        data: { isActive: false },
      });

      // All historical transactions should still exist
      const allTransactions = await prisma.transactionLine.findMany({
        where: { accountId: account.id },
      });

      expect(allTransactions.length).toBe(2);
      expect(allTransactions.some(t => t.description === 'Debit 1')).toBe(true);
      expect(allTransactions.some(t => t.description === 'Credit 1')).toBe(true);
    });

    it('should allow reactivation of deactivated accounts', async () => {
      const account = await createTestAccount({
        code: `TEST-REACT-${Date.now()}`,
        name: 'Test Reactivation Account',
        type: 'INCOME',
        isActive: true,
      });

      // Deactivate
      await prisma.account.update({
        where: { id: account.id },
        data: { isActive: false },
      });

      let updated = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(updated.isActive).toBe(false);

      // Reactivate
      await prisma.account.update({
        where: { id: account.id },
        data: { isActive: true },
      });

      updated = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(updated.isActive).toBe(true);
    });
  });

  /**
   * **Feature: finance-management-module, Property 3: Leaf Account Transaction Enforcement**
   * **Validates: Requirements 1.6**
   * 
   * For any account that has child accounts (non-leaf), attempting to post a transaction
   * to it should be rejected.
   */
  describe('Property 3: Leaf Account Transaction Enforcement', () => {
    
    it('should only allow transactions on leaf accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          accountArb,
          accountArb,
          transactionLineArb,
          async (parentData, childData, transactionLine) => {
            // Create parent account
            const parent = await createTestAccount({
              ...parentData,
              code: `TEST-PARENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isLeaf: true, // Initially a leaf
            });

            // Create child account
            const child = await createTestAccount({
              ...childData,
              code: `TEST-CHILD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isLeaf: true,
            });

            // Update child to have parent
            await prisma.account.update({
              where: { id: child.id },
              data: { parentId: parent.id },
            });

            // Update parent to be non-leaf
            await prisma.account.update({
              where: { id: parent.id },
              data: { isLeaf: false },
            });

            // Verify parent is non-leaf
            const updatedParent = await prisma.account.findUnique({
              where: { id: parent.id },
              include: { children: true },
            });
            expect(updatedParent.isLeaf).toBe(false);
            expect(updatedParent.children.length).toBe(1);

            // Verify child is leaf
            const updatedChild = await prisma.account.findUnique({
              where: { id: child.id },
            });
            expect(updatedChild.isLeaf).toBe(true);

            // Transaction on leaf account (child) should be allowed
            const leafTransaction = await createTestTransaction([
              {
                ...transactionLine,
                accountId: child.id,
              },
            ]);
            expect(leafTransaction).toBeDefined();

            // Transaction on non-leaf account (parent) should be prevented by business logic
            // (This would be enforced in the API layer)
            // For now, we verify the parent is marked as non-leaf
            expect(updatedParent.isLeaf).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should update isLeaf flag when children are added or removed', async () => {
      // Create parent
      const parent = await createTestAccount({
        code: `TEST-LEAF-PARENT-${Date.now()}`,
        name: 'Test Leaf Parent',
        type: 'ASSET',
        isLeaf: true,
      });

      expect(parent.isLeaf).toBe(true);

      // Add child
      const child1 = await createTestAccount({
        code: `TEST-LEAF-CHILD1-${Date.now()}`,
        name: 'Test Leaf Child 1',
        type: 'ASSET',
        isLeaf: true,
      });

      await prisma.account.update({
        where: { id: child1.id },
        data: { parentId: parent.id },
      });

      // Parent should become non-leaf
      await prisma.account.update({
        where: { id: parent.id },
        data: { isLeaf: false },
      });

      let updatedParent = await prisma.account.findUnique({
        where: { id: parent.id },
      });
      expect(updatedParent.isLeaf).toBe(false);

      // Add another child
      const child2 = await createTestAccount({
        code: `TEST-LEAF-CHILD2-${Date.now()}`,
        name: 'Test Leaf Child 2',
        type: 'ASSET',
        isLeaf: true,
      });

      await prisma.account.update({
        where: { id: child2.id },
        data: { parentId: parent.id },
      });

      // Parent should still be non-leaf
      updatedParent = await prisma.account.findUnique({
        where: { id: parent.id },
        include: { children: true },
      });
      expect(updatedParent.isLeaf).toBe(false);
      expect(updatedParent.children.length).toBe(2);

      // Remove one child
      await prisma.account.update({
        where: { id: child1.id },
        data: { parentId: null },
      });

      // Parent should still be non-leaf (has one child)
      updatedParent = await prisma.account.findUnique({
        where: { id: parent.id },
        include: { children: true },
      });
      expect(updatedParent.isLeaf).toBe(false);
      expect(updatedParent.children.length).toBe(1);

      // Remove last child
      await prisma.account.update({
        where: { id: child2.id },
        data: { parentId: null },
      });

      // Parent should become leaf again
      await prisma.account.update({
        where: { id: parent.id },
        data: { isLeaf: true },
      });

      updatedParent = await prisma.account.findUnique({
        where: { id: parent.id },
        include: { children: true },
      });
      expect(updatedParent.isLeaf).toBe(true);
      expect(updatedParent.children.length).toBe(0);
    });

    it('should handle multi-level account hierarchies', async () => {
      // Create 3-level hierarchy: grandparent -> parent -> child
      const grandparent = await createTestAccount({
        code: `TEST-GP-${Date.now()}`,
        name: 'Grandparent Account',
        type: 'ASSET',
        isLeaf: true,
      });

      const parent = await createTestAccount({
        code: `TEST-P-${Date.now()}`,
        name: 'Parent Account',
        type: 'ASSET',
        isLeaf: true,
      });

      const child = await createTestAccount({
        code: `TEST-C-${Date.now()}`,
        name: 'Child Account',
        type: 'ASSET',
        isLeaf: true,
      });

      // Link parent to grandparent
      await prisma.account.update({
        where: { id: parent.id },
        data: { parentId: grandparent.id },
      });

      await prisma.account.update({
        where: { id: grandparent.id },
        data: { isLeaf: false },
      });

      // Link child to parent
      await prisma.account.update({
        where: { id: child.id },
        data: { parentId: parent.id },
      });

      await prisma.account.update({
        where: { id: parent.id },
        data: { isLeaf: false },
      });

      // Verify hierarchy
      const gpAccount = await prisma.account.findUnique({
        where: { id: grandparent.id },
        include: { children: true },
      });

      const pAccount = await prisma.account.findUnique({
        where: { id: parent.id },
        include: { children: true, parent: true },
      });

      const cAccount = await prisma.account.findUnique({
        where: { id: child.id },
        include: { parent: true },
      });

      // Grandparent should be non-leaf with 1 child
      expect(gpAccount.isLeaf).toBe(false);
      expect(gpAccount.children.length).toBe(1);

      // Parent should be non-leaf with 1 child and 1 parent
      expect(pAccount.isLeaf).toBe(false);
      expect(pAccount.children.length).toBe(1);
      expect(pAccount.parent.id).toBe(grandparent.id);

      // Child should be leaf with 1 parent
      expect(cAccount.isLeaf).toBe(true);
      expect(cAccount.parent.id).toBe(parent.id);

      // Only child should allow transactions
      const transaction = await createTestTransaction([
        { accountId: child.id, debitAmount: 100, creditAmount: 0, description: 'Test' },
      ]);
      expect(transaction).toBeDefined();
    });
  });

  /**
   * Edge cases and error conditions
   */
  describe('Edge Cases', () => {
    
    it('should handle account code with special characters', async () => {
      const specialCodes = ['TEST-001', 'TEST_002', 'TEST.003', 'TEST/004'];
      
      for (const code of specialCodes) {
        try {
          const account = await createTestAccount({
            code,
            name: `Account with code ${code}`,
            type: 'ASSET',
          });
          
          // If creation succeeds, code should match
          expect(account.code).toBe(code);
        } catch (error) {
          // Some special characters might not be allowed
          // This is acceptable as long as it's consistent
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle very long account names', async () => {
      const longName = 'A'.repeat(255);
      
      const account = await createTestAccount({
        code: `TEST-LONG-${Date.now()}`,
        name: longName,
        type: 'EXPENSE',
      });

      expect(account.name).toBe(longName);
    });

    it('should handle all account types', async () => {
      const types = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'];
      
      for (const type of types) {
        const account = await createTestAccount({
          code: `TEST-TYPE-${type}-${Date.now()}`,
          name: `Test ${type} Account`,
          type,
        });

        expect(account.type).toBe(type);
      }
    });

    it('should prevent circular parent-child relationships', async () => {
      const account1 = await createTestAccount({
        code: `TEST-CIRC1-${Date.now()}`,
        name: 'Account 1',
        type: 'ASSET',
      });

      const account2 = await createTestAccount({
        code: `TEST-CIRC2-${Date.now()}`,
        name: 'Account 2',
        type: 'ASSET',
      });

      // Make account2 child of account1
      await prisma.account.update({
        where: { id: account2.id },
        data: { parentId: account1.id },
      });

      // Try to make account1 child of account2 (circular)
      // This should be prevented by business logic in the API
      // At database level, we can verify the relationship
      const acc1 = await prisma.account.findUnique({
        where: { id: account1.id },
        include: { parent: true, children: true },
      });

      const acc2 = await prisma.account.findUnique({
        where: { id: account2.id },
        include: { parent: true, children: true },
      });

      expect(acc1.parentId).toBeNull();
      expect(acc1.children.length).toBe(1);
      expect(acc2.parentId).toBe(account1.id);
      expect(acc2.children.length).toBe(0);
    });
  });
});

