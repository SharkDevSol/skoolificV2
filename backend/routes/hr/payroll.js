const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateWithBranch } = require('../../middleware/branchAuth');
const XLSX = require('xlsx');
const { getEndpointPath, API_ENDPOINTS } = require('../../config/api.config');

// Helper function to get Ethiopian month name
function getEthiopianMonthName(monthNumber) {
  const months = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];
  return months[monthNumber - 1] || '';
}

// Helper function to sanitize staff type to schema name
function sanitizeStaffTypeToSchema(staffType) {
  if (!staffType) return 'teachers';
  const type = staffType.toLowerCase();
  if (type === 'teacher' || type === 'teachers') return 'teachers';
  if (type === 'supportive') return 'supportive_staff';
  if (type === 'administrative' || type === 'director') return 'administrative_staff';
  return 'teachers';
}

// Generate payroll for selected month
router.post('/generate', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear } = req.body;

    if (!ethMonth || !ethYear) {
      return res.status(400).json({ error: 'Ethiopian month and year are required' });
    }

    const ethiopianMonthName = getEthiopianMonthName(parseInt(ethMonth));
    console.log(`📊 Generating payroll for Ethiopian month ${ethiopianMonthName} (${ethMonth})/${ethYear}`);

    // Get all active salaries from hr_complete_salaries table
    const salariesQuery = `
      SELECT
        staff_id,
        staff_name,
        staff_type,
        account_name,
        base_salary,
        tax_amount,
        COALESCE(tax_enabled, FALSE) AS tax_enabled,
        tax_type,
        tax_value,
        paid_months,
        COALESCE(is_stopped, FALSE) AS is_stopped
      FROM hr_complete_salaries
      WHERE COALESCE(is_active, TRUE) = TRUE
        AND COALESCE(is_stopped, FALSE) = FALSE
        AND (paid_months IS NULL OR paid_months = '[]'::jsonb OR paid_months @> to_jsonb($1::int))
      ORDER BY staff_name
    `;

    const salariesResult = await pool.query(salariesQuery, [parseInt(ethMonth)]);

    if (salariesResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No salary records found',
        message: 'Please add salaries in Salary Management first'
      });
    }

    // Deduction cap (% of gross) — configurable in hr_payroll_settings
    let maxDeductionPercent = 100;
    try {
      const capRow = await pool.query('SELECT max_deduction_percent FROM hr_payroll_settings ORDER BY id LIMIT 1');
      if (capRow.rows[0]) maxDeductionPercent = Number(capRow.rows[0].max_deduction_percent) || 100;
    } catch (_) {}

    const payrollData = [];

    // For each staff, calculate their net salary
    for (const salary of salariesResult.rows) {
      const staffId = salary.staff_id;
      const baseSalary = parseFloat(salary.base_salary) || 0;
      const accountNumber = salary.account_name || 'N/A';

      // Allowances (monthly rows use the numeric Ethiopian month)
      const allowancesQuery = `
        SELECT
          COALESCE(allowance_type, allowance_name) AS allowance_type,
          SUM(amount) as total_amount
        FROM hr_allowances
        WHERE staff_id = $1
          AND (ethiopian_month = $2 OR ethiopian_month IS NULL)
          AND (ethiopian_year = $3 OR ethiopian_year IS NULL)
        GROUP BY COALESCE(allowance_type, allowance_name)
      `;
      const allowancesResult = await pool.query(allowancesQuery, [staffId, parseInt(ethMonth), parseInt(ethYear)]).catch(err => {
        console.log('Error fetching allowances for ' + salary.staff_name + ':', err.message);
        return { rows: [] };
      });
      const totalAllowances = allowancesResult.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

      // Salary tax is a setting now: percent or fixed (server-side only)
      const taxEnabled = salary.tax_enabled === true;
      const tType = String(salary.tax_type || 'FIXED').toUpperCase();
      const tVal = parseFloat(salary.tax_value) || 0;
      const taxAmount = taxEnabled ? Math.min(baseSalary, tType === 'PERCENT' ? (baseSalary * tVal) / 100 : tVal) : 0;

      // Deductions for this staff and month (manual "Tax" ignored when the salary tax is on)
      const deductionsQuery = `
        SELECT
          deduction_type,
          SUM(amount) as total_amount
        FROM hr_deductions
        WHERE staff_id = $1
          AND (ethiopian_month = $2 OR ethiopian_month IS NULL)
          AND (ethiopian_year = $3 OR ethiopian_year IS NULL)
          ${taxEnabled ? "AND LOWER(deduction_type) <> 'tax'" : ''}
        GROUP BY deduction_type
      `;
      const deductionsResult = await pool.query(deductionsQuery, [staffId, parseInt(ethMonth), parseInt(ethYear)]).catch(err => {
        console.log('Error fetching deductions for ' + salary.staff_name + ':', err.message);
        return { rows: [] };
      });

      const deductionsRows = deductionsResult.rows.map(r => ({ ...r, total_amount: parseFloat(r.total_amount) || 0 }));
      if (taxAmount > 0) deductionsRows.unshift({ deduction_type: 'Tax', total_amount: taxAmount });

      const computedDeductions = deductionsRows.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
      const grossSalary = baseSalary + totalAllowances;
      const capAmount = grossSalary * (maxDeductionPercent / 100);
      const totalDeductions = Math.min(computedDeductions, Math.max(capAmount, 0));
      const netSalary = grossSalary - totalDeductions;
      const capApplied = computedDeductions > totalDeductions;

      payrollData.push({
        staff_id: staffId,
        staff_name: salary.staff_name,
        staff_type: salary.staff_type,
        account_number: accountNumber,
        base_salary: baseSalary,
        total_allowances: totalAllowances,
        total_deductions: totalDeductions,
        gross_salary: grossSalary,
        net_salary: netSalary,
        tax_amount: taxAmount,
        allowances_breakdown: allowancesResult.rows,
        deductions_breakdown: deductionsRows,
        over_cap: capApplied,
        flags: capApplied ? 'DEDUCTION_CAP_APPLIED' : null
      });
    }

    // Sort by staff name
    payrollData.sort((a, b) => a.staff_name.localeCompare(b.staff_name));

    console.log(`✅ Generated payroll for ${payrollData.length} staff members`);

    res.json({
      success: true,
      data: {
        month: parseInt(ethMonth),
        month_name: ethiopianMonthName,
        year: parseInt(ethYear),
        staff_count: payrollData.length,
        total_gross: payrollData.reduce((sum, item) => sum + item.gross_salary, 0),
        total_deductions: payrollData.reduce((sum, item) => sum + item.total_deductions, 0),
        total_net: payrollData.reduce((sum, item) => sum + item.net_salary, 0),
        payroll: payrollData
      }
    });
  } catch (error) {
    console.error('❌ Error generating payroll:', error);
    res.status(500).json({ error: 'Failed to generate payroll', details: error.message });
  }
});

