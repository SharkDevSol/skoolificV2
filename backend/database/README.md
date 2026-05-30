# School ERP System - Database & API Documentation

## 📋 Overview

This directory contains the complete database schema and API architecture for five core ERP modules:

1. **Finance Management** - Chart of Accounts, Fee Management, Billing & Payments, Budgeting
2. **Inventory & Stock** - Procurement, Inventory Control, Store Management
3. **Property & Asset Management** - Asset Registry, Lifecycle, Depreciation
4. **HR & Staff Management** - Dynamic Roles, Recruitment (ATS), Attendance, Payroll
5. **Module Integrations** - Cross-module data flows and automation

---

## 📁 File Structure

```
backend/database/
├── README.md                          # This file
├── ER_DIAGRAM.md                      # Entity relationship diagrams
├── IMPLEMENTATION_GUIDE.md            # Step-by-step implementation guide
├── 01_finance_schema.sql              # Finance module tables
├── 02_inventory_schema.sql            # Inventory module tables
├── 03_asset_management_schema.sql     # Asset management tables
├── 04_hr_staff_schema.sql             # HR & Staff tables
└── 05_integration_schema.sql          # Integration views & triggers

backend/
└── API_ARCHITECTURE.md                # Complete API endpoint documentation
```

---

## 🗄️ Database Schema Summary

### Finance Management (25 tables)
- **Chart of Accounts**: Multi-level hierarchy for Assets, Liabilities, Income, Expenses
- **Fee Management**: Structures, discounts, late fees, student assignments
- **Billing**: Invoices, line items, payments, reconciliation
- **Accounting**: Journal entries (double-entry), budget tracking
- **Key Features**: Automated journal entries, partial payments, budget vs actual

### Inventory & Stock (20 tables)
- **Item Master**: Items with batch/expiry tracking, FIFO/LIFO valuation
- **Procurement**: Purchase Requests → Purchase Orders → GRN workflow
- **Stock Operations**: Issuance, transfers, adjustments
- **Stores**: Multi-store capability with real-time stock ledger
- **Key Features**: Automated stock balance updates, reorder alerts, valuation

### Property & Asset Management (10 tables)
- **Asset Registry**: QR/Barcode tagging, warranty tracking
- **Lifecycle**: Assignment history, maintenance logs
- **Depreciation**: Auto-calculation (Straight-line, Declining balance)
- **Disposal**: Write-offs with gain/loss calculation
- **Key Features**: Integrated with Finance, maintenance scheduling

### HR & Staff Management (25 tables)
- **Dynamic Structure**: No-code role & department builder
- **Recruitment**: Full ATS from application to offer
- **Attendance**: Biometric/RFID integration, shift management
- **Payroll**: Automated calculation with attendance, allowances, deductions, tax
- **Leave**: Balance tracking, approval workflow
- **Key Features**: Attendance → Payroll integration, performance reviews, training

### Integration Layer (4 views)
- Finance ↔ Inventory: Auto journal entries for stock movements
- Finance ↔ Assets: Depreciation posting to accounts
- HR ↔ Finance: Payroll posting to accounts
- Attendance ↔ Payroll: Automated salary calculation

---

## 🔌 API Architecture Summary

### Base URL Pattern
```
/api/{module}/{resource}
```

### Total Endpoints: 150+

#### Finance Module (40+ endpoints)
- Chart of Accounts: CRUD + hierarchy + financial statements
- Fee Management: Structures, discounts, late fees, assignments
- Invoicing: Generate, update, cancel, PDF export
- Payments: Record, refund, reconciliation
- Budgeting: Create, approve, variance analysis
- Reports: Trial balance, cash flow, aging, revenue/expense analysis

#### Inventory Module (35+ endpoints)
- Item Master: CRUD + stock levels + valuation
- Procurement: PR → PO → GRN workflow
- Stock Operations: Issuance, transfers, adjustments
- Reports: Stock summary, reorder list, expiry alerts, valuation

#### Asset Module (25+ endpoints)
- Registry: CRUD + QR/barcode generation
- Assignment: Assign, return, transfer
- Maintenance: Schedules, logs, due/overdue tracking
- Depreciation: Calculate, post to accounting
- Disposal: Request, approve, complete

