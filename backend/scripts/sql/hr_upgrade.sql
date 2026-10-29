-- Base tables for branch DBs where they were never created (no-op elsewhere)

CREATE TABLE IF NOT EXISTS hr_complete_salaries (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(150),
  staff_type VARCHAR(100),
  account_name VARCHAR(150),
  base_salary NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_allowances (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50),
  staff_name VARCHAR(150),
  allowance_name VARCHAR(150),
  allowance_type VARCHAR(150),
  amount NUMERIC(12,2) DEFAULT 0,
  ethiopian_month INTEGER,
  ethiopian_year INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_deductions (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50),
  staff_name VARCHAR(150),
  deduction_type VARCHAR(100),
  amount NUMERIC(12,2) DEFAULT 0,
  ethiopian_month INTEGER,
  ethiopian_year INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_attendance_time_settings (
  id SERIAL PRIMARY KEY,
  standard_check_in TIME DEFAULT '08:00',
  late_threshold TIME DEFAULT '08:00',
  standard_check_out TIME DEFAULT '17:00',
  minimum_work_hours NUMERIC(4,2) DEFAULT 8,
  half_day_threshold NUMERIC(4,2) DEFAULT 4,
  grace_period_minutes INTEGER DEFAULT 0,
  max_checkout_hours NUMERIC(4,2) DEFAULT 3,
  absent_threshold_time TIME DEFAULT '15:00',
  weekend_days INTEGER[] DEFAULT ARRAY[0,6],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_staff_specific_times (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(150),
  staff_type VARCHAR(100),
  check_in_time TIME,
  check_out_time TIME,
  late_threshold TIME,
  minimum_work_hours NUMERIC(4,2),
  half_day_threshold NUMERIC(4,2),
  grace_period_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_attendance_deduction_settings (
  id SERIAL PRIMARY KEY,
  staff_type VARCHAR(100),
  deduction_type VARCHAR(50),
  deduction_amount NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_attendance_permissions (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER NOT NULL,
  permission_status VARCHAR(20) DEFAULT 'PENDING',
  permission_reason TEXT,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_ethiopian_attendance (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(150),
  department_name VARCHAR(150),
  ethiopian_year INTEGER,
  ethiopian_month INTEGER,
  ethiopian_day INTEGER,
  check_in TIME,
  check_out TIME,
  working_hours NUMERIC(6,2),
  status VARCHAR(50) DEFAULT 'PRESENT',
  shift_type VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HR / Payroll upgrade (ADDITIVE, idempotent) — IQRA branches
-- Safe defaults so existing rows keep working.

-- ---------- 0) expenses table (missing on some branch DBs) ----------
CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY,
  expense_number VARCHAR(50),
  category VARCHAR(100) NOT NULL DEFAULT 'Other',
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_date DATE DEFAULT CURRENT_DATE,
  requested_by VARCHAR(150),
  vendor_name VARCHAR(150),
  payment_method VARCHAR(50),
  po_number VARCHAR(50),
  source VARCHAR(30) DEFAULT 'manual',
  status VARCHAR(30) DEFAULT 'PENDING',
  created_by VARCHAR(100),
  approved_by VARCHAR(100), approved_at TIMESTAMPTZ,
  rejected_by VARCHAR(100), rejected_at TIMESTAMPTZ, rejection_reason TEXT,
  paid_by VARCHAR(100), paid_at TIMESTAMPTZ,
  budget_id INTEGER,
  approval_status VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 1) salary setup ----------
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'FIXED'; -- FIXED | PERCENT
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS tax_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS paid_months JSONB; -- null = all months
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS hr_complete_salaries ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ;

-- ---------- 2) time & shift settings ----------
ALTER TABLE IF EXISTS hr_attendance_time_settings ADD COLUMN IF NOT EXISTS standard_check_in TIME DEFAULT '08:00';
ALTER TABLE IF EXISTS hr_attendance_time_settings ADD COLUMN IF NOT EXISTS standard_check_out TIME DEFAULT '17:00';
ALTER TABLE IF EXISTS hr_attendance_time_settings ADD COLUMN IF NOT EXISTS minimum_work_hours NUMERIC(4,2) DEFAULT 8;
ALTER TABLE IF EXISTS hr_attendance_time_settings ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS hr_attendance_time_settings ADD COLUMN IF NOT EXISTS connect_to_salary BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS hr_staff_specific_times ADD COLUMN IF NOT EXISTS anytime_check BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_staff_specific_times ADD COLUMN IF NOT EXISTS connect_to_salary BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_staff_specific_times ADD COLUMN IF NOT EXISTS absent_deducts BOOLEAN DEFAULT TRUE;

-- ---------- 3) attendance marking metadata ----------
ALTER TABLE IF EXISTS hr_ethiopian_attendance ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'MANUAL'; -- AUTO | MANUAL
ALTER TABLE IF EXISTS hr_ethiopian_attendance ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE IF EXISTS hr_ethiopian_attendance ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- ---------- 4) leave review ----------
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'PENDING'; -- PENDING | DONE
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS has_reason BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS deduction_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS deducted_run_id INTEGER;
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100);
ALTER TABLE IF EXISTS hr_attendance_permissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS hr_attendance_audit_log (
  id SERIAL PRIMARY KEY,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(60),
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 5) tips ----------
CREATE TABLE IF NOT EXISTS hr_tips (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50),
  staff_name VARCHAR(150),
  tip_type VARCHAR(100) NOT NULL DEFAULT 'Other',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  ethiopian_year INTEGER,
  ethiopian_month INTEGER,
  ethiopian_day INTEGER,
  expense_id INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 6) credits + repayment plans ----------
