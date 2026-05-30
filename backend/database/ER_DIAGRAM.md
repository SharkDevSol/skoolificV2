# Entity Relationship Diagram - School ERP System

## Module Relationships Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SCHOOL ERP SYSTEM                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   FINANCE     │◄────────►│   INVENTORY   │          │     ASSETS    │
│  MANAGEMENT   │          │  & STOCK      │          │  MANAGEMENT   │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                          ┌───────────────┐
                          │   HR & STAFF  │
                          │  MANAGEMENT   │
                          └───────────────┘
```

---

## 1. FINANCE MODULE - Entity Relationships

### Core Entities
```
chart_of_accounts (Parent-Child Hierarchy)
    │
    ├──► fee_structures
    ├──► journal_entry_lines
    ├──► budgets
    └──► payment_reconciliations

fee_structures
    │
    ├──► student_fee_assignments
    └──► invoice_line_items

discount_rules ──► student_fee_assignments
late_fee_rules ──► invoices

student_fee_assignments ──► invoices

invoices
    │
    ├──► invoice_line_items
    ├──► payments
    └──► journal_entries (auto-generated)

payments ──► journal_entries (auto-generated)

journal_entries
    │
    └──► journal_entry_lines

budgets ──► budget_actuals
```

### Key Relationships
- **Chart of Accounts**: Self-referencing (parent_account_id) for multi-level hierarchy
- **Invoices → Payments**: One-to-Many (partial payments supported)
- **Invoices → Journal Entries**: One-to-One (auto-generated on posting)
- **Fee Structures → Student Assignments**: Many-to-Many through student_fee_assignments

---

## 2. INVENTORY MODULE - Entity Relationships

### Core Entities
```
inventory_items
    │
    ├──► purchase_request_items
    ├──► purchase_order_items
    ├──► grn_items
    ├──► stock_ledger
    ├──► stock_issuance_items
    ├──► stock_transfer_items
    └──► stock_adjustment_items

suppliers
    │
    ├──► purchase_orders
    └──► goods_receipt_notes

stores
    │
    ├──► stock_ledger
    ├──► goods_receipt_notes
    ├──► stock_issuances
    └──► stock_transfers (from/to)

purchase_requests
    │
    ├──► purchase_request_items
    └──► purchase_orders (conversion)

purchase_orders
    │
    ├──► purchase_order_items
    └──► goods_receipt_notes

goods_receipt_notes
    │
    ├──► grn_items
    └──► stock_ledger (auto-update)

stock_issuances ──► stock_issuance_items ──► stock_ledger
stock_transfers ──► stock_transfer_items ──► stock_ledger
stock_adjustments ──► stock_adjustment_items ──► stock_ledger
```

### Key Relationships
- **Purchase Request → Purchase Order**: One-to-One conversion workflow
- **Purchase Order → GRN**: One-to-Many (partial receipts)
- **Stock Ledger**: Central table tracking all inventory movements
- **Batch Tracking**: batch_number field in stock_ledger for FIFO/LIFO

---

## 3. ASSET MANAGEMENT MODULE - Entity Relationships

### Core Entities
```
asset_categories (Parent-Child Hierarchy)
    │
    └──► assets

assets
    │
    ├──► asset_assignments
    ├──► maintenance_schedules
    ├──► maintenance_logs
    ├──► depreciation_schedules
    ├──► asset_disposals
    └──► asset_valuations

maintenance_schedules ──► maintenance_logs

depreciation_schedules ──► journal_entries (integration)

asset_disposals ──► journal_entries (integration)
```

### Key Relationships
- **Asset Categories**: Self-referencing for hierarchy
- **Assets → Assignments**: One-to-Many (assignment history)
- **Assets → Depreciation**: One-to-Many (periodic depreciation)
- **Depreciation → Finance**: Integration through journal_entries

---

## 4. HR & STAFF MODULE - Entity Relationships

### Core Entities
```
roles (Parent-Child Hierarchy)
    │
    ├──► job_positions
    └──► employees

departments (Parent-Child Hierarchy)
    │
    ├──► job_positions
    └──► employees

job_positions
    │
    ├──► job_postings
    └──► employees

job_postings ──► job_applications ──► employees (conversion)

employees
    │
    ├──► employee_shifts
    ├──► attendance_records
    ├──► leave_applications
    ├──► leave_balances
    ├──► employee_salary_structures
    ├──► payroll_details
    ├──► performance_reviews
    ├──► employee_training
    └──► asset_assignments (integration)

shifts ──► employee_shifts ──► attendance_records

attendance_devices ──► attendance_records

leave_types ──► leave_balances
leave_types ──► leave_applications

salary_components ──► employee_salary_structures
salary_components ──► payroll_component_details

payroll_runs
    │
    └──► payroll_details
            │
            └──► payroll_component_details

tax_slabs ──► payroll_details (calculation)

training_programs ──► employee_training
```

### Key Relationships
- **Roles & Departments**: Self-referencing hierarchies
- **Job Application → Employee**: One-to-One conversion
- **Attendance → Payroll**: Integration through attendance summary
- **Employee → Multiple Modules**: Central entity linking to various subsystems

---

## 5. CROSS-MODULE INTEGRATIONS

### Finance ↔ Inventory
```
inventory_items.account_id ──► chart_of_accounts.id
stock_ledger ──► journal_entries (auto-generated)
purchase_orders ──► journal_entries (on GRN posting)
```

### Finance ↔ Assets
```
asset_categories.account_id ──► chart_of_accounts.id
asset_categories.accumulated_depreciation_account_id ──► chart_of_accounts.id
asset_categories.depreciation_expense_account_id ──► chart_of_accounts.id
depreciation_schedules.journal_entry_id ──► journal_entries.id
asset_disposals.journal_entry_id ──► journal_entries.id
```

### Finance ↔ HR
```
salary_components.account_id ──► chart_of_accounts.id
payroll_runs ──► journal_entries (on payroll posting)
```

### HR ↔ Assets
```
employees.id ──► assets.assigned_to
employees.id ──► asset_assignments.assigned_to
```

### Inventory ↔ Suppliers (External)
```
suppliers.id ──► purchase_orders.supplier_id
suppliers.id ──► goods_receipt_notes.supplier_id
```

---

## Database Constraints & Indexes

### Primary Keys
- All tables use `SERIAL PRIMARY KEY` for auto-incrementing IDs

### Foreign Keys
- All relationships use `REFERENCES` with appropriate `ON DELETE` actions
- Most use `ON DELETE CASCADE` for dependent data
- Some use `ON DELETE SET NULL` for optional relationships

### Unique Constraints
- Document numbers (invoice_number, po_number, etc.)
- Codes (account_code, item_code, employee_code, etc.)
- Email addresses where applicable

### Indexes
- Foreign key columns
- Status columns (for filtering)
- Date columns (for range queries)
- Composite indexes on frequently queried combinations

### Check Constraints
- Enum-like values (status, type fields)
- Positive amounts and quantities
- Date range validations

---

## Data Integrity Rules

1. **Double-Entry Bookkeeping**: total_debit = total_credit in journal_entries
2. **Stock Balance**: Maintained through stock_ledger triggers
3. **Invoice Balance**: paid_amount + balance_amount = net_amount
4. **Payroll Calculation**: gross_salary - total_deductions = net_salary
5. **Asset Value**: purchase_cost - accumulated_depreciation = current_value
6. **Leave Balance**: opening + earned - used = balance
