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

async function buildReport(report) {
  const eth = convertToEthiopian(new Date());

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
          GROUP BY staff_name
          ORDER BY LOWER(staff_name)`
      );
      return {
        summary: {
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
          WHERE UPPER(status) IN ('LEAVE', 'ABSENT', 'LATE', 'HALF_DAY')
          GROUP BY staff_name, status
          ORDER BY LOWER(staff_name), status`
      );
      return {
        summary: { staff: new Set(rows.map((r) => r.staff_name)).size, records: rows.length },
        columns: ['Staff', 'Status', 'Days'],
        rows: rows.map((r) => ({ Staff: r.staff_name, Status: r.status, Days: Number(r.days) })),
      };
    }
    case 'payroll-report': {
      const [salaries, allowances, deductions] = await Promise.all([
        q(`SELECT staff_id, staff_name, staff_type, base_salary FROM hr_complete_salaries WHERE COALESCE(is_active, TRUE) = TRUE AND COALESCE(is_stopped, FALSE) = FALSE`),
        q(`SELECT staff_id, SUM(amount) AS total FROM hr_allowances WHERE ethiopian_month = $1 AND ethiopian_year = $2 GROUP BY staff_id`, [eth.month, eth.year]),
        q(`SELECT staff_id, SUM(amount) AS total FROM hr_deductions WHERE ethiopian_month = $1 AND ethiopian_year = $2 GROUP BY staff_id`, [eth.month, eth.year]),
      ]);
      const aMap = new Map(allowances.map((r) => [String(r.staff_id), Number(r.total || 0)]));
      const dMap = new Map(deductions.map((r) => [String(r.staff_id), Number(r.total || 0)]));
      const rows = salaries.map((s) => {
        const base = Number(s.base_salary || 0);
        const allow = aMap.get(String(s.staff_id)) || 0;
        const ded = dMap.get(String(s.staff_id)) || 0;
        return { Staff: s.staff_name, Type: s.staff_type, Base: base, Allowances: allow, Deductions: ded, Net: base + allow - ded };
      });
      return {
        summary: {
          ethiopian_month: eth.month + '/' + eth.year,
          staff: rows.length,
          gross: rows.reduce((s, r) => s + r.Base + r.Allowances, 0),
          deductions: rows.reduce((s, r) => s + r.Deductions, 0),
          net: rows.reduce((s, r) => s + r.Net, 0),
        },
        columns: ['Staff', 'Type', 'Base', 'Allowances', 'Deductions', 'Net'],
        rows,
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

router.get('/:report', authenticateToken, async (req, res) => {
  try {
    const data = await buildReport(req.params.report);
    res.json({ success: true, data });
  } catch (e) {
    console.error('HR report error:', e);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

router.get('/:report/export', authenticateToken, async (req, res) => {
  try {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    if (format !== 'xlsx' && format !== 'excel' && format !== 'csv') {
      return res.status(501).json({ success: false, error: 'Only Excel export is available right now.' });
    }
    const data = await buildReport(req.params.report);
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
