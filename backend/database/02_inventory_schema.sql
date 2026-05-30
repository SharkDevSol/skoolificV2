-- =====================================================
-- INVENTORY & STOCK MANAGEMENT MODULE
-- =====================================================

-- Item Master (Consumables)
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL,
    reorder_level INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    valuation_method VARCHAR(50) DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE')),
    is_batch_tracked BOOLEAN DEFAULT false,
    is_expiry_tracked BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    account_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_item_category ON inventory_items(category);
CREATE INDEX idx_item_code ON inventory_items(item_code);

-- Suppliers
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores/Warehouses
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    store_code VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    store_type VARCHAR(50) CHECK (store_type IN ('MAIN', 'DEPARTMENT', 'CLASSROOM', 'LAB')),
    manager_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Requests
CREATE TABLE purchase_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    request_date DATE NOT NULL,
    requested_by INTEGER NOT NULL,
    department VARCHAR(100),
    priority VARCHAR(50) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    required_by_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED')),
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Request Items
CREATE TABLE purchase_request_items (
    id SERIAL PRIMARY KEY,
    purchase_request_id INTEGER REFERENCES purchase_requests(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    estimated_unit_price DECIMAL(12, 2),
    estimated_total DECIMAL(12, 2),
    justification TEXT,
    line_number INTEGER
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    purchase_request_id INTEGER REFERENCES purchase_requests(id),
    expected_delivery_date DATE,
    delivery_address TEXT,
    payment_terms VARCHAR(100),
    total_amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED')),
    created_by INTEGER,
    approved_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    line_number INTEGER
);

-- Goods Receipt Notes (GRN)
CREATE TABLE goods_receipt_notes (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    grn_date DATE NOT NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    store_id INTEGER REFERENCES stores(id),
    received_by INTEGER NOT NULL,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    total_amount DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RECEIVED', 'QUALITY_CHECK', 'ACCEPTED', 'REJECTED')),
    quality_checked_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GRN Items
CREATE TABLE grn_items (
    id SERIAL PRIMARY KEY,
    grn_id INTEGER REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES purchase_order_items(id),
    item_id INTEGER REFERENCES inventory_items(id),
    ordered_quantity INTEGER,
    received_quantity INTEGER NOT NULL,
    accepted_quantity INTEGER,
    rejected_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    manufacturing_date DATE,
    quality_status VARCHAR(50) CHECK (quality_status IN ('PENDING', 'PASSED', 'FAILED')),
    rejection_reason TEXT,
    line_number INTEGER
);

-- Stock Ledger (Real-time inventory tracking)
CREATE TABLE stock_ledger (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    store_id INTEGER REFERENCES stores(id),
    transaction_date TIMESTAMP NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN')),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity_in INTEGER DEFAULT 0,
    quantity_out INTEGER DEFAULT 0,
    balance_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2),
    total_value DECIMAL(12, 2),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_item_store ON stock_ledger(item_id, store_id);
CREATE INDEX idx_stock_transaction_date ON stock_ledger(transaction_date);

-- Stock Issuance
CREATE TABLE stock_issuances (
    id SERIAL PRIMARY KEY,
    issue_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    from_store_id INTEGER REFERENCES stores(id),
    issued_to_department VARCHAR(100),
    issued_to_person INTEGER,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'RETURNED', 'CANCELLED')),
    issued_by INTEGER,
    approved_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Issuance Items
CREATE TABLE stock_issuance_items (
    id SERIAL PRIMARY KEY,
    issuance_id INTEGER REFERENCES stock_issuances(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    batch_number VARCHAR(100),
    requested_quantity INTEGER NOT NULL,
    issued_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),
    line_number INTEGER
);

-- Stock Transfers
CREATE TABLE stock_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATE NOT NULL,
    from_store_id INTEGER REFERENCES stores(id),
    to_store_id INTEGER REFERENCES stores(id),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
    initiated_by INTEGER,
    received_by INTEGER,
    received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Transfer Items
CREATE TABLE stock_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    batch_number VARCHAR(100),
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(12, 2),
    line_number INTEGER
);

-- Stock Adjustments
CREATE TABLE stock_adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_number VARCHAR(50) UNIQUE NOT NULL,
    adjustment_date DATE NOT NULL,
    store_id INTEGER REFERENCES stores(id),
    adjustment_type VARCHAR(50) CHECK (adjustment_type IN ('PHYSICAL_COUNT', 'DAMAGE', 'EXPIRY', 'LOSS', 'FOUND', 'OTHER')),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'POSTED')),
    adjusted_by INTEGER,
    approved_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Adjustment Items
CREATE TABLE stock_adjustment_items (
    id SERIAL PRIMARY KEY,
    adjustment_id INTEGER REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id),
    batch_number VARCHAR(100),
    system_quantity INTEGER NOT NULL,
    physical_quantity INTEGER NOT NULL,
    difference_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2),
    value_difference DECIMAL(12, 2),
    line_number INTEGER
);
