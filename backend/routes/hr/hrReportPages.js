const express = require('express');
const XLSX = require('xlsx');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateToken } = require('../../middleware/auth');
const { convertToEthiopian } = require('../../utils/ethiopianCalendar');

const q = async (sql, params = []) => {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.warn('hr report query failed:', e.message);
    return [];
  }
};

const monthName = (m) => ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'][m - 1] || m;

async function buildReport(report, params = {}) {
  const today = convertToEthiopian(new Date());
  const ethMonth = parseInt(params.ethMonth) || today.month;
  const ethYear = parseInt(params.ethYear) || today.year;

  switch (report) {
    case 'staff-summary': {
      const rows = await q(
        `SELECT staff_name, staff_type, base_salary, account_name, COALESCE(is_stopped, FALSE) AS stopped
           FROM hr_complete_salaries
          ORDER BY LOWER(staff_name)`
      );
      const stopped = rows.filter((r) => r.stopped).length;
      return {
        summary: {
          total_staff: rows.length,
          stopped_staff: stopped,
          total_base_salary: rows.reduce((s, r) => s + Number(r.base_salary || 0), 0),
        },
        columns: ['Staff', 'Type', 'Base Salary', 'Account', 'Stopped'],
        rows: rows.map((r) => ({
          Staff: r.staff_name,
          Type: r.staff_type,
          'Base Salary': Number(r.base_salary || 0),
          Account: r.account_name,
          Stopped: r.stopped ? 'Yes' : 'No',
        })),
      };
    }

    case 'attendance-report': {
      const rows = await q(
        `SELECT staff_name,
                COUNT(*) FILTER (WHERE UPPER(status) = 'PRESENT') AS present,
                COUNT(*) FILTER (WHERE UPPER(status) = 'ABSENT') AS absent,
                COUNT(*) FILTER (WHERE UPPER(status) = 'LATE') AS late,
                COUNT(*) FILTER (WHERE UPPER(status) = 'HALF_DAY') AS half_day,
                COUNT(*) FILTER (WHERE UPPER(status) = 'LEAVE') AS leave
           FROM hr_ethiopian_attendance
          WHERE ethiopian_month = $1 AND ethiopian_year = $2
          GROUP BY staff_name
          ORDER BY LOWER(staff_name)`,
        [ethMonth, ethYear]
      );
      return {
        summary: {
          ethiopian_month: monthName(ethMonth) + ' ' + ethYear,
          staff: rows.length,
          records: rows.reduce((s, r) => s + Number(r.present) + Number(r.absent) + Number(r.late) + Number(r.half_day) + Number(r.leave), 0),
        },
        columns: ['Staff', 'Present', 'Absent', 'Late', 'Half Day', 'Leave'],
        rows: rows.map((r) => ({
          Staff: r.staff_name,
          Present: Number(r.present),
          Absent: Number(r.absent),
          Late: Number(r.late),
          'Half Day': Number(r.half_day),
          Leave: Number(r.leave),
        })),
      };
    }

    case 'leave-report': {
      const rows = await q(
        `SELECT staff_name, status, COUNT(*) AS days
           FROM hr_ethiopian_attendance
          WHERE ethiopian_month = $1 AND ethiopian_year = $2
            AND UPPER(status) IN ('LEAVE', 'ABSENT', 'LATE', 'HALF_DAY')
          GROUP BY staff_name, status
          ORDER BY LOWER(staff_name), status`,
        [ethMonth, ethYear]
      );
      return {
        summary: { ethiopian_month: monthName(ethMonth) + ' ' + ethYear, staff: new Set(rows.map((r) => r.staff_name)).size, records: rows.length },
        columns: ['Staff', 'Status', 'Days'],
        rows: rows.map((r) => ({ Staff: r.staff_name, Status: r.status, Days: Number(r.days) })),
      };
    }

    case 'payroll-report':
    case 'payroll-detail': {
      const [salaries, allowances, deductions, credits, tips] = await Promise.all([
        q(`SELECT staff_id, staff_name, staff_type, base_salary, COALESCE(is_stopped, FALSE) AS stopped FROM hr_complete_salaries WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY LOWER(staff_name)`),
        q(`SELECT staff_id, SUM(amount) AS total FROM hr_allowances WHERE ethiopian_month = $1 AND ethiopian_year = $2 GROUP BY staff_id`, [ethMonth, ethYear]),
        q(`SELECT staff_id, deduction_type, SUM(amount) AS total FROM hr_deductions WHERE ethiopian_month = $1 AND ethiopian_year = $2 GROUP BY staff_id, deduction_type`, [ethMonth, ethYear]),
        q(`SELECT staff_id, SUM(amount) AS given, SUM(repaid_amount) AS repaid, SUM(amount - repaid_amount) AS outstanding FROM hr_staff_credits WHERE status <> 'CANCELLED' GROUP BY staff_id`),
        q(`SELECT staff_id, SUM(amount) AS total FROM hr_tips WHERE ethiopian_month = $1 AND ethiopian_year = $2 AND is_active = TRUE GROUP BY staff_id`, [ethMonth, ethYear]),
      ]);
      const aMap = new Map(allowances.map((r) => [String(r.staff_id), Number(r.total || 0)]));
      const tMap = new Map(tips.map((r) => [String(r.staff_id), Number(r.total || 0)]));
      const cMap = new Map(credits.map((r) => [String(r.staff_id), { given: Number(r.given || 0), repaid: Number(r.repaid || 0), outstanding: Number(r.outstanding || 0) }]));
      const dMap = new Map();
      for (const d of deductions) {
        const key = String(d.staff_id);
        if (!dMap.has(key)) dMap.set(key, { tax: 0, debt: 0, attendance: 0, other: 0 });
        const bucket = dMap.get(key);
        const type = String(d.deduction_type || '').toLowerCase();
        if (type === 'tax') bucket.tax += Number(d.total || 0);
        else if (type === 'debt') bucket.debt += Number(d.total || 0);
        else if (type === 'attendance') bucket.attendance += Number(d.total || 0);
        else bucket.other += Number(d.total || 0);
      }

      const rows = salaries.map((s) => {
        const base = Number(s.base_salary || 0);
        const allow = aMap.get(String(s.staff_id)) || 0;
        const d = dMap.get(String(s.staff_id)) || { tax: 0, debt: 0, attendance: 0, other: 0 };
        const ded = d.tax + d.debt + d.attendance + d.other;
        const c = cMap.get(String(s.staff_id)) || { outstanding: 0 };
        return {
          Staff: s.staff_name,
          Type: s.staff_type,
          Base: base,
          Allowances: allow,
          Tax: d.tax,
          Debt: d.debt,
          Attendance: d.attendance,
          Other: d.other,
          Net: base + allow - ded,
          'Credit Balance': c.outstanding,
          Tips: tMap.get(String(s.staff_id)) || 0,
          Stopped: s.stopped ? 'Yes' : 'No',
        };
      });

      return {
        summary: {
          ethiopian_month: monthName(ethMonth) + ' ' + ethYear,
          staff: rows.length,
          gross: rows.reduce((s, r) => s + r.Base + r.Allowances, 0),
          tax: rows.reduce((s, r) => s + r.Tax, 0),
          debt: rows.reduce((s, r) => s + r.Debt, 0),
          attendance: rows.reduce((s, r) => s + r.Attendance, 0),
          other: rows.reduce((s, r) => s + r.Other, 0),
          net: rows.reduce((s, r) => s + r.Net, 0),
          tips: rows.reduce((s, r) => s + r.Tips, 0),
        },
        columns: ['Staff', 'Type', 'Base', 'Allowances', 'Tax', 'Debt', 'Attendance', 'Other', 'Net', 'Credit Balance', 'Tips', 'Stopped'],
        rows,
      };
    }

    case 'tips-credits': {
      const [tips, credits, repayments] = await Promise.all([
        q(`SELECT tip_type, COUNT(*) AS n, SUM(amount) AS total FROM hr_tips WHERE ethiopian_month = $1 AND ethiopian_year = $2 AND is_active = TRUE GROUP BY tip_type ORDER BY tip_type`, [ethMonth, ethYear]),
        q(`SELECT staff_id, staff_name, SUM(amount) AS given, SUM(repaid_amount) AS repaid, SUM(amount - repaid_amount) AS outstanding FROM hr_staff_credits WHERE status <> 'CANCELLED' GROUP BY staff_id, staff_name ORDER BY staff_name`),
        q(`SELECT staff_id, SUM(amount) AS total FROM hr_credit_repayments WHERE ethiopian_month = $1 AND ethiopian_year = $2 GROUP BY staff_id`, [ethMonth, ethYear]),
      ]);
      const repMap = new Map(repayments.map((r) => [String(r.staff_id), Number(r.total || 0)]));
      const rows = credits.map((c) => ({
        Staff: c.staff_name || c.staff_id,
        'Credit Given': Number(c.given || 0),
        'Repaid (all)': Number(c.repaid || 0),
        'Recovered this month': repMap.get(String(c.staff_id)) || 0,
        Outstanding: Number(c.outstanding || 0),
      }));
      const tipsTotal = tips.reduce((s, t) => s + Number(t.total || 0), 0);
      return {
        summary: {
          ethiopian_month: monthName(ethMonth) + ' ' + ethYear,
          tips_total: tipsTotal,
          tips_count: tips.reduce((s, t) => s + Number(t.n), 0),
          credits_given: credits.reduce((s, c) => s + Number(c.given || 0), 0),
          credits_repaid: credits.reduce((s, c) => s + Number(c.repaid || 0), 0),
          credits_outstanding: credits.reduce((s, c) => s + Number(c.outstanding || 0), 0),
          recovered_this_month: repayments.reduce((s, r) => s + Number(r.total || 0), 0),
          money_out: tipsTotal + credits.reduce((s, c) => s + Number(c.given || 0), 0),
        },
        columns: ['Staff', 'Credit Given', 'Repaid (all)', 'Recovered this month', 'Outstanding'],
        rows,
      };
    }

    case 'stopped-staff': {
      const rows = await q(
        `SELECT staff_name, staff_type, base_salary, stopped_at FROM hr_complete_salaries WHERE COALESCE(is_stopped, FALSE) = TRUE ORDER BY LOWER(staff_name)`
      );
      return {
        summary: { stopped_staff: rows.length },
        columns: ['Staff', 'Type', 'Base Salary', 'Stopped At'],
        rows: rows.map((r) => ({ Staff: r.staff_name, Type: r.staff_type, 'Base Salary': Number(r.base_salary || 0), 'Stopped At': r.stopped_at || '' })),
      };
    }

    default:
      return {
        summary: { note: 'This report will be completed in the HR report update' },
        columns: ['Info'],
        rows: [{ Info: 'No data source yet for this report.' }],
      };
  }
}

