-- =====================================================
-- PROPERTY & ASSET MANAGEMENT MODULE (Fixed Assets)
-- =====================================================

-- Asset Categories
CREATE TABLE asset_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    parent_category_id INTEGER REFERENCES asset_categories(id),
    depreciation_method VARCHAR(50) CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'UNITS_OF_PRODUCTION')),
    useful_life_years INTEGER,
    salvage_value_percentage DECIMAL(5, 2),
    account_id INTEGER,
    accumulated_depreciation_account_id INTEGER,
    depreciation_expense_account_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Registry
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    asset_tag VARCHAR(50) UNIQUE,
    qr_code VARCHAR(255),
    barcode VARCHAR(255),
    asset_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES asset_categories(id),
    supplier_id INTEGER,
    purchase_date DATE,
    purchase_cost DECIMAL(12, 2) NOT NULL,
    salvage_value DECIMAL(12, 2) DEFAULT 0,
    useful_life_years INTEGER,
    depreciation_method VARCHAR(50),
    current_value DECIMAL(12, 2),
    accumulated_depreciation DECIMAL(12, 2) DEFAULT 0,
    location VARCHAR(255),
    department VARCHAR(100),
    assigned_to INTEGER,
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_details TEXT,
    serial_number VARCHAR(100),
    model_number VARCHAR(100),
    manufacturer VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IN_MAINTENANCE', 'DISPOSED', 'LOST', 'DAMAGED', 'RETIRED')),
    condition_rating VARCHAR(50) CHECK (condition_rating IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
    is_insured BOOLEAN DEFAULT false,
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_category ON assets(category_id);
CREATE INDEX idx_asset_status ON assets(status);
CREATE INDEX idx_asset_assigned ON assets(assigned_to);

-- Asset Assignment History
CREATE TABLE asset_assignments (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    assigned_to INTEGER NOT NULL,
    assigned_by INTEGER,
    assignment_date DATE NOT NULL,
    return_date DATE,
    location VARCHAR(255),
    department VARCHAR(100),
    purpose TEXT,
    condition_at_assignment VARCHAR(50),
    condition_at_return VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'TRANSFERRED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignment_asset ON asset_assignments(asset_id);
CREATE INDEX idx_assignment_person ON asset_assignments(assigned_to);

-- Asset Maintenance Schedule
CREATE TABLE maintenance_schedules (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'INSPECTION')),
    frequency VARCHAR(50) CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME')),
    last_maintenance_date DATE,
    next_maintenance_date DATE NOT NULL,
    estimated_cost DECIMAL(12, 2),
    assigned_to INTEGER,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Logs
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    log_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_schedule_id INTEGER REFERENCES maintenance_schedules(id),
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(50),
    performed_by INTEGER,
    vendor_name VARCHAR(255),
    description TEXT,
    cost DECIMAL(12, 2),
    downtime_hours DECIMAL(5, 2),
    parts_replaced TEXT,
    status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    completion_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_asset ON maintenance_logs(asset_id);

-- Asset Depreciation Schedule
CREATE TABLE depreciation_schedules (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    fiscal_year VARCHAR(20) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    opening_value DECIMAL(12, 2) NOT NULL,
    depreciation_amount DECIMAL(12, 2) NOT NULL,
    accumulated_depreciation DECIMAL(12, 2) NOT NULL,
    closing_value DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'POSTED')),
    journal_entry_id INTEGER,
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_depreciation_asset ON depreciation_schedules(asset_id);
CREATE INDEX idx_depreciation_year ON depreciation_schedules(fiscal_year);

-- Asset Disposal
CREATE TABLE asset_disposals (
    id SERIAL PRIMARY KEY,
    disposal_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id),
    disposal_date DATE NOT NULL,
    disposal_method VARCHAR(50) CHECK (disposal_method IN ('SALE', 'DONATION', 'SCRAP', 'TRADE_IN', 'WRITE_OFF', 'LOST', 'STOLEN')),
    disposal_value DECIMAL(12, 2) DEFAULT 0,
    book_value DECIMAL(12, 2),
    gain_loss DECIMAL(12, 2),
    buyer_name VARCHAR(255),
    buyer_contact TEXT,
    reason TEXT,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    journal_entry_id INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Valuation History
CREATE TABLE asset_valuations (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    valuation_method VARCHAR(50) CHECK (valuation_method IN ('MARKET_VALUE', 'REPLACEMENT_COST', 'PROFESSIONAL_APPRAISAL')),
    valuation_amount DECIMAL(12, 2) NOT NULL,
    appraiser_name VARCHAR(255),
    appraiser_credentials VARCHAR(255),
    reason TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
