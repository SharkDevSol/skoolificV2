-- =====================================================
-- SCHOOL MANAGEMENT SYSTEM - ERP MODULES
-- PostgreSQL Database Schema
-- =====================================================

-- =====================================================
-- 1. FINANCE MANAGEMENT MODULE
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
    recurrence_pattern VARCHAR(50), -- MONTHLY, QUARTERLY, ANNUALLY
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
