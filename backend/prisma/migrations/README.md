# Finance Management Module - Database Migrations

## Overview

This directory contains database migrations for the Finance Management Module. The migrations create all necessary tables, relationships, indexes, and constraints for the comprehensive financial system.

## Migration: init_finance_module

**Created:** 2026-01-28

### Tables Created

#### Core Financial Tables
- **Account** - Chart of accounts with hierarchical structure
- **FeeStructure** - Fee structure configurations
- **FeeStructureItem** - Individual fee items within structures
- **Discount** - Discount configurations
- **Scholarship** - Scholarship programs
- **LateFeeRule** - Late fee calculation rules

#### Billing Tables
- **Invoice** - Student invoices
- **InvoiceItem** - Line items on invoices

#### Payment Tables
- **Payment** - Payment records
- **PaymentAllocation** - Payment-to-invoice allocations
- **Refund** - Refund requests and processing

#### Expense Management Tables
- **Expense** - Expense records
- **ExpenseAttachment** - File attachments for expenses
- **Vendor** - Vendor/supplier information

#### Budget Management Tables
- **Budget** - Budget plans
- **BudgetLine** - Individual budget line items

#### Payroll Tables
- **SalaryStructure** - Salary structure templates
- **SalaryComponent** - Allowances and deductions
- **Payroll** - Monthly payroll records
- **PayrollItem** - Individual staff payroll items
- **PayrollItemDetail** - Detailed breakdown of payroll components

#### Approval Workflow Tables
- **ApprovalWorkflow** - Workflow definitions
- **ApprovalStep** - Steps within workflows
- **ApprovalRequest** - Active approval requests
- **ApprovalAction** - Actions taken on approval requests

#### Audit and Accounting Tables
- **AuditLog** - Complete audit trail
- **Transaction** - Double-entry accounting transactions
- **TransactionLine** - Transaction line items (debits/credits)

### Enums Created

- **AccountType** - ASSET, LIABILITY, INCOME, EXPENSE
- **PaymentType** - ONE_TIME, RECURRING, INSTALLMENT
- **DiscountType** - PERCENTAGE, FIXED_AMOUNT
- **InvoiceStatus** - DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
- **PaymentMethod** - CASH, BANK_TRANSFER, MOBILE_MONEY, ONLINE
- **PaymentStatus** - PENDING, COMPLETED, FAILED, REFUNDED
- **RefundStatus** - PENDING, APPROVED, REJECTED, COMPLETED
- **ExpenseStatus** - DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID
- **RecurringFrequency** - MONTHLY, QUARTERLY, ANNUALLY
- **BudgetStatus** - DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, CLOSED
- **ComponentType** - ALLOWANCE, DEDUCTION
- **CalculationType** - FIXED, PERCENTAGE
- **PayrollStatus** - DRAFT, PENDING_APPROVAL, APPROVED, PAID
- **EntityType** - EXPENSE, REFUND, BUDGET, PAYROLL, SCHOLARSHIP
- **ApprovalStatus** - PENDING, APPROVED, REJECTED
- **ApprovalAction_Action** - APPROVED, REJECTED
- **AuditAction** - CREATE, UPDATE, DELETE, APPROVE, REJECT
- **TransactionSource** - INVOICE, PAYMENT, EXPENSE, PAYROLL, ADJUSTMENT
- **TransactionStatus** - PENDING, POSTED, REVERSED

### Indexes Created

All tables include appropriate indexes for:
- Primary keys (UUID)
- Foreign keys
- Frequently queried fields (status, dates, codes)
- Composite indexes for common query patterns

### Key Features

1. **Hierarchical Chart of Accounts** - Self-referencing parent-child relationships
2. **Double-Entry Accounting** - Transaction and TransactionLine tables enforce accounting principles
3. **Audit Trail** - Complete audit logging for all financial operations
4. **Approval Workflows** - Flexible multi-level approval system
5. **Multi-Campus Support** - Campus-specific financial tracking
6. **Soft Deletes** - Financial records are never hard-deleted

## Running Migrations

### Apply All Pending Migrations
```bash
npx prisma migrate dev
```

### Apply Migrations in Production
```bash
npx prisma migrate deploy
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

### View Migration Status
```bash
npx prisma migrate status
```

## Seeding Data

The finance module includes comprehensive seed data:

### Run Seed Script
```bash
npx prisma db seed
```

### Seed Data Includes

1. **Chart of Accounts Template**
   - Complete hierarchical account structure
   - Assets (Current Assets, Fixed Assets)
   - Liabilities (Current, Long-term)
   - Income (Fee Income, Other Income)
   - Expenses (Personnel, Operating, Academic, Administrative)

2. **Approval Workflows**
   - Expense approval workflow (2 levels)
   - Budget approval workflow
   - Refund approval workflow
   - Payroll approval workflow
   - Scholarship approval workflow

3. **Sample Vendors**
   - 3 sample vendor records for testing

4. **Salary Structures**
   - Standard teacher salary structure with allowances and deductions

5. **Late Fee Rules**
   - Percentage-based late fee rule (5%)
   - Fixed amount late fee rule ($50)

## Rollback

To rollback the last migration:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

## Schema Validation

To validate the schema without applying migrations:

```bash
npx prisma validate
```

## Generate Prisma Client

After any schema changes:

```bash
npx prisma generate
```

## Database Inspection

To inspect the current database state:

```bash
npx prisma db pull
```

## Notes

- All monetary amounts use `Decimal` type with precision (15, 2)
- All timestamps use `@db.Timestamptz` for timezone awareness
- All IDs use UUID v4 format
- Foreign key constraints include appropriate `onDelete` actions
- Indexes are optimized for common query patterns

## Troubleshooting

### Migration Failed
If a migration fails:
1. Check database connection
2. Review migration SQL in the migration file
3. Manually fix database if needed
4. Mark migration as resolved: `npx prisma migrate resolve --applied <migration_name>`

### Schema Out of Sync
If schema and database are out of sync:
```bash
npx prisma db push --force-reset  # Development only!
```

### Seed Errors
If seeding fails:
1. Check that migrations are applied
2. Verify database connection
3. Check for existing data conflicts
4. Review seed script logs for specific errors

## Related Files

- `schema.prisma` - Prisma schema definition
- `seed.js` - Main seed script
- `seeds/financeSeeds.js` - Finance module seed data
- `migrations/` - Migration history

## Support

For issues or questions about migrations:
1. Check Prisma documentation: https://www.prisma.io/docs
2. Review migration logs
3. Consult the Finance Management Module design document
