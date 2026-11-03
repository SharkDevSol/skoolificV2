const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateWithBranch } = require('../../middleware/branchAuth');
const XLSX = require('xlsx');
const JSZip = require('jszip');

// ---------- helpers ----------
function getEthiopianMonthName(monthNumber) {
  const months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];
  return months[monthNumber - 1] || '';
}

const actorOf = (req) => (req.user && (req.user.username || String(req.user.id))) || 'admin';

async function ensurePayrollTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_payroll_runs (
      id SERIAL PRIMARY KEY, ethiopian_year INTEGER NOT NULL, ethiopian_month INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', locked BOOLEAN DEFAULT FALSE,
      total_gross NUMERIC(14,2) DEFAULT 0, total_allowances NUMERIC(14,2) DEFAULT 0,
      total_deductions NUMERIC(14,2) DEFAULT 0, total_net NUMERIC(14,2) DEFAULT 0,
      done_by VARCHAR(100), done_at TIMESTAMPTZ, unlocked_by VARCHAR(100), unlocked_at TIMESTAMPTZ,
      unlock_reason TEXT, created_by VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (ethiopian_year, ethiopian_month)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_payroll_items (
      id SERIAL PRIMARY KEY, run_id INTEGER NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
      staff_id VARCHAR(50) NOT NULL, staff_name VARCHAR(150), staff_type VARCHAR(100),
      account_number VARCHAR(150),
      base_salary NUMERIC(14,2) DEFAULT 0, allowances NUMERIC(14,2) DEFAULT 0,
      tax NUMERIC(14,2) DEFAULT 0, debt NUMERIC(14,2) DEFAULT 0,
      other_deductions NUMERIC(14,2) DEFAULT 0, attendance_deductions NUMERIC(14,2) DEFAULT 0,
      total_deductions NUMERIC(14,2) DEFAULT 0, gross NUMERIC(14,2) DEFAULT 0, net NUMERIC(14,2) DEFAULT 0,
      flags TEXT, breakdown JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (run_id, staff_id)
    )
  `);
  await db.query(`ALTER TABLE hr_payroll_items ADD COLUMN IF NOT EXISTS account_number VARCHAR(150)`).catch(() => {});
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_payroll_settings (
      id SERIAL PRIMARY KEY, max_deduction_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
      updated_by VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`INSERT INTO hr_payroll_settings (max_deduction_percent) SELECT 100 WHERE NOT EXISTS (SELECT 1 FROM hr_payroll_settings)`).catch(() => {});
}

// ---------- computation (single source of truth) ----------
async function computePayroll(ethMonth, ethYear) {
  const m = parseInt(ethMonth);
  const y = parseInt(ethYear);
  const monthName = getEthiopianMonthName(m);

  const salaries = await pool.query(
    `SELECT staff_id, staff_name, staff_type, account_name, base_salary,
            COALESCE(tax_enabled, FALSE) AS tax_enabled, tax_type, tax_value, paid_months
       FROM hr_complete_salaries
      WHERE COALESCE(is_active, TRUE) = TRUE
        AND COALESCE(is_stopped, FALSE) = FALSE
        AND (paid_months IS NULL OR paid_months = '[]'::jsonb OR paid_months @> to_jsonb($1::int))
      ORDER BY staff_name`,
    [m]
  );

  let maxDeductionPercent = 100;
  try {
    const cap = await pool.query('SELECT max_deduction_percent FROM hr_payroll_settings ORDER BY id LIMIT 1');
    if (cap.rows[0]) maxDeductionPercent = Number(cap.rows[0].max_deduction_percent) || 100;
  } catch (_) {}

  const payroll = [];

  for (const salary of salaries.rows) {
    const staffId = salary.staff_id;
    const base = parseFloat(salary.base_salary) || 0;

    const allowancesResult = await pool.query(
      `SELECT COALESCE(allowance_type, allowance_name) AS allowance_type, SUM(amount) AS total_amount
         FROM hr_allowances
        WHERE staff_id = $1 AND (ethiopian_month = $2 OR ethiopian_month IS NULL)
          AND (ethiopian_year = $3 OR ethiopian_year IS NULL)
        GROUP BY COALESCE(allowance_type, allowance_name)`,
      [staffId, m, y]
    ).catch(() => ({ rows: [] }));
    const totalAllowances = allowancesResult.rows.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);

    const taxEnabled = salary.tax_enabled === true;
    const tType = String(salary.tax_type || 'FIXED').toUpperCase();
    const tVal = parseFloat(salary.tax_value) || 0;
    const taxAmount = taxEnabled ? Math.min(base, tType === 'PERCENT' ? (base * tVal) / 100 : tVal) : 0;

    const deductionsResult = await pool.query(
      `SELECT deduction_type, SUM(amount) AS total_amount
         FROM hr_deductions
        WHERE staff_id = $1 AND (ethiopian_month = $2 OR ethiopian_month IS NULL)
          AND (ethiopian_year = $3 OR ethiopian_year IS NULL)
          ${taxEnabled ? "AND LOWER(deduction_type) <> 'tax'" : ''}
        GROUP BY deduction_type`,
      [staffId, m, y]
    ).catch(() => ({ rows: [] }));

    const rows = deductionsResult.rows.map(r => ({ deduction_type: r.deduction_type, total_amount: parseFloat(r.total_amount) || 0 }));

    let debtAmount = 0;
    try {
      const debt = await pool.query(
        `SELECT COALESCE(SUM(i.amount), 0) AS total
           FROM hr_debt_plan_items i
           JOIN hr_debt_plans p ON p.id = i.plan_id
          WHERE p.staff_id = $1 AND p.status = 'ACTIVE'
            AND i.ethiopian_year = $2 AND i.ethiopian_month = $3 AND i.status = 'PENDING'`,
        [String(staffId), y, m]
      );
      debtAmount = parseFloat(debt.rows[0].total) || 0;
    } catch (_) {}
    if (debtAmount > 0) rows.push({ deduction_type: 'Debt', total_amount: debtAmount });
    if (taxAmount > 0) rows.unshift({ deduction_type: 'Tax', total_amount: taxAmount });

    const computed = rows.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
    const gross = base + totalAllowances;
    const capAmount = gross * (maxDeductionPercent / 100);
    const totalDeductions = Math.min(computed, Math.max(capAmount, 0));
    const net = gross - totalDeductions;
    const capApplied = computed > totalDeductions;

    payroll.push({
      staff_id: staffId,
      staff_name: salary.staff_name,
      staff_type: salary.staff_type,
      account_number: salary.account_name || 'N/A',
      base_salary: base,
      total_allowances: totalAllowances,
      total_deductions: totalDeductions,
      gross_salary: gross,
      net_salary: net,
      tax_amount: taxAmount,
      allowances_breakdown: allowancesResult.rows,
      deductions_breakdown: rows,
      over_cap: capApplied,
      flags: capApplied ? 'DEDUCTION_CAP_APPLIED' : null,
    });
  }

  payroll.sort((a, b) => a.staff_name.localeCompare(b.staff_name));
  return {
    month: m,
    month_name: monthName,
    year: y,
    staff_count: payroll.length,
    total_gross: payroll.reduce((s, r) => s + r.gross_salary, 0),
    total_deductions: payroll.reduce((s, r) => s + r.total_deductions, 0),
    total_net: payroll.reduce((s, r) => s + r.net_salary, 0),
    payroll,
  };
}

function itemToRow(it) {
  const breakdown = it.breakdown || [];
  return {
    staff_id: it.staff_id,
    staff_name: it.staff_name,
    staff_type: it.staff_type,
    account_number: it.account_number || 'N/A',
    base_salary: Number(it.base_salary) || 0,
    total_allowances: Number(it.allowances) || 0,
    total_deductions: Number(it.total_deductions) || 0,
    gross_salary: Number(it.gross) || 0,
    net_salary: Number(it.net) || 0,
    tax_amount: Number(it.tax) || 0,
    allowances_breakdown: [],
    deductions_breakdown: breakdown,
    over_cap: String(it.flags || '').includes('CAP'),
    flags: it.flags || null,
  };
}

async function loadRunWithItems(runId) {
  const run = (await pool.query('SELECT * FROM hr_payroll_runs WHERE id = $1', [runId])).rows[0];
  if (!run) return null;
  const items = (await pool.query('SELECT * FROM hr_payroll_items WHERE run_id = $1 ORDER BY staff_name', [runId])).rows;
  const payroll = items.map(itemToRow);
  return {
    ...run,
    month: run.ethiopian_month,
    month_name: getEthiopianMonthName(run.ethiopian_month),
    year: run.ethiopian_year,
    staff_count: payroll.length,
    total_gross: payroll.reduce((s, r) => s + r.gross_salary, 0),
    total_deductions: payroll.reduce((s, r) => s + r.total_deductions, 0),
    total_net: payroll.reduce((s, r) => s + r.net_salary, 0),
    payroll,
  };
}

// ---------- generate ----------
router.post('/generate', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear } = req.body;
    if (!ethMonth || !ethYear) return res.status(400).json({ error: 'Ethiopian month and year are required' });

    await ensurePayrollTables(pool);
    const runRow = (await pool.query(
      'SELECT * FROM hr_payroll_runs WHERE ethiopian_year = $1 AND ethiopian_month = $2',
      [parseInt(ethYear), parseInt(ethMonth)]
    )).rows[0];

    if (runRow && runRow.locked) {
      const data = await loadRunWithItems(runRow.id);
      return res.json({ success: true, data: { ...data, locked: true, status: 'DONE', run_id: runRow.id } });
    }

    const data = await computePayroll(ethMonth, ethYear);
    if (data.staff_count === 0) {
      return res.status(404).json({ error: 'No salary records found', message: 'Please add salaries in Salary Management first' });
    }
    res.json({
      success: true,
      data: { ...data, locked: false, status: runRow ? runRow.status : 'DRAFT', run_id: runRow ? runRow.id : null },
    });
  } catch (error) {
    console.error('Error generating payroll:', error);
    res.status(500).json({ error: 'Failed to generate payroll', details: error.message });
  }
});

// ---------- Done (lock) ----------
router.post('/done', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ethMonth, ethYear } = req.body;
    if (!ethMonth || !ethYear) return res.status(400).json({ error: 'Ethiopian month and year are required' });
    const m = parseInt(ethMonth);
    const y = parseInt(ethYear);

    await ensurePayrollTables(client);
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM hr_payroll_runs WHERE ethiopian_year = $1 AND ethiopian_month = $2 FOR UPDATE', [y, m]);
    if (existing.rows[0] && existing.rows[0].locked) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This payroll month is already locked.' });
    }

    const data = await computePayroll(m, y);
    if (data.staff_count === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No salary records to lock for this month.' });
    }

    const actor = actorOf(req);
    const run = await client.query(
      `INSERT INTO hr_payroll_runs (ethiopian_year, ethiopian_month, status, locked, total_gross, total_deductions, total_net, done_by, done_at, created_by)
       VALUES ($1,$2,'DONE',TRUE,$3,$4,$5,$6,NOW(),$6)
       ON CONFLICT (ethiopian_year, ethiopian_month) DO UPDATE SET
         status='DONE', locked=TRUE, total_gross=EXCLUDED.total_gross, total_deductions=EXCLUDED.total_deductions,
         total_net=EXCLUDED.total_net, done_by=EXCLUDED.done_by, done_at=NOW(), updated_at=NOW()
       RETURNING *`,
      [y, m, data.total_gross, data.total_deductions, data.total_net, actor]
    );
    const runId = run.rows[0].id;

    await client.query('DELETE FROM hr_payroll_items WHERE run_id = $1', [runId]);
    for (const row of data.payroll) {
      const breakdown = row.deductions_breakdown || [];
      const group = (name) => breakdown.filter(b => String(b.deduction_type).toLowerCase() === name).reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0);
      await client.query(
        `INSERT INTO hr_payroll_items
          (run_id, staff_id, staff_name, staff_type, account_number, base_salary, allowances, tax, debt,
           other_deductions, attendance_deductions, total_deductions, gross, net, flags, breakdown)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [runId, row.staff_id, row.staff_name, row.staff_type, row.account_number, row.base_salary,
         row.total_allowances, group('tax'), group('debt'),
         breakdown.filter(b => !['tax', 'debt', 'attendance'].includes(String(b.deduction_type).toLowerCase())).reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0),
         group('attendance'), row.total_deductions, row.gross_salary, row.net_salary,
         row.flags, JSON.stringify(breakdown)]
      );
    }

    // Finalize debt repayments in the same transaction
    const items = await client.query(
      `SELECT i.*, p.staff_id AS plan_staff, p.credit_id
         FROM hr_debt_plan_items i
         JOIN hr_debt_plans p ON p.id = i.plan_id
        WHERE i.ethiopian_year = $1 AND i.ethiopian_month = $2
          AND i.status = 'PENDING' AND p.status = 'ACTIVE'
        FOR UPDATE`,
      [y, m]
    );
    for (const it of items.rows) {
      await client.query(`UPDATE hr_debt_plan_items SET status = 'DEDUCTED', payroll_run_id = $1 WHERE id = $2`, [runId, it.id]);
      await client.query(`UPDATE hr_debt_plans SET remaining_amount = GREATEST(0, remaining_amount - $1), updated_at = NOW() WHERE id = $2`, [it.amount, it.plan_id]);
      await client.query(`UPDATE hr_staff_credits SET repaid_amount = repaid_amount + $1, updated_at = NOW() WHERE id = $2`, [it.amount, it.credit_id]);
      await client.query(
        `UPDATE hr_staff_credits SET status = CASE WHEN repaid_amount >= amount THEN 'REPAID' ELSE 'REPAYING' END WHERE id = $1`,
        [it.credit_id]
      );
      await client.query(
        `INSERT INTO hr_credit_repayments (credit_id, plan_id, payroll_run_id, amount, ethiopian_year, ethiopian_month)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [it.credit_id, it.plan_id, runId, it.amount, y, m]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { run_id: runId, ...data, locked: true, status: 'DONE' }, message: 'Payroll locked (Done).' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error locking payroll:', error);
    res.status(500).json({ error: 'Failed to lock payroll', details: error.message });
  } finally {
    client.release();
  }
});

// ---------- Unlock (admin) ----------
router.post('/unlock', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ethMonth, ethYear } = req.body;
    const m = parseInt(ethMonth);
    const y = parseInt(ethYear);
    await ensurePayrollTables(client);
    await client.query('BEGIN');

    const runRes = await client.query('SELECT * FROM hr_payroll_runs WHERE ethiopian_year = $1 AND ethiopian_month = $2 FOR UPDATE', [y, m]);
    const run = runRes.rows[0];
    if (!run) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Payroll month not found.' }); }
    if (!run.locked) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'This month is not locked.' }); }

    // Reverse debt repayments applied by this run
    const reps = await client.query('SELECT * FROM hr_credit_repayments WHERE payroll_run_id = $1', [run.id]);
    for (const r of reps.rows) {
      await client.query('UPDATE hr_staff_credits SET repaid_amount = GREATEST(0, repaid_amount - $1), updated_at = NOW() WHERE id = $2', [r.amount, r.credit_id]);
      await client.query(`UPDATE hr_staff_credits SET status = CASE WHEN repaid_amount >= amount THEN 'REPAID' WHEN repaid_amount > 0 THEN 'REPAYING' ELSE 'OPEN' END WHERE id = $1`, [r.credit_id]);
      await client.query('UPDATE hr_debt_plans SET remaining_amount = remaining_amount + $1, updated_at = NOW() WHERE id = $2', [r.amount, r.plan_id]);
      await client.query(`UPDATE hr_debt_plan_items SET status = 'PENDING', payroll_run_id = NULL WHERE plan_id = $1 AND ethiopian_year = $2 AND ethiopian_month = $3`, [r.plan_id, y, m]);
    }
    await client.query('DELETE FROM hr_credit_repayments WHERE payroll_run_id = $1', [run.id]);

    const actor = actorOf(req);
    await client.query(
      `UPDATE hr_payroll_runs SET locked = FALSE, status = 'DRAFT', unlocked_by = $1, unlocked_at = NOW(), unlock_reason = $2, updated_at = NOW() WHERE id = $3`,
      [actor, req.body.reason || null, run.id]
    );
    await client.query(
      `INSERT INTO hr_attendance_audit_log (entity, entity_id, action, performed_by, details)
       VALUES ('payroll', $1, 'payroll_unlocked', $2, $3)`,
      [String(run.id), actor, JSON.stringify({ year: y, month: m, reason: req.body.reason || null })]
    ).catch(() => {});

    await client.query('COMMIT');
    res.json({ success: true, message: 'Payroll unlocked.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error unlocking payroll:', error);
    res.status(500).json({ error: 'Failed to unlock payroll', details: error.message });
  } finally {
    client.release();
  }
});

// ---------- history ----------
router.get('/history', authenticateWithBranch, async (req, res) => {
  try {
    await ensurePayrollTables(pool);
    const rows = (await pool.query(
      `SELECT id, ethiopian_year, ethiopian_month, status, locked, total_gross, total_deductions, total_net, done_by, done_at
         FROM hr_payroll_runs ORDER BY ethiopian_year DESC, ethiopian_month DESC LIMIT 60`
    )).rows;
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll history', details: error.message });
  }
});

// ---------- exports ----------
async function dataForExport(ethMonth, ethYear) {
  const runRow = (await pool.query('SELECT * FROM hr_payroll_runs WHERE ethiopian_year=$1 AND ethiopian_month=$2', [parseInt(ethYear), parseInt(ethMonth)])).rows[0];
  if (runRow && runRow.locked) return loadRunWithItems(runRow.id);
  return computePayroll(ethMonth, ethYear);
}

router.post('/export-excel', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear, payrollData } = req.body;
    const data = payrollData ? { payroll: payrollData, month: ethMonth, year: ethYear } : await dataForExport(ethMonth, ethYear);
    const excelData = data.payroll.map((item, index) => ({
      'No.': index + 1,
      'Staff Name': item.staff_name,
      'Staff Type': item.staff_type,
      'Account Number': item.account_number,
      'Base Salary (Birr)': Number(item.base_salary).toFixed(2),
      'Total Allowances (Birr)': Number(item.total_allowances).toFixed(2),
      'Gross Salary (Birr)': Number(item.gross_salary).toFixed(2),
      'Total Deductions (Birr)': Number(item.total_deductions).toFixed(2),
      'Net Salary (Birr)': Number(item.net_salary).toFixed(2),
      'Deduction Breakdown': (item.deductions_breakdown || []).map(d => d.deduction_type + ': ' + Number(d.total_amount).toFixed(2)).join(' | '),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Payroll_' + ethMonth + '_' + ethYear + '.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting payroll to Excel:', error);
    res.status(500).json({ error: 'Failed to export payroll', details: error.message });
  }
});

// Minimal text PDF (no external dependency)
function escapePdf(s) {
  return String(s == null ? '' : s).replace(/[\\]/g, '\\\\').replace(/[()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '?');
}
function buildPdf(lines) {
  const perPage = 46, size = 8.5, leading = 13, margin = 34;
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (pages.length === 0) pages.push(['No data']);
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const fontObj = 3 + pages.length * 2;
  objs[2] = '<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + i * 2) + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>';
  pages.forEach((pageLines, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    objs[pageObj] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + fontObj + ' 0 R >> >> /Contents ' + contentObj + ' 0 R >>';
    const text = pageLines.map((ln, j) => 'BT /F1 ' + size + ' Tf 1 0 0 1 ' + margin + ' ' + (842 - margin - j * leading) + ' Tm (' + escapePdf(ln) + ') Tj ET').join('\n');
    objs[contentObj] = '<< /Length ' + Buffer.byteLength(text) + ' >>\nstream\n' + text + '\nendstream';
  });
  objs[fontObj] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
  for (let i = 1; i < objs.length; i++) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'latin1');
}

router.post('/export-pdf', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear } = req.body;
    const data = await dataForExport(ethMonth, ethYear);
    const lines = [];
    lines.push('SKOOLIFIC — Payroll ' + getEthiopianMonthName(parseInt(ethMonth)) + ' ' + ethYear);
    lines.push('Staff: ' + data.payroll.length + '   Gross: ' + Number(data.total_gross).toFixed(2) + '   Deductions: ' + Number(data.total_deductions).toFixed(2) + '   Net: ' + Number(data.total_net).toFixed(2));
    lines.push('');
    lines.push('No  ' + 'Staff'.padEnd(26) + 'Base'.padStart(10) + 'Allow'.padStart(10) + 'Gross'.padStart(11) + 'Deduct'.padStart(11) + 'Net'.padStart(11));
    lines.push('-'.repeat(96));
    data.payroll.forEach((r, i) => {
      lines.push(String(i + 1).padEnd(4) + String(r.staff_name || '').slice(0, 25).padEnd(26) +
        Number(r.base_salary).toFixed(2).padStart(10) +
        Number(r.total_allowances).toFixed(2).padStart(10) +
        Number(r.gross_salary).toFixed(2).padStart(11) +
        Number(r.total_deductions).toFixed(2).padStart(11) +
        Number(r.net_salary).toFixed(2).padStart(11));
    });
    const buf = buildPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Payroll_' + ethMonth + '_' + ethYear + '.pdf');
    res.send(buf);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF', details: error.message });
  }
});

function xmlEscape(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

router.post('/export-word', authenticateWithBranch, async (req, res) => {
  try {
    const { ethMonth, ethYear } = req.body;
    const data = await dataForExport(ethMonth, ethYear);
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');

    const paragraphs = [
      'SKOOLIFIC — Payroll ' + getEthiopianMonthName(parseInt(ethMonth)) + ' ' + ethYear,
      'Staff: ' + data.payroll.length + '   Gross: ' + Number(data.total_gross).toFixed(2) + '   Deductions: ' + Number(data.total_deductions).toFixed(2) + '   Net: ' + Number(data.total_net).toFixed(2),
      '',
      'No | Staff | Base | Allowances | Gross | Deductions | Net',
    ];
    data.payroll.forEach((r, i) => {
      paragraphs.push([i + 1, r.staff_name, Number(r.base_salary).toFixed(2), Number(r.total_allowances).toFixed(2), Number(r.gross_salary).toFixed(2), Number(r.total_deductions).toFixed(2), Number(r.net_salary).toFixed(2)].join(' | '));
    });

    const body = paragraphs.map(p => '<w:p><w:r><w:t xml:space="preserve">' + xmlEscape(p) + '</w:t></w:r></w:p>').join('');
    zip.folder('word').file('document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=Payroll_' + ethMonth + '_' + ethYear + '.docx');
    res.send(buf);
  } catch (error) {
    console.error('Word export error:', error);
    res.status(500).json({ error: 'Failed to export Word', details: error.message });
  }
});

module.exports = router;
module.exports.computePayroll = computePayroll;
