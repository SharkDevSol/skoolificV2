const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateWithBranch } = require('../../middleware/branchAuth');

// ---------- helpers ----------
async function ensureTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_tips (
      id SERIAL PRIMARY KEY, staff_id VARCHAR(50), staff_name VARCHAR(150),
      tip_type VARCHAR(100) NOT NULL DEFAULT 'Other', amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      reason TEXT, ethiopian_year INTEGER, ethiopian_month INTEGER, ethiopian_day INTEGER,
      expense_id INTEGER, is_active BOOLEAN DEFAULT TRUE, created_by VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_tip_types (
      id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`INSERT INTO hr_tip_types (name) VALUES ('Gift'),('Bonus'),('Help'),('Transport'),('Other') ON CONFLICT (name) DO NOTHING`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_staff_credits (
      id SERIAL PRIMARY KEY, staff_id VARCHAR(50) NOT NULL, staff_name VARCHAR(150),
      amount NUMERIC(12,2) NOT NULL DEFAULT 0, reason TEXT, credit_date DATE DEFAULT CURRENT_DATE,
      ethiopian_year INTEGER, ethiopian_month INTEGER, ethiopian_day INTEGER,
      repaid_amount NUMERIC(12,2) NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      expense_id INTEGER, cancel_reason TEXT, created_by VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_debt_plans (
      id SERIAL PRIMARY KEY, credit_id INTEGER NOT NULL REFERENCES hr_staff_credits(id) ON DELETE CASCADE,
      staff_id VARCHAR(50) NOT NULL, total_amount NUMERIC(12,2) NOT NULL, months INTEGER NOT NULL,
      monthly_amount NUMERIC(12,2) NOT NULL, start_eth_year INTEGER, start_eth_month INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_by VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS hr_debt_plan_items (
      id SERIAL PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES hr_debt_plans(id) ON DELETE CASCADE,
      ethiopian_year INTEGER NOT NULL, ethiopian_month INTEGER NOT NULL,
      amount NUMERIC(12,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      payroll_run_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  for (const col of ['reference_type VARCHAR(30)', 'reference_id VARCHAR(60)', 'cancelled BOOLEAN DEFAULT FALSE']) {
    await db.query(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }
}

function nextMonth(year, month) {
  if (month >= 13) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

async function insertExpense(db, { category, description, amount, dateStr, source, referenceType, referenceId, actor }) {
  const r = await db.query(
    `INSERT INTO public.expenses
      (expense_number, category, description, amount, expense_date, source, status,
       created_by, approved_by, approved_at, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', $7, $7, NOW(), $8, $9)
     RETURNING *`,
    [
      referenceType.toUpperCase() + '-' + referenceId + '-' + Date.now(),
      category, description, amount, dateStr || new Date().toISOString().slice(0, 10),
      source, actor, referenceType, String(referenceId),
    ]
  );
  return r.rows[0];
}

const actorOf = (req) => (req.user && (req.user.username || String(req.user.id))) || 'admin';

// ---------- TIPS ----------
router.get('/tips', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(pool);
    const { ethMonth, ethYear, tipType, staffId } = req.query;
    let q = `SELECT * FROM hr_tips WHERE is_active = TRUE`;
    const p = [];
    if (ethMonth) { p.push(parseInt(ethMonth)); q += ` AND ethiopian_month = $${p.length}`; }
    if (ethYear) { p.push(parseInt(ethYear)); q += ` AND ethiopian_year = $${p.length}`; }
    if (tipType) { p.push(tipType); q += ` AND tip_type = $${p.length}`; }
    if (staffId) { p.push(String(staffId)); q += ` AND staff_id = $${p.length}`; }
    q += ` ORDER BY created_at DESC`;
    const rows = (await pool.query(q, p)).rows;
    res.json({ success: true, data: rows, total: rows.reduce((s, r) => s + Number(r.amount || 0), 0) });
  } catch (e) {
    console.error('tips list error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/tips/types', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(pool);
    const rows = (await pool.query(`SELECT name FROM hr_tip_types WHERE is_active = TRUE ORDER BY name`)).rows;
    res.json({ success: true, data: rows.map(r => r.name) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/tips/types', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(pool);
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    await pool.query(`INSERT INTO hr_tip_types (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET is_active = TRUE`, [name]);
    res.json({ success: true, data: name });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/tips', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    const { staffId, staffName, tipType, amount, reason, ethYear, ethMonth, ethDay } = req.body;
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
    await ensureTables(client);
    await client.query('BEGIN');
    const actor = actorOf(req);
    const type = String(tipType || 'Other').trim() || 'Other';
    const tip = await client.query(
      `INSERT INTO hr_tips (staff_id, staff_name, tip_type, amount, reason, ethiopian_year, ethiopian_month, ethiopian_day, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [staffId || null, staffName || null, type, amt, reason || null, ethYear || null, ethMonth || null, ethDay || null, actor]
    );
    const tipRow = tip.rows[0];
    const exp = await insertExpense(client, {
      category: 'Tips',
      description: 'Tip: ' + type + (staffName ? ' — ' + staffName : '') + (reason ? ' (' + reason + ')' : ''),
      amount: amt,
      dateStr: null,
      source: 'tips',
      referenceType: 'tip',
      referenceId: tipRow.id,
      actor,
    });
    await client.query(`UPDATE hr_tips SET expense_id = $1 WHERE id = $2`, [exp.id, tipRow.id]);
    await client.query('COMMIT');
    res.json({ success: true, data: { ...tipRow, expense_id: exp.id } });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('tip create error:', e);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

router.delete('/tips/:id', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    await client.query('BEGIN');
    const t = await client.query('SELECT * FROM hr_tips WHERE id = $1', [req.params.id]);
    if (!t.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Tip not found' }); }
    const tip = t.rows[0];
    if (tip.expense_id) {
      await client.query('DELETE FROM public.expenses WHERE id = $1', [tip.expense_id]);
    }
    await client.query('DELETE FROM hr_tips WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

// ---------- CREDITS ----------
router.get('/credits', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(pool);
    const { staffId, status } = req.query;
    let q = `SELECT c.*, COALESCE(c.amount - c.repaid_amount, 0) AS remaining FROM hr_staff_credits c WHERE 1=1`;
    const p = [];
    if (staffId) { p.push(String(staffId)); q += ` AND c.staff_id = $${p.length}`; }
    if (status) { p.push(status); q += ` AND c.status = $${p.length}`; }
    q += ` ORDER BY c.created_at DESC`;
    const rows = (await pool.query(q, p)).rows;
    const plans = (await pool.query(`SELECT * FROM hr_debt_plans WHERE status = 'ACTIVE'`)).rows;
    const byCredit = {};
    for (const pl of plans) byCredit[pl.credit_id] = pl;
    res.json({ success: true, data: rows.map(r => ({ ...r, plan: byCredit[r.id] || null })) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/credits', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    const { staffId, staffName, amount, reason, ethYear, ethMonth, ethDay } = req.body;
    const amt = Number(amount) || 0;
    if (!staffId) return res.status(400).json({ success: false, error: 'staffId is required' });
    if (amt <= 0) return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
    await ensureTables(client);
    await client.query('BEGIN');
    const actor = actorOf(req);
    const c = await client.query(
      `INSERT INTO hr_staff_credits (staff_id, staff_name, amount, reason, ethiopian_year, ethiopian_month, ethiopian_day, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN',$8) RETURNING *`,
      [String(staffId), staffName || null, amt, reason || null, ethYear || null, ethMonth || null, ethDay || null, actor]
    );
    const credit = c.rows[0];
    const exp = await insertExpense(client, {
      category: 'Staff Credit',
      description: 'Staff credit: ' + (staffName || staffId) + (reason ? ' (' + reason + ')' : ''),
      amount: amt,
      dateStr: null,
      source: 'credit',
      referenceType: 'credit',
      referenceId: credit.id,
      actor,
    });
    await client.query(`UPDATE hr_staff_credits SET expense_id = $1 WHERE id = $2`, [exp.id, credit.id]);
    await client.query('COMMIT');

    let warning = null;
    try {
      const stop = await client.query(`SELECT is_stopped FROM hr_complete_salaries WHERE staff_id = $1 LIMIT 1`, [String(staffId)]);
      if (stop.rows[0] && stop.rows[0].is_stopped === true) warning = 'This staff is stopped — no payroll will recover this credit.';
    } catch (_) {}

    res.json({ success: true, data: { ...credit, expense_id: exp.id }, warning });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('credit create error:', e);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

router.post('/credits/:id/cancel', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    await client.query('BEGIN');
    const c = await client.query('SELECT * FROM hr_staff_credits WHERE id = $1', [req.params.id]);
    if (!c.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Credit not found' }); }
    const credit = c.rows[0];
    if (Number(credit.repaid_amount) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Cannot cancel a credit that already has repayments.' });
    }
    await client.query(`UPDATE hr_staff_credits SET status = 'CANCELLED', cancel_reason = $1, updated_at = NOW() WHERE id = $2`,
      [req.body.reason || null, req.params.id]);
    if (credit.expense_id) {
      await client.query(`UPDATE public.expenses SET cancelled = TRUE, status = 'REJECTED', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
        ['Credit cancelled: ' + (req.body.reason || 'no reason'), credit.expense_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

router.delete('/credits/:id', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    await client.query('BEGIN');
    const c = await client.query('SELECT * FROM hr_staff_credits WHERE id = $1', [req.params.id]);
    if (!c.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Credit not found' }); }
    const credit = c.rows[0];
    if (Number(credit.repaid_amount) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Cannot delete a credit with repayments. Cancel it instead.' });
    }
    if (credit.expense_id) await client.query('DELETE FROM public.expenses WHERE id = $1', [credit.expense_id]);
    await client.query('DELETE FROM hr_staff_credits WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

// ---------- DEBT REPAYMENT PLANS ----------
router.get('/debt-plans', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(pool);
    const { creditId, staffId } = req.query;
    let q = `SELECT * FROM hr_debt_plans WHERE 1=1`;
    const p = [];
    if (creditId) { p.push(parseInt(creditId)); q += ` AND credit_id = $${p.length}`; }
    if (staffId) { p.push(String(staffId)); q += ` AND staff_id = $${p.length}`; }
    q += ` ORDER BY created_at DESC`;
    const plans = (await pool.query(q, p)).rows;
    for (const pl of plans) {
      pl.items = (await pool.query(`SELECT * FROM hr_debt_plan_items WHERE plan_id = $1 ORDER BY ethiopian_year, ethiopian_month`, [pl.id])).rows;
    }
    res.json({ success: true, data: plans });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/debt-plans', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    const { creditId, months, startEthMonth, startEthYear } = req.body;
    const nMonths = parseInt(months);
    const sMonth = parseInt(startEthMonth);
    const sYear = parseInt(startEthYear);
    if (!creditId || !nMonths || nMonths < 1 || !sMonth || !sYear) {
      return res.status(400).json({ success: false, error: 'creditId, months, startEthMonth and startEthYear are required' });
    }
    await ensureTables(client);
    await client.query('BEGIN');

    const c = await client.query('SELECT * FROM hr_staff_credits WHERE id = $1 FOR UPDATE', [creditId]);
    if (!c.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Credit not found' }); }
    const credit = c.rows[0];
    if (credit.status === 'CANCELLED' || credit.status === 'REPAID') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Credit is ' + credit.status });
    }
    const active = await client.query(`SELECT id FROM hr_debt_plans WHERE credit_id = $1 AND status = 'ACTIVE'`, [creditId]);
    if (active.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This credit already has an active repayment plan.' });
    }

    const remaining = Math.max(0, Number(credit.amount) - Number(credit.repaid_amount));
    if (remaining <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'Credit is already fully repaid.' }); }

    const monthly = Math.round((remaining / nMonths) * 100) / 100;
    const plan = await client.query(
      `INSERT INTO hr_debt_plans (credit_id, staff_id, total_amount, months, monthly_amount,
        start_eth_year, start_eth_month, status, remaining_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$3,$8) RETURNING *`,
      [creditId, credit.staff_id, remaining, nMonths, monthly, sYear, sMonth, actorOf(req)]
    );
    const planRow = plan.rows[0];

    let y = sYear, m = sMonth;
    let left = remaining;
    for (let i = 0; i < nMonths; i++) {
      const amt = (i === nMonths - 1) ? Math.round(left * 100) / 100 : Math.min(monthly, Math.round(left * 100) / 100);
      await client.query(
        `INSERT INTO hr_debt_plan_items (plan_id, ethiopian_year, ethiopian_month, amount) VALUES ($1,$2,$3,$4)`,
        [planRow.id, y, m, amt]
      );
      left = Math.round((left - amt) * 100) / 100;
      const nm = nextMonth(y, m); y = nm.year; m = nm.month;
    }

    await client.query(`UPDATE hr_staff_credits SET status = 'REPAYING', updated_at = NOW() WHERE id = $1`, [creditId]);
    await client.query('COMMIT');
    const items = (await client.query(`SELECT * FROM hr_debt_plan_items WHERE plan_id = $1 ORDER BY ethiopian_year, ethiopian_month`, [planRow.id])).rows;
    res.json({ success: true, data: { ...planRow, items } });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('debt plan error:', e);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

router.post('/debt-plans/:id/cancel', authenticateWithBranch, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    await client.query('BEGIN');
    const pl = await client.query('SELECT * FROM hr_debt_plans WHERE id = $1', [req.params.id]);
    if (!pl.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Plan not found' }); }
    await client.query(`UPDATE hr_debt_plans SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    await client.query(`UPDATE hr_debt_plan_items SET status = 'SKIPPED' WHERE plan_id = $1 AND status = 'PENDING'`, [req.params.id]);
    await client.query(`UPDATE hr_staff_credits SET status = CASE WHEN repaid_amount >= amount THEN 'REPAID' ELSE 'OPEN' END, updated_at = NOW() WHERE id = $1`, [pl.rows[0].credit_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
