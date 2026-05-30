-- =====================================================
-- INTEGRATION TABLES & VIEWS
-- =====================================================

-- Finance <-> Inventory Integration
-- Automatically create journal entries when inventory transactions occur

CREATE OR REPLACE VIEW inventory_financial_impact AS
SELECT 
    sl.id,
    sl.item_id,
    ii.item_name,
    sl.transaction_date,
    sl.transaction_type,
    sl.quantity_in,
    sl.quantity_out,
    sl.unit_cost,
    sl.total_value,
    ii.account_id as inventory_account_id,
    CASE 
        WHEN sl.transaction_type = 'RECEIPT' THEN 'DEBIT'
        WHEN sl.transaction_type = 'ISSUE' THEN 'CREDIT'
        ELSE 'ADJUSTMENT'
    END as entry_type
FROM stock_ledger sl
JOIN inventory_items ii ON sl.item_id = ii.id;

-- Asset Depreciation <-> Accounting Integration
CREATE OR REPLACE VIEW asset_depreciation_entries AS
SELECT 
    ds.id,
    ds.asset_id,
    a.asset_code,
    a.asset_name,
    ds.fiscal_year,
    ds.period_start_date,
    ds.period_end_date,
    ds.depreciation_amount,
    ac.depreciation_expense_account_id,
    ac.accumulated_depreciation_account_id
FROM depreciation_schedules ds
JOIN assets a ON ds.asset_id = a.id
JOIN asset_categories ac ON a.category_id = ac.id
WHERE ds.status = 'CALCULATED';

-- Attendance <-> Payroll Integration
CREATE OR REPLACE VIEW employee_attendance_summary AS
SELECT 
    ar.employee_id,
    DATE_TRUNC('month', ar.attendance_date) as month,
    COUNT(*) FILTER (WHERE ar.status = 'PRESENT') as days_present,
    COUNT(*) FILTER (WHERE ar.status = 'ABSENT') as days_absent,
    COUNT(*) FILTER (WHERE ar.status = 'HALF_DAY') as half_days,
    COUNT(*) FILTER (WHERE ar.status = 'ON_LEAVE') as days_on_leave,
    SUM(ar.work_hours) as total_work_hours,
    SUM(ar.overtime_hours) as total_overtime_hours,
    SUM(ar.late_minutes) as total_late_minutes
FROM attendance_records ar
GROUP BY ar.employee_id, DATE_TRUNC('month', ar.attendance_date);

-- Comprehensive Financial Dashboard View
CREATE OR REPLACE VIEW financial_dashboard AS
SELECT 
    'Revenue' as category,
    SUM(jel.credit_amount) as amount,
    DATE_TRUNC('month', je.entry_date) as period
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE coa.account_type = 'INCOME' AND je.status = 'POSTED'
GROUP BY DATE_TRUNC('month', je.entry_date)
UNION ALL
SELECT 
    'Expenses' as category,
    SUM(jel.debit_amount) as amount,
    DATE_TRUNC('month', je.entry_date) as period
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE coa.account_type = 'EXPENSE' AND je.status = 'POSTED'
GROUP BY DATE_TRUNC('month', je.entry_date);

-- Inventory Valuation View
CREATE OR REPLACE VIEW current_inventory_valuation AS
SELECT 
    ii.id as item_id,
    ii.item_code,
    ii.item_name,
    ii.category,
    s.id as store_id,
    s.store_name,
    SUM(sl.balance_quantity) as current_stock,
    AVG(sl.unit_cost) as average_cost,
    SUM(sl.balance_quantity * sl.unit_cost) as total_value
FROM inventory_items ii
JOIN stock_ledger sl ON ii.id = sl.item_id
JOIN stores s ON sl.store_id = s.id
WHERE sl.id IN (
    SELECT MAX(id) 
    FROM stock_ledger 
    GROUP BY item_id, store_id
)
GROUP BY ii.id, ii.item_code, ii.item_name, ii.category, s.id, s.store_name;

-- Asset Register Summary
CREATE OR REPLACE VIEW asset_register_summary AS
SELECT 
    ac.category_name,
    COUNT(a.id) as total_assets,
    SUM(a.purchase_cost) as total_purchase_cost,
    SUM(a.accumulated_depreciation) as total_depreciation,
    SUM(a.current_value) as total_current_value,
    a.status
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.id
GROUP BY ac.category_name, a.status;

-- Employee Payroll Summary
CREATE OR REPLACE VIEW employee_payroll_summary AS
SELECT 
    e.id as employee_id,
    e.employee_code,
    e.first_name || ' ' || e.last_name as employee_name,
    d.department_name,
    jp.position_title,
    pd.payroll_run_id,
    pr.payroll_month,
    pd.days_worked,
    pd.gross_salary,
    pd.total_deductions,
    pd.net_salary,
    pd.status as payment_status
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN job_positions jp ON e.position_id = jp.id
LEFT JOIN payroll_details pd ON e.id = pd.employee_id
LEFT JOIN payroll_runs pr ON pd.payroll_run_id = pr.id;