// Export payroll to Excel
router.post('/export-excel', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear, payrollData } = req.body;

    if (!ethMonth || !ethYear || !payrollData) {
      return res.status(400).json({ error: 'Month, year, and payroll data are required' });
    }

    // Prepare data for Excel
    const excelData = payrollData.map((item, index) => ({
      'No.': index + 1,
      'Staff Name': item.staff_name,
      'Staff Type': item.staff_type,
      'Account Number': item.account_number,
      'Base Salary (Birr)': item.base_salary.toFixed(2),
      'Total Allowances (Birr)': item.total_allowances.toFixed(2),
      'Gross Salary (Birr)': item.gross_salary.toFixed(2),
      'Total Deductions (Birr)': item.total_deductions.toFixed(2),
      'Net Salary (Birr)': item.net_salary.toFixed(2)
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No.
      { wch: 25 }, // Staff Name
      { wch: 20 }, // Staff Type
      { wch: 20 }, // Account Number
      { wch: 18 }, // Base Salary
      { wch: 22 }, // Total Allowances
      { wch: 20 }, // Gross Salary
      { wch: 22 }, // Total Deductions
      { wch: 18 }  // Net Salary
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_${ethMonth}_${ethYear}.xlsx`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting payroll to Excel:', error);
    res.status(500).json({ error: 'Failed to export payroll', details: error.message });
  }
});

// Get payroll history
router.get('/history', authenticateWithBranch, async (req, res) => {
  try {
    // This would query a payroll_history table if you want to save generated payrolls
    // For now, return empty array
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ error: 'Failed to fetch payroll history', details: error.message });
  }
});

module.exports = router;