#### HR Module (50+ endpoints)
- Structure: Roles, departments, positions
- Recruitment: Job postings, applications, ATS workflow
- Employees: CRUD + profile management
- Attendance: Devices, shifts, records, bulk import
- Leave: Types, balances, applications, approval
- Payroll: Components, salary structure, processing, payslips
- Performance: Reviews, training programs

---

## 🚀 Quick Start

### 1. Database Setup
```bash
# Create database
createdb school_erp

# Run migrations in order
psql -U postgres -d school_erp -f 01_finance_schema.sql
psql -U postgres -d school_erp -f 02_inventory_schema.sql
psql -U postgres -d school_erp -f 03_asset_management_schema.sql
psql -U postgres -d school_erp -f 04_hr_staff_schema.sql
psql -U postgres -d school_erp -f 05_integration_schema.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

### 3. Frontend Setup
```bash
cd APP
npm install
npm run dev
```

---

## 🔑 Key Features

### Data Integrity
- ✅ Foreign key constraints with cascading
- ✅ Check constraints for enums and validations
- ✅ Unique constraints on codes and document numbers
- ✅ Triggers for automated calculations
- ✅ Double-entry bookkeeping validation

### Automation
- ✅ Auto-generate document numbers (invoices, POs, etc.)
- ✅ Auto-update stock balances on transactions
- ✅ Auto-calculate depreciation
- ✅ Auto-post journal entries from transactions
- ✅ Auto-calculate payroll from attendance

### Scalability
- ✅ Indexed foreign keys and status columns
- ✅ Partitioning-ready date columns
- ✅ Efficient hierarchical queries
- ✅ Materialized views for reports
- ✅ Pagination support in APIs

### Security
- ✅ Role-based access control
- ✅ Audit trails (created_by, updated_at)
- ✅ Soft deletes where appropriate
- ✅ Input validation
- ✅ SQL injection prevention

---

## 📊 Database Statistics

- **Total Tables**: 80+
- **Total Views**: 5
- **Total Indexes**: 60+
- **Total Triggers**: 10+
- **Total Functions**: 5+

---

## 🔗 Module Integrations

### Finance ↔ Inventory
```sql
-- Inventory transactions automatically create journal entries
stock_ledger → journal_entries
purchase_orders → journal_entries (on GRN)
```

### Finance ↔ Assets
```sql
-- Asset depreciation posts to accounting
depreciation_schedules → journal_entries
asset_disposals → journal_entries
```

### HR ↔ Finance
```sql
-- Payroll posts to accounting
payroll_runs → journal_entries
```

### Attendance ↔ Payroll
```sql
-- Attendance data feeds payroll calculation
attendance_records → payroll_details (days_worked, overtime)
```

---

## 📈 Reporting Capabilities

### Financial Reports
- Balance Sheet
- Income Statement
- Cash Flow Statement
- Trial Balance
- Accounts Receivable Aging
- Budget vs Actual
- Revenue/Expense Analysis

### Inventory Reports
- Stock Summary by Item/Store
- Reorder Level Alerts
- Expiry Alerts
- Slow-Moving Items
- Inventory Valuation
- Transaction History

### Asset Reports
- Asset Register
- Depreciation Summary
- Maintenance Cost Analysis
- Asset Utilization
- Warranty Expiry Alerts

### HR Reports
- Headcount Report
- Attendance Summary
- Leave Summary
- Payroll Summary
- Employee Turnover
- Training Effectiveness

---

## 🛠️ Technology Stack

- **Database**: PostgreSQL 14+
- **Backend**: Node.js + Express
- **ORM**: Prisma
- **Frontend**: React (Vite) + CSS Modules
- **Authentication**: JWT
- **File Storage**: Local/Cloud (configurable)

---

## 📝 Next Steps

1. Review `ER_DIAGRAM.md` for detailed entity relationships
2. Check `API_ARCHITECTURE.md` for complete endpoint documentation
3. Follow `IMPLEMENTATION_GUIDE.md` for step-by-step setup
4. Execute SQL files in numbered order
5. Configure backend environment variables
6. Run database migrations
7. Seed initial data
8. Test API endpoints
9. Build frontend components
10. Deploy to production

---

## 📞 Support

For implementation questions or issues:
1. Review the implementation guide
2. Check API documentation
3. Verify database schema
4. Test with sample data
5. Review error logs

---

## 📄 License

Proprietary - School Management System
