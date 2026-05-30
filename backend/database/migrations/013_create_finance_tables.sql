-- Migration 013: Create finance management tables
-- Supports fee structures, invoices, payments, expenses, and budgets

-- UP

-- Create fee structures table
CREATE TABLE IF NOT EXISTS fee_structures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  grade_level VARCHAR(50),
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  fee_type VARCHAR(50) NOT NULL, -- 'TUITION', 'TRANSPORT', 'LIBRARY', 'LAB', 'SPORTS', 'OTHER'
  amount DECIMAL(12, 2) NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50), -- 'MONTHLY', 'QUARTERLY', 'ANNUALLY'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_fee_type CHECK (fee_type IN ('TUITION', 'TRANSPORT', 'LIBRARY', 'LAB', 'SPORTS', 'UNIFORM', 'EXAM', 'OTHER'))
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER,
  total_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  outstanding_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue', 'cancelled'
  due_date DATE,
  due_date_ethiopian JSONB,
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_invoice_status CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'))
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'CARD'
  payment_date DATE NOT NULL,
  payment_date_ethiopian JSONB,
  reference_number VARCHAR(100),
  notes TEXT,
  received_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_payment_method CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'CARD', 'OTHER')),
  CONSTRAINT check_payment_sync CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed'))
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'SALARY', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'TRANSPORT', 'OTHER'
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  expense_date DATE NOT NULL,
  expense_date_ethiopian JSONB,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  approved_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  budget_name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  category VARCHAR(100) NOT NULL,
  allocated_amount DECIMAL(12, 2) NOT NULL,
  spent_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'exceeded'
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_budget_status CHECK (status IN ('active', 'completed', 'exceeded'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fee_structures_year ON fee_structures(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_active ON fee_structures(is_active);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_year ON invoices(academic_year);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_sync ON payments(sync_status);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(approval_status);

CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(academic_year);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fee_structures_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fee_structures_timestamp
BEFORE UPDATE ON fee_structures
FOR EACH ROW
EXECUTE FUNCTION update_fee_structures_timestamp();

CREATE OR REPLACE FUNCTION update_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_timestamp();

CREATE OR REPLACE FUNCTION update_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_timestamp
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_timestamp();

CREATE OR REPLACE FUNCTION update_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expenses_timestamp
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_timestamp();

CREATE OR REPLACE FUNCTION update_budgets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budgets_timestamp
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION update_budgets_timestamp();

COMMENT ON TABLE fee_structures IS 'Stores fee structure configuration for different grades and fee types';
COMMENT ON COLUMN fee_structures.recurrence_pattern IS 'How often fee recurs: MONTHLY, QUARTERLY, ANNUALLY';

COMMENT ON TABLE invoices IS 'Stores student fee invoices with payment tracking';
COMMENT ON COLUMN invoices.status IS 'Invoice status: pending, partial (partially paid), paid, overdue, cancelled';

COMMENT ON TABLE payments IS 'Stores payment records for student invoices';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: CASH, BANK_TRANSFER, MOBILE_MONEY, CHEQUE, CARD, OTHER';
COMMENT ON COLUMN payments.sync_status IS 'Offline sync status: pending, syncing, synced, failed';

COMMENT ON TABLE expenses IS 'Stores school expense records with approval workflow';
COMMENT ON COLUMN expenses.approval_status IS 'Approval status: pending, approved, rejected';

COMMENT ON TABLE budgets IS 'Stores budget allocations and tracking for different categories';
COMMENT ON COLUMN budgets.status IS 'Budget status: active, completed, exceeded';

-- DOWN
DROP TRIGGER IF EXISTS trigger_update_budgets_timestamp ON budgets;
DROP FUNCTION IF EXISTS update_budgets_timestamp();
DROP TRIGGER IF EXISTS trigger_update_expenses_timestamp ON expenses;
DROP FUNCTION IF EXISTS update_expenses_timestamp();
DROP TRIGGER IF EXISTS trigger_update_payments_timestamp ON payments;
DROP FUNCTION IF EXISTS update_payments_timestamp();
DROP TRIGGER IF EXISTS trigger_update_invoices_timestamp ON invoices;
DROP FUNCTION IF EXISTS update_invoices_timestamp();
DROP TRIGGER IF EXISTS trigger_update_fee_structures_timestamp ON fee_structures;
DROP FUNCTION IF EXISTS update_fee_structures_timestamp();

DROP INDEX IF EXISTS idx_budgets_status;
DROP INDEX IF EXISTS idx_budgets_category;
DROP INDEX IF EXISTS idx_budgets_year;
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_payments_sync;
DROP INDEX IF EXISTS idx_payments_date;
DROP INDEX IF EXISTS idx_payments_student;
DROP INDEX IF EXISTS idx_payments_invoice;
DROP INDEX IF EXISTS idx_invoices_number;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_year;
DROP INDEX IF EXISTS idx_invoices_student;
DROP INDEX IF EXISTS idx_fee_structures_active;
DROP INDEX IF EXISTS idx_fee_structures_class;
DROP INDEX IF EXISTS idx_fee_structures_year;

DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS fee_structures;