CREATE TABLE IF NOT EXISTS hr_staff_credits (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(150),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  credit_date DATE DEFAULT CURRENT_DATE,
  ethiopian_year INTEGER,
  ethiopian_month INTEGER,
  ethiopian_day INTEGER,
  repaid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | REPAYING | REPAID | CANCELLED
  expense_id INTEGER,
  cancel_reason TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_debt_plans (
  id SERIAL PRIMARY KEY,
  credit_id INTEGER NOT NULL REFERENCES hr_staff_credits(id) ON DELETE CASCADE,
  staff_id VARCHAR(50) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  months INTEGER NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  start_eth_year INTEGER,
  start_eth_month INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CANCELLED | COMPLETED
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_debt_plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES hr_debt_plans(id) ON DELETE CASCADE,
  ethiopian_year INTEGER NOT NULL,
  ethiopian_month INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | DEDUCTED | SKIPPED
  payroll_run_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debt_plan_items_period ON hr_debt_plan_items (ethiopian_year, ethiopian_month, status);

CREATE TABLE IF NOT EXISTS hr_credit_repayments (
  id SERIAL PRIMARY KEY,
  credit_id INTEGER NOT NULL REFERENCES hr_staff_credits(id) ON DELETE CASCADE,
  plan_id INTEGER,
  payroll_run_id INTEGER,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ethiopian_year INTEGER,
  ethiopian_month INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 7) payroll persist + lock ----------
CREATE TABLE IF NOT EXISTS hr_payroll_settings (
  id SERIAL PRIMARY KEY,
  max_deduction_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
  updated_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
  id SERIAL PRIMARY KEY,
  ethiopian_year INTEGER NOT NULL,
  ethiopian_month INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | DONE
  locked BOOLEAN DEFAULT FALSE,
  total_gross NUMERIC(14,2) DEFAULT 0,
  total_allowances NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net NUMERIC(14,2) DEFAULT 0,
  done_by VARCHAR(100), done_at TIMESTAMPTZ,
  unlocked_by VARCHAR(100), unlocked_at TIMESTAMPTZ, unlock_reason TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ethiopian_year, ethiopian_month)
);

CREATE TABLE IF NOT EXISTS hr_payroll_items (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(150),
  staff_type VARCHAR(100),
  base_salary NUMERIC(14,2) DEFAULT 0,
  allowances NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  debt NUMERIC(14,2) DEFAULT 0,
  other_deductions NUMERIC(14,2) DEFAULT 0,
  attendance_deductions NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  gross NUMERIC(14,2) DEFAULT 0,
  net NUMERIC(14,2) DEFAULT 0,
  flags TEXT,
  breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, staff_id)
);

-- ---------- 8) expense ↔ tip/credit reference ----------
ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS reference_type VARCHAR(30);
ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS reference_id VARCHAR(60);
ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_expenses_reference ON public.expenses (reference_type, reference_id);

-- ---------- 9) defaults ----------
INSERT INTO hr_payroll_settings (max_deduction_percent)
SELECT 100 WHERE NOT EXISTS (SELECT 1 FROM hr_payroll_settings);
