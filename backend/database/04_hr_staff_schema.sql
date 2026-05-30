-- =====================================================
-- HR & STAFF MANAGEMENT MODULE
-- =====================================================

-- Dynamic Roles (No-code role builder)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,
    parent_role_id INTEGER REFERENCES roles(id),
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic Departments
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_code VARCHAR(50) UNIQUE NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    parent_department_id INTEGER REFERENCES departments(id),
    head_of_department INTEGER,
    budget_code VARCHAR(50),
    cost_center VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Positions
CREATE TABLE job_positions (
    id SERIAL PRIMARY KEY,
    position_code VARCHAR(50) UNIQUE NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    role_id INTEGER REFERENCES roles(id),
    employment_type VARCHAR(50) CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN')),
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    required_qualifications TEXT,
    responsibilities TEXT,
    reports_to INTEGER,
    number_of_positions INTEGER DEFAULT 1,
    filled_positions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applicant Tracking System (ATS)
CREATE TABLE job_postings (
    id SERIAL PRIMARY KEY,
    posting_number VARCHAR(50) UNIQUE NOT NULL,
    position_id INTEGER REFERENCES job_positions(id),
    posting_date DATE NOT NULL,
    closing_date DATE,
    number_of_vacancies INTEGER DEFAULT 1,
    job_description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED', 'CANCELLED')),
    posted_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    job_posting_id INTEGER REFERENCES job_postings(id),
    applicant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    resume_url TEXT,
    cover_letter TEXT,
    application_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
    screening_score INTEGER,
    screening_notes TEXT,
    interview_date TIMESTAMP,
    interview_feedback TEXT,
    offer_date DATE,
    offer_amount DECIMAL(12, 2),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_posting ON job_applications(job_posting_id);
CREATE INDEX idx_application_status ON job_applications(status);

-- Staff/Employee Master
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    application_id INTEGER REFERENCES job_applications(id),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    national_id VARCHAR(50),
    tax_id VARCHAR(50),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(255),
    position_id INTEGER REFERENCES job_positions(id),
    department_id INTEGER REFERENCES departments(id),
    role_id INTEGER REFERENCES roles(id),
    employment_type VARCHAR(50),
    hire_date DATE NOT NULL,
    probation_end_date DATE,
    confirmation_date DATE,
    termination_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED')),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_department ON employees(department_id);
CREATE INDEX idx_employee_status ON employees(status);

-- Attendance Devices (Biometric/RFID)
CREATE TABLE attendance_devices (
    id SERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) CHECK (device_type IN ('BIOMETRIC', 'RFID', 'FACE_RECOGNITION', 'MANUAL')),
    location VARCHAR(255),
    ip_address VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shift Management
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    shift_name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 0,
    late_mark_after_minutes INTEGER DEFAULT 15,
    half_day_hours DECIMAL(4, 2),
    full_day_hours DECIMAL(4, 2) NOT NULL,
    overtime_after_hours DECIMAL(4, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Shift Assignments
CREATE TABLE employee_shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    shift_id INTEGER REFERENCES shifts(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    shift_id INTEGER REFERENCES shifts(id),
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    check_in_device_id INTEGER REFERENCES attendance_devices(id),
    check_out_device_id INTEGER REFERENCES attendance_devices(id),
    work_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND')),
    is_manual_entry BOOLEAN DEFAULT false,
    notes TEXT,
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);

-- Leave Types
CREATE TABLE leave_types (
    id SERIAL PRIMARY KEY,
    leave_code VARCHAR(50) UNIQUE NOT NULL,
    leave_name VARCHAR(255) NOT NULL,
    annual_quota INTEGER,
    is_paid BOOLEAN DEFAULT true,
    is_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Balances
CREATE TABLE leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    opening_balance DECIMAL(5, 2) DEFAULT 0,
    earned DECIMAL(5, 2) DEFAULT 0,
    used DECIMAL(5, 2) DEFAULT 0,
    balance DECIMAL(5, 2) DEFAULT 0,
    UNIQUE(employee_id, leave_type_id, year)
);

-- Leave Applications
CREATE TABLE leave_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    number_of_days DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_employee ON leave_applications(employee_id);
CREATE INDEX idx_leave_status ON leave_applications(status);

-- Salary Components (Allowances & Deductions)
CREATE TABLE salary_components (
    id SERIAL PRIMARY KEY,
    component_code VARCHAR(50) UNIQUE NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50) CHECK (component_type IN ('BASIC', 'ALLOWANCE', 'DEDUCTION', 'BONUS', 'OVERTIME')),
    calculation_type VARCHAR(50) CHECK (calculation_type IN ('FIXED', 'PERCENTAGE', 'FORMULA', 'ATTENDANCE_BASED')),
    default_value DECIMAL(12, 2),
    percentage_of VARCHAR(50),
    is_taxable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    account_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Salary Structure
CREATE TABLE employee_salary_structures (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES salary_components(id),
    amount DECIMAL(12, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Slabs
CREATE TABLE tax_slabs (
    id SERIAL PRIMARY KEY,
    slab_name VARCHAR(255) NOT NULL,
    min_income DECIMAL(12, 2) NOT NULL,
    max_income DECIMAL(12, 2),
    tax_rate DECIMAL(5, 2) NOT NULL,
    fixed_amount DECIMAL(12, 2) DEFAULT 0,
    fiscal_year VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Processing
CREATE TABLE payroll_runs (
    id SERIAL PRIMARY KEY,
    payroll_number VARCHAR(50) UNIQUE NOT NULL,
    payroll_month VARCHAR(7) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE,
    total_employees INTEGER,
    total_gross_salary DECIMAL(12, 2),
    total_deductions DECIMAL(12, 2),
    total_net_salary DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'APPROVED', 'PROCESSED', 'PAID')),
    processed_by INTEGER,
    approved_by INTEGER,
    processed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Details
CREATE TABLE payroll_details (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    days_worked DECIMAL(5, 2),
    days_absent DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    basic_salary DECIMAL(12, 2) NOT NULL,
    gross_salary DECIMAL(12, 2) NOT NULL,
    total_allowances DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_run ON payroll_details(payroll_run_id);
CREATE INDEX idx_payroll_employee ON payroll_details(employee_id);

-- Payroll Component Breakdown
CREATE TABLE payroll_component_details (
    id SERIAL PRIMARY KEY,
    payroll_detail_id INTEGER REFERENCES payroll_details(id) ON DELETE CASCADE,
    component_id INTEGER REFERENCES salary_components(id),
    component_type VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    calculation_basis TEXT
);

-- Performance Reviews
CREATE TABLE performance_reviews (
    id SERIAL PRIMARY KEY,
    review_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewer_id INTEGER,
    overall_rating DECIMAL(3, 2),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals_for_next_period TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'REVIEWED', 'ACKNOWLEDGED')),
    reviewed_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Programs
CREATE TABLE training_programs (
    id SERIAL PRIMARY KEY,
    program_code VARCHAR(50) UNIQUE NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    trainer_name VARCHAR(255),
    duration_hours INTEGER,
    start_date DATE,
    end_date DATE,
    max_participants INTEGER,
    cost_per_participant DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Training Records
CREATE TABLE employee_training (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    training_program_id INTEGER REFERENCES training_programs(id),
    enrollment_date DATE NOT NULL,
    completion_date DATE,
    attendance_percentage DECIMAL(5, 2),
    assessment_score DECIMAL(5, 2),
    certificate_issued BOOLEAN DEFAULT false,
    certificate_url TEXT,
    status VARCHAR(50) DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'WITHDRAWN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
