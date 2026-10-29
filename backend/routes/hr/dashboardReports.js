const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticateToken } = require('../../middleware/auth');
const { convertToEthiopian } = require('../../utils/ethiopianCalendar');

const count = async (sql, params = [], fallback = 0) => {
  try {
    const r = await pool.query(sql, params);
    return parseInt(r.rows[0] && r.rows[0].n) || fallback;
  } catch (_) {
    return fallback;
  }
};

// GET /api/hr/stats  |  /api/hr/dashboard/summary  |  /api/reports/hr/summary
const getSummary = async (req, res) => {
  try {
    const [totalStaff, activeStaff, pendingLeaves] = await Promise.all([
      count(`SELECT COUNT(DISTINCT global_staff_id)::int AS n FROM staff_users WHERE global_staff_id IS NOT NULL`),
      count(`SELECT COUNT(*)::int AS n FROM hr_complete_salaries WHERE COALESCE(is_active, TRUE) = TRUE AND COALESCE(is_stopped, FALSE) = FALSE`),
      count(`SELECT COUNT(*)::int AS n FROM hr_attendance_permissions WHERE COALESCE(permission_status, 'PENDING') = 'PENDING'`),
    ]);

    const eth = convertToEthiopian(new Date());
    let present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0;
    try {
      const r = await pool.query(
        `SELECT UPPER(status) AS status, COUNT(*)::int AS n
           FROM hr_ethiopian_attendance
          WHERE ethiopian_year = $1 AND ethiopian_month = $2 AND ethiopian_day = $3
          GROUP BY UPPER(status)`,
        [eth.year, eth.month, eth.day]
      );
      for (const row of r.rows) {
        const n = parseInt(row.n) || 0;
        if (row.status === 'PRESENT') present += n;
        else if (row.status === 'ABSENT') absent += n;
        else if (row.status === 'LATE') late += n;
        else if (row.status === 'HALF_DAY') halfDay += n;
        else if (row.status === 'LEAVE') onLeave += n;
      }
    } catch (_) {}

    res.json({
      success: true,
      data: {
        totalStaff,
        activeStaff,
        openPositions: 0,
        pendingLeaves,
        present,
        absent,
        late,
        halfDay,
        onLeave,
        ethiopianDate: eth.year + '-' + eth.month + '-' + eth.day,
      },
    });
  } catch (error) {
    console.error('Error fetching HR summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch HR summary' });
  }
};

router.get('/', authenticateToken, getSummary);
router.get('/summary', authenticateToken, getSummary);
router.get('/stats', authenticateToken, getSummary);

module.exports = router;
module.exports.getSummary = getSummary;
