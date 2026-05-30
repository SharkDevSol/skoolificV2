-- =====================================================
-- FINANCE MANAGEMENT MODULE
-- =====================================================

-- Chart of Accounts (Multi-level hierarchy)
CREATE TABLE chart_of_accounts (
    id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    parent_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- Fee Structure Configuration
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    grade_level VARCHAR(50),
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('TUITION', 'TRANSPORT', 'LIBRARY', 'LAB', 'SPORTS', 'OTHER')),
    amount DECIMAL(12, 2) NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount Rules
CREATE TABLE discount_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(50) CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'SIBLING', 'SCHOLARSHIP', 'EARLY_BIRD')),
    value DECIMAL(10, 2) NOT NULL,
    applicable_fee_types TEXT[],
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Penalty/Late Fee Rules
CREATE TABLE late_fee_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grace_period_days INTEGER DEFAULT 0,
    penalty_type VARCHAR(50) CHECK (penalty_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'DAILY_RATE')),
    penalty_value DECIMAL(10, 2) NOT NULL,
    max_penalty_amount DECIMAL(12, 2),
    applicable_fee_types TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Fee Assignments
CREATE TABLE student_fee_assignments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    discount_rule_id INTEGER REFERENCES discount_rules(id),
    academic_year VARCHAR(20) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    student_id INTEGER NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_student ON invoices(student_id);
CREATE INDEX idx_invoice_status ON invoices(status);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id)
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    student_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'MOBILE_MONEY')),
    reference_number VARCHAR(100),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    notes TEXT,
    received_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_invoice ON payments(invoice_id);
CREATE INDEX idx_payment_student ON payments(student_id);

-- Journal Entries (Double-entry bookkeeping)
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50) CHECK (entry_type IN ('STANDARD', 'ADJUSTMENT', 'CLOSING', 'REVERSAL')),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    description TEXT,
    total_debit DECIMAL(12, 2) NOT NULL,
    total_credit DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    created_by INTEGER,
    posted_by INTEGER,
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(12, 2) DEFAULT 0,
    credit_amount DECIMAL(12, 2) DEFAULT 0,
    description TEXT,
    line_number INTEGER
);

-- Budget Management
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    budget_name VARCHAR(255) NOT NULL,
    fiscal_year VARCHAR(20) NOT NULL,
    department VARCHAR(100),
    account_id INTEGER REFERENCES chart_of_accounts(id),
    budgeted_amount DECIMAL(12, 2) NOT NULL,
    period_type VARCHAR(50) CHECK (period_type IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED')),
    notes TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget vs Actual Tracking
CREATE TABLE budget_actuals (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    actual_amount DECIMAL(12, 2) DEFAULT 0,
    variance_amount DECIMAL(12, 2),
    variance_percentage DECIMAL(5, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Reconciliation
CREATE TABLE payment_reconciliations (
    id SERIAL PRIMARY KEY,
    reconciliation_date DATE NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    bank_statement_balance DECIMAL(12, 2),
    book_balance DECIMAL(12, 2),
    reconciled_balance DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'REVIEWED')),
    reconciled_by INTEGER,
    reviewed_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