function buildPdf(lines) {
  const escape = (s) => String(s == null ? '' : s).replace(/[\\]/g, '\\\\').replace(/[()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '?');
  const perPage = 46, size = 8.5, leading = 13, margin = 34;
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push(['No data']);
  const objs = [];
  const fontObj = 3 + pages.length * 2;
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + i * 2) + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>';
  pages.forEach((pageLines, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    objs[pageObj] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + fontObj + ' 0 R >> >> /Contents ' + contentObj + ' 0 R >>';
    const text = pageLines.map((ln, j) => 'BT /F1 ' + size + ' Tf 1 0 0 1 ' + margin + ' ' + (842 - margin - j * leading) + ' Tm (' + escape(ln) + ') Tj ET').join('\n');
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

router.get('/:report', authenticateToken, async (req, res) => {
  try {
    const data = await buildReport(req.params.report, req.query);
    res.json({ success: true, data });
  } catch (e) {
    console.error('HR report error:', e);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/:report/export', authenticateToken, async (req, res) => {
  try {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const data = await buildReport(req.params.report, req.query);

    if (format === 'pdf') {
      const cols = data.columns || [];
      const lines = [];
      const title = req.params.report.replace(/-/g, ' ').toUpperCase();
      lines.push('SKOOLIFIC — ' + title);
      for (const [k, v] of Object.entries(data.summary || {})) {
        lines.push(String(k).replace(/_/g, ' ') + ': ' + (typeof v === 'number' ? v.toFixed(2) : v));
      }
      lines.push('');
      lines.push(cols.map((c) => String(c).slice(0, 18).padEnd(19)).join(''));
      lines.push('-'.repeat(cols.length * 19));
      for (const row of data.rows || []) {
        lines.push(cols.map((c) => String(row[c] === undefined ? '' : row[c]).slice(0, 18).padEnd(19)).join(''));
      }
      const buf = buildPdf(lines);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.report + '.pdf');
      return res.send(buf);
    }

    if (format !== 'xlsx' && format !== 'excel' && format !== 'csv') {
      return res.status(400).json({ success: false, error: 'Unsupported format' });
    }
    const ws = XLSX.utils.json_to_sheet(data.rows.length ? data.rows : [{ Info: 'No data' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.report + '.csv');
      return res.send(csv);
    }
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.report + '.xlsx');
    res.send(buf);
  } catch (e) {
    console.error('HR report export error:', e);
    res.status(500).json({ success: false, error: 'Failed to export report' });
  }
});

module.exports = router;
