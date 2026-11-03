import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styles from './ModernDashboard.module.css';
import api from '../../utils/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Users, UserCheck, GraduationCap, TrendingUp, TrendingDown,
  Calendar, DollarSign, AlertTriangle, BookOpen, Clock,
  RefreshCw, ArrowUpRight, ArrowDownRight, Activity,
  CheckCircle, XCircle, AlertCircle, FileText, MessageSquare,
  Award, Target, BarChart3, PieChart as PieChartIcon, TrendingDown as TrendingDownIcon,
  UserPlus, DollarSign as DollarSignIcon, Package, Wrench, Briefcase, Banknote
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentEthiopianMonth } from '../../utils/ethiopianCalendar';

const ModernDashboard = () => {
  const { theme, t } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // All statistics
  const [stats, setStats] = useState({
    students: { total: 0, male: 0, female: 0, trend: 0 },
    staff: { total: 0, teachers: 0, trend: 0 },
    classes: { total: 0 },
    attendance: { rate: 0, present: 0, absent: 0, trend: 0 },
    revenue: { total: 0, collected: 0, pending: 0, trend: 0 },
    performance: { average: 0, passRate: 0, trend: 0 },
    faults: { total: 0, thisWeek: 0, critical: 0 },
    evaluations: { total: 0, completed: 0, pending: 0 },
    posts: { total: 0, thisWeek: 0 },
    hr: { present: 0, absent: 0, onLeave: 0 },
    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    guardians: { total: 0, engagement: 0 }
  });

  // Chart data
  const [attendanceData, setAttendanceData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [faultsByType, setFaultsByType] = useState([]);
  const [faultsByLevel, setFaultsByLevel] = useState([]);
  const [recentFaults, setRecentFaults] = useState([]);
  const [staffByType, setStaffByType] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [monthlyPayments, setMonthlyPayments] = useState({ summary: null, classes: [] });

  // Attendance and Marks analytics states
  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [dashAttTab, setDashAttTab] = useState('absent'); // 'absent' | 'present' | 'late' | 'permission'
  const [dashAttClass, setDashAttClass] = useState('ALL');

  const isBilal = typeof window !== 'undefined' && String(localStorage.getItem('userBranch') || '').toUpperCase().includes('BILAL');
  const [dashTerm, setDashTerm] = useState('1');
  const [academicAnalytics, setAcademicAnalytics] = useState(null);
  const [dashMarkRankTab, setDashMarkRankTab] = useState('highest'); // 'highest' | 'lowest'
  const [dashMarkClass, setDashMarkClass] = useState('ALL');

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#a8edea'];

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL reports in parallel with better error handling
      const [
        dashboardRes,
        studentsRes,
        staffRes,
        financeRes,
        academicRes,
        attendanceRes,
        faultsRes,
        faultsByTypeRes,
        faultsByLevelRes,
        recentFaultsRes,
        hrRes,
        inventoryRes,
        attAnalyticsRes,
        acadAnalyticsRes,
        evaluationsRes,
        postsRes,
        guardiansRes,
        activityRes,
        attendanceTrendsRes
      ] = await Promise.all([
        api.get('/dashboard/enhanced-stats').catch((err) => {
          console.error('Dashboard stats error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/students/summary').catch((err) => {
          console.error('Students report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/staff/summary').catch((err) => {
          console.error('Staff report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/finance/summary').catch((err) => {
          console.error('Finance report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/academic/class-performance').catch((err) => {
          console.error('Academic report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/attendance/summary').catch((err) => {
          console.error('Attendance report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/faults/summary').catch((err) => {
          console.error('Faults summary error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/faults/by-type').catch((err) => {
          console.error('Faults by type error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/faults/by-level').catch((err) => {
          console.error('Faults by level error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/faults/recent?days=7&limit=5').catch((err) => {
          console.error('Recent faults error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/hr/summary').catch((err) => {
          console.error('HR report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/inventory/summary').catch((err) => {
          console.error('Inventory report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/dashboard/attendance-analytics').catch((err) => {
          console.error('Attendance analytics error:', err.response?.status, err.response?.data?.error);
          return { data: null };
        }),
        api.get('/dashboard/academic-analytics', { params: { term: dashTerm } }).catch((err) => {
          console.error('Academic analytics error:', err.response?.status, err.response?.data?.error);
          return { data: null };
        }),
        api.get('/reports/evaluations/summary').catch((err) => {
          console.error('Evaluations report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/posts/summary').catch((err) => {
          console.error('Posts report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/guardians/summary').catch((err) => {
          console.error('Guardians report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/activity/recent?limit=10').catch((err) => {
          console.error('Activity report error:', err.response?.status, err.response?.data?.error);
          return { data: {} };
        }),
        api.get('/reports/attendance/trends').catch((err) => {
          console.error('Attendance trends error:', err.response?.status, err.response?.data?.error);
          return { data: [] };
        })
      ]);

      // Monthly payment overview (per-class breakdown, in Birr)
      const ethMonth = getCurrentEthiopianMonth()?.month || 1;
      const monthlyRes = await api
        .get(`/finance/monthly-payments-view/overview?currentMonth=${ethMonth}`)
        .catch((err) => {
          console.error('Monthly payment overview error:', err.response?.status, err.response?.data?.error);
          return { data: { summary: null, classes: [] } };
        });
      const monthlyData = monthlyRes.data || { summary: null, classes: [] };
      setMonthlyPayments({
        summary: monthlyData.summary || null,
        classes: (monthlyData.classes || []).map((cls) => ({
          className: cls.className,
          monthlyFee: Number(cls.monthlyFee) || 0,
          totalStudents: cls.totalStudents || 0,
          payingStudents: cls.payingStudents || 0,
          totalPaid: Number(cls.totalPaid) || 0,
          totalPending: Number(cls.totalPending) || 0,
          unlockedTotalPaid: Number(cls.unlockedTotalPaid) || 0,
          unlockedTotalPending: Number(cls.unlockedTotalPending) || 0,
          totalInvoices: cls.totalInvoices || 0
        }))
      });

      const data = dashboardRes.data;
      const basicStats = data.basic || {};
      const academicData = data.academic || {};
      const studentsData = studentsRes.data?.data || studentsRes.data || {};
      const staffData = staffRes.data?.data || staffRes.data || {};
      const financeData = financeRes.data?.data || financeRes.data || {};
      const attData = attendanceRes.data?.data || attendanceRes.data || {};
      const faultsData = faultsRes.data?.data || faultsRes.data || {};
      const hrData = hrRes.data?.data || hrRes.data || {};
      const inventoryData = inventoryRes.data?.data || inventoryRes.data || {};
      if (attAnalyticsRes?.data) setAttendanceAnalytics(attAnalyticsRes.data);
      if (acadAnalyticsRes?.data) setAcademicAnalytics(acadAnalyticsRes.data);
      const evaluationsData = evaluationsRes.data?.data || evaluationsRes.data || {};
      const postsData = postsRes.data?.data || postsRes.data || {};
      const guardiansData = guardiansRes.data?.data || guardiansRes.data || {};

      // Set main stats
      setStats({
        students: {
          total: studentsData.total || studentsData.totalStudents || basicStats.totalStudents || 0,
          male: studentsData.male ?? basicStats.gender?.male ?? 0,
          female: studentsData.female ?? basicStats.gender?.female ?? 0,
          trend: studentsData.trend || 0
        },
        staff: {
          total: staffData.total || staffData.totalStaff || basicStats.staffCount || 0,
          teachers: staffData.teachers || 0,
          trend: staffData.trend || 0
        },
        classes: {
          total: studentsData.classCount || basicStats.classes?.length || 0
        },
        attendance: {
          rate: Number(attData.attendanceRate ?? attData.rate) || 0,
          present: attData.present || 0,
          absent: attData.absent || 0,
          trend: attData.trend || 0
        },
        revenue: {
          total: (financeData.revenue || 0) + (financeData.pending || 0),
          collected: financeData.revenue || 0,
          pending: financeData.pending || 0,
          trend: financeData.trend || 0
        },
        performance: {
          average: parseFloat(academicData.classAverages?.[0]?.average) || academicData.averageScore || 0,
          passRate: academicData.passRate || 0,
          trend: academicData.trend || 0
        },
        faults: {
          total: faultsData.total || faultsData.totalFaults || basicStats.totalFaults || 0,
          thisWeek: faultsData.weeklyFaults || 0,
          critical: faultsData.criticalFaults || 0
        },
        evaluations: {
          total: evaluationsData.total || 0,
          completed: evaluationsData.completed || 0,
          pending: evaluationsData.pending || 0
        },
        posts: {
          total: postsData.total || 0,
          thisWeek: postsData.thisWeek || 0
        },
        hr: {
          present: hrData.present || 0,
          absent: hrData.absent || 0,
          onLeave: hrData.onLeave || 0
        },
        inventory: {
          totalItems: inventoryData.totalItems || 0,
          lowStock: inventoryData.lowStock || 0,
          outOfStock: inventoryData.outOfStock || 0,
          totalValue: inventoryData.totalValue || 0
        },
        guardians: {
          total: guardiansData.total || 0,
          engagement: guardiansData.engagement || 0
        }
      });

      // Attendance trend data (last 7 days)
      const trends = attendanceTrendsRes.data?.data || attendanceTrendsRes.data || [];
      if (Array.isArray(trends) && trends.length > 0) {
        setAttendanceData(trends);
      } else {
        const fallback = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          fallback.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            present: 0,
            absent: 0
          });
        }
        setAttendanceData(fallback);
      }

      // Generate performance trend data - only if we have data
      const perfTrend = academicData.performanceTrend || [];
      if (perfTrend.length === 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        for (let i = 0; i < 6; i++) {
          perfTrend.push({
            month: months[i],
            average: 0,
            passRate: 0
          });
        }
      }
      setPerformanceData(perfTrend);

      // Generate revenue trend data - only if we have data
      const revTrend = financeData.revenueTrend || [];
      if (revTrend.length === 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        for (let i = 0; i < 6; i++) {
          revTrend.push({
            month: months[i],
            collected: 0,
            pending: 0
          });
        }
      }
      setRevenueData(revTrend);

      // Gender distribution
      setGenderData([
        { name: 'Male', value: basicStats.gender?.male || studentsData.male || 0, color: '#667eea' },
        { name: 'Female', value: basicStats.gender?.female || studentsData.female || 0, color: '#EC4899' }
      ]);

      // Class performance - only show if we have data
      const classPerf = (academicData.classAverages || []).slice(0, 6).map(cls => ({
        name: cls.className,
        score: parseFloat(cls.average) || 0
      }));
      setClassPerformance(classPerf);

      // Top students - only show if we have data
      const topPerf = (data.topPerformers || []).slice(0, 5);
      setTopStudents(topPerf);

      // Faults data - only show if we have data
      const faultTypes = faultsByTypeRes.data?.data || [];
      setFaultsByType(faultTypes);

      const faultLevels = faultsByLevelRes.data?.data || [];
      setFaultsByLevel(faultLevels);

      const recentFaultsData = recentFaultsRes.data?.data || [];
      setRecentFaults(recentFaultsData);

      // Staff by type
      setStaffByType([
        { name: 'Teachers', value: staffData.teachers || 0, color: '#667eea' },
        { name: 'Admin', value: staffData.admin || staffData.administrative || 0, color: '#764ba2' },
        { name: 'Support', value: staffData.support || staffData.supportive || 0, color: '#f093fb' }
      ]);

      // Recent activity
      const activityData = activityRes.data?.data || [];
      setRecentActivity(activityData);

      // Sample tasks
      setTasks([
        { id: 1, title: 'Review student registrations', completed: false, dueDate: 'Today' },
        { id: 2, title: 'Approve leave requests', completed: true, dueDate: 'Yesterday' },
        { id: 3, title: 'Update class schedules', completed: false, dueDate: 'Tomorrow' },
        { id: 4, title: 'Generate monthly reports', completed: false, dueDate: 'This week' }
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const fetchTermData = async () => {
      try {
        const res = await api.get('/dashboard/academic-analytics', { params: { term: dashTerm } });
        if (res.data) setAcademicAnalytics(res.data);
      } catch (e) {}
    };
    fetchTermData();
  }, [dashTerm]);

  const loadSampleData = () => {
    setStats({
      students: { total: 485, male: 256, female: 229, trend: 5.2 },
      staff: { total: 42, teachers: 30, trend: 2.1 },
      classes: { total: 12 },
      attendance: { rate: 92, present: 446, absent: 39, trend: 3.5 },
      revenue: { total: 170000, collected: 125000, pending: 45000, trend: 12.3 },
      performance: { average: 76.5, passRate: 82, trend: 4.2 }
    });

    setGenderData([
      { name: 'Male', value: 256, color: '#667eea' },
      { name: 'Female', value: 229, color: '#EC4899' }
    ]);

    setAttendanceData([
      { date: 'Mon', present: 92, absent: 8 },
      { date: 'Tue', present: 89, absent: 11 },
      { date: 'Wed', present: 94, absent: 6 },
      { date: 'Thu', present: 91, absent: 9 },
      { date: 'Fri', present: 93, absent: 7 },
      { date: 'Sat', present: 88, absent: 12 },
      { date: 'Sun', present: 90, absent: 10 }
    ]);

    setPerformanceData([
      { month: 'Jan', average: 74, passRate: 78 },
      { month: 'Feb', average: 76, passRate: 80 },
      { month: 'Mar', average: 75, passRate: 79 },
      { month: 'Apr', average: 78, passRate: 83 },
      { month: 'May', average: 77, passRate: 81 },
      { month: 'Jun', average: 79, passRate: 85 }
    ]);

    setRevenueData([
      { month: 'Jan', collected: 22000, pending: 8000 },
      { month: 'Feb', collected: 25000, pending: 7000 },
      { month: 'Mar', collected: 23000, pending: 9000 },
      { month: 'Apr', collected: 27000, pending: 6000 },
      { month: 'May', collected: 26000, pending: 7500 },
      { month: 'Jun', collected: 28000, pending: 7500 }
    ]);

    setClassPerformance([
      { name: 'Grade 1A', score: 88 },
      { name: 'Grade 1B', score: 85 },
      { name: 'Grade 2A', score: 82 },
      { name: 'Grade 2B', score: 80 },
      { name: 'Grade 3A', score: 78 },
      { name: 'Grade 3B', score: 76 }
    ]);

    setTopStudents([
      { studentName: 'Abebe Kebede', className: 'Grade 2A', averageScore: '95.5' },
      { studentName: 'Sara Mohammed', className: 'Grade 1A', averageScore: '94.2' },
      { studentName: 'Daniel Tesfaye', className: 'Grade 2B', averageScore: '93.8' },
      { studentName: 'Hana Girma', className: 'Grade 1B', averageScore: '92.1' },
      { studentName: 'Yonas Bekele', className: 'Grade 2A', averageScore: '91.5' }
    ]);
  };

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color, onClick }) => (
    <motion.div
      className={styles.statCard}
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className={styles.statIcon} style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
        <Icon size={28} color={color} />
      </div>
      <div className={styles.statContent}>
        <p className={styles.statTitle}>{title}</p>
        <h3 className={styles.statValue}>{value}</h3>
        <div className={styles.statFooter}>
          <span className={styles.statSubtitle}>{subtitle}</span>
          {trend !== undefined && (
            <span className={`${styles.statTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
              {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>{t('dashboard.title') || 'Dashboard Overview'}</h1>
          <p className={styles.subtitle}>
            <Clock size={16} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchAllData}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={GraduationCap}
          title="Total Students"
          value={stats.students.total}
          subtitle={`${stats.students.male} Male • ${stats.students.female} Female`}
          trend={stats.students.trend}
          color="#667eea"
          onClick={() => navigate('/list-student')}
        />
        <StatCard
          icon={UserCheck}
          title="Staff Members"
          value={stats.staff.total}
          subtitle={`${stats.staff.teachers} Teachers`}
          trend={stats.staff.trend}
          color="#764ba2"
          onClick={() => navigate('/list-staff')}
        />
        <StatCard
          icon={Calendar}
          title="Attendance Rate"
          value={`${stats.attendance.rate}%`}
          subtitle={`${stats.attendance.present} Present • ${stats.attendance.absent} Absent`}
          trend={stats.attendance.trend}
          color="#10B981"
          onClick={() => navigate('/student-attendance-system')}
        />
        <StatCard
          icon={TrendingUp}
          title="Avg Performance"
          value={`${stats.performance.average}%`}
          subtitle={`Pass Rate: ${stats.performance.passRate}%`}
          trend={stats.performance.trend}
          color="#F59E0B"
          onClick={() => navigate('/mark-list-view')}
        />
        <StatCard
          icon={BookOpen}
          title="Active Classes"
          value={stats.classes.total}
          subtitle="All classes active"
          color="#EC4899"
          onClick={() => navigate('/schedule')}
        />
        <StatCard
          icon={CheckCircle}
          title="Evaluations"
          value={stats.evaluations.total}
          subtitle={`${stats.evaluations.completed} Completed • ${stats.evaluations.pending} Pending`}
          color="#06B6D4"
          onClick={() => navigate('/evaluation')}
        />
        <StatCard
          icon={MessageSquare}
          title="Posts"
          value={stats.posts.total}
          subtitle={`${stats.posts.thisWeek} This Week`}
          color="#F97316"
          onClick={() => navigate('/post')}
        />
        <StatCard
          icon={AlertCircle}
          title="Student Faults"
          value={stats.faults.total}
          subtitle={`${stats.faults.thisWeek} This Week`}
          color="#EF4444"
          onClick={() => navigate('/faults')}
        />

        <StatCard
          icon={Users}
          title="Guardians"
          value={stats.guardians.total}
          subtitle={stats.guardians.total > 0 ? `${stats.guardians.total} Registered` : '0 Registered'}
          color="#3B82F6"
          onClick={() => navigate('/list-guardian')}
        />
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>

        {/* ============================================================ */}
        {/* ATTENDANCE ANALYTICS: Most Absent, Present, Late, Permission */}
        {/* ============================================================ */}
        <motion.div
          className={styles.chartCard}
          style={{ gridColumn: '1 / -1' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={styles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3><Activity size={20} /> Attendance Leaderboards & Student Analytics</h3>
              {attendanceAnalytics?.summary && (
                <span className={styles.reportSub}>
                  Total Records: <b>{attendanceAnalytics.summary.totalRecords}</b> · Attendance Rate: <b style={{ color: '#10B981' }}>{attendanceAnalytics.summary.attendanceRate}%</b> · Present: {attendanceAnalytics.summary.present} · Absent: {attendanceAnalytics.summary.absent} · Late: {attendanceAnalytics.summary.late} · Permission: {attendanceAnalytics.summary.permission}
                </span>
              )}
            </div>

            {/* Class Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Class:</label>
              <select
                value={dashAttClass}
                onChange={(e) => setDashAttClass(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
              >
                <option value="ALL">All Classes (School-Wide)</option>
                {(attendanceAnalytics?.byClass || []).map(c => (
                  <option key={c.className} value={c.className}>{c.className}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Leaderboard Category Switcher */}
          <div className={styles.pillBtnRow}>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashAttTab === 'absent' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashAttTab('absent')}
            >
              🔴 Most Absent
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashAttTab === 'present' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashAttTab('present')}
            >
              🟢 Most Present
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashAttTab === 'late' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashAttTab('late')}
            >
              🟡 Most Late
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashAttTab === 'permission' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashAttTab('permission')}
            >
              🔵 Permission / Leave
            </button>
          </div>

          {/* Leaderboard Table */}
          {(() => {
            let list = [];
            if (dashAttClass === 'ALL') {
              const all = attendanceAnalytics?.allClasses || {};
              list = dashAttTab === 'absent' ? all.mostAbsent :
                     dashAttTab === 'present' ? all.mostPresent :
                     dashAttTab === 'late' ? all.mostLate : all.mostPermission;
            } else {
              const cls = (attendanceAnalytics?.byClass || []).find(c => c.className === dashAttClass);
              list = cls ? (
                dashAttTab === 'absent' ? cls.mostAbsent :
                dashAttTab === 'present' ? cls.mostPresent :
                dashAttTab === 'late' ? cls.mostLate : cls.mostPermission
              ) : [];
            }
            list = list || [];

            return list.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>
                        {dashAttTab === 'absent' && 'Days Absent'}
                        {dashAttTab === 'present' && 'Days Present'}
                        {dashAttTab === 'late' && 'Times Late'}
                        {dashAttTab === 'permission' && 'Leaves / Permissions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((st, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#64748b' }}>#{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{st.student_name}</td>
                        <td><span className={styles.badge}>{st.class_name}</span></td>
                        <td>
                          <b style={{
                            color: dashAttTab === 'absent' ? '#EF4444' :
                                   dashAttTab === 'present' ? '#10B981' :
                                   dashAttTab === 'late' ? '#F59E0B' : '#3B82F6',
                            fontSize: 14
                          }}>
                            {st.count} {dashAttTab === 'late' ? 'times' : 'days'}
                          </b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage} style={{ margin: '14px 0' }}>
                No attendance records found for this category in the selected class.
              </p>
            );
          })()}
        </motion.div>

        {/* ============================================================ */}
        {/* ACADEMIC MARKS & RANKINGS (Highest/Lowest Marks, Totals)     */}
        {/* ============================================================ */}
        <motion.div
          className={styles.chartCard}
          style={{ gridColumn: '1 / -1' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className={styles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3><Award size={20} /> Academic Performance & Mark Rankings</h3>
              <span className={styles.reportSub}>
                Term {dashTerm} · {academicAnalytics?.totalGradedStudents || 0} Graded Students · Average Score: <b>{academicAnalytics?.averageScore || 0}%</b>
              </span>
            </div>

            {/* Term & Class Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Term:</label>
                <select
                  value={dashTerm}
                  onChange={(e) => setDashTerm(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
                >
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  {isBilal && <option value="3">Term 3</option>}
                  {isBilal && <option value="4">Term 4</option>}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Class:</label>
                <select
                  value={dashMarkClass}
                  onChange={(e) => setDashMarkClass(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
                >
                  <option value="ALL">All Classes (School-Wide)</option>
                  {(academicAnalytics?.byClass || []).map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '12px 0' }}>
            <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>🏆 Highest Total Mark Point</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
                {academicAnalytics?.highestTotalMark ? `${academicAnalytics.highestTotalMark.totalScore} pts` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>
                {academicAnalytics?.highestTotalMark ? `${academicAnalytics.highestTotalMark.studentName} (${academicAnalytics.highestTotalMark.className})` : 'No data'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>🔻 Lowest Total Mark Point</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', margin: '4px 0' }}>
                {academicAnalytics?.lowestTotalMark ? `${academicAnalytics.lowestTotalMark.totalScore} pts` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                {academicAnalytics?.lowestTotalMark ? `${academicAnalytics.lowestTotalMark.studentName} (${academicAnalytics.lowestTotalMark.className})` : 'No data'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>📊 Graded Students</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
                {academicAnalytics?.totalGradedStudents || 0}
              </div>
              <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>Term {dashTerm} Active Graded</div>
            </div>

            <div style={{ padding: '12px 14px', background: '#fefce8', borderRadius: 10, border: '1px solid #fef08a' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a16207', textTransform: 'uppercase' }}>🎯 School Average Score</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#854d0e', margin: '4px 0' }}>
                {academicAnalytics?.averageScore || 0}%
              </div>
              <div style={{ fontSize: 12, color: '#a16207', fontWeight: 600 }}>Across All Subjects</div>
            </div>
          </div>

          {/* High vs Low Rank Toggle */}
          <div className={styles.pillBtnRow}>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashMarkRankTab === 'highest' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashMarkRankTab('highest')}
            >
              🏆 Highest Rank ("Big Mark" Students)
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${dashMarkRankTab === 'lowest' ? styles.pillBtnActive : ''}`}
              onClick={() => setDashMarkRankTab('lowest')}
            >
              🔻 Lowest Rank ("Lowest Mark" Students)
            </button>
          </div>

          {/* Rankings Table */}
          {(() => {
            let list = [];
            if (dashMarkClass === 'ALL') {
              list = dashMarkRankTab === 'highest'
                ? (academicAnalytics?.topStudentsAll || [])
                : (academicAnalytics?.lowestStudentsAll || []);
            } else {
              const cls = (academicAnalytics?.byClass || []).find(c => c.className === dashMarkClass);
              list = cls ? (
                dashMarkRankTab === 'highest' ? (cls.topStudents || []) : (cls.lowestStudents || [])
              ) : [];
            }

            return list.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Total Marks</th>
                      <th>Average</th>
                      <th>Subject Marks Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((st, idx) => (
                      <tr key={idx}>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            fontWeight: 700,
                            fontSize: 12,
                            background: st.rank === 1 ? '#FFD700' : st.rank === 2 ? '#C0C0C0' : st.rank === 3 ? '#CD7F32' : 'rgba(0,0,0,0.06)',
                            color: st.rank <= 3 ? '#000' : 'inherit'
                          }}>
                            {st.rank}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{st.studentName}</td>
                        <td><span className={styles.badge}>{st.className}</span></td>
                        <td>
                          <b style={{ color: dashMarkRankTab === 'highest' ? '#10B981' : '#EF4444', fontSize: 14 }}>
                            {st.totalScore} pts
                          </b>
                        </td>
                        <td><b>{st.avgScore}%</b></td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 500 }}>
                            {(st.subjects || []).map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className={`${styles.subjectPill} ${sub.score >= 90 ? styles.subjectPillHigh : ''}`}
                                title={`${sub.subject}: ${sub.score}`}
                              >
                                <b>{sub.subject}:</b> {sub.score}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage} style={{ margin: '14px 0' }}>
                No graded mark sheets recorded for this term.
              </p>
            );
          })()}
        </motion.div>

        {/* Attendance Trend */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.chartHeader}>
            <h3><Activity size={20} /> Attendance Trend (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#10B981" fillOpacity={1} fill="url(#colorPresent)" />
              <Area type="monotone" dataKey="absent" stroke="#EF4444" fillOpacity={1} fill="url(#colorAbsent)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Performance Trend */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.chartHeader}>
            <h3><TrendingUp size={20} /> Academic Performance Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="average" stroke="#667eea" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="passRate" stroke="#764ba2" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue Trend */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={styles.chartHeader}>
            <h3><Banknote size={20} /> Revenue Overview (Birr)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} Birr`} />
              <Legend />
              <Bar dataKey="collected" fill="#10B981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Payment Report */}
        <motion.div
          className={styles.chartCard}
          onClick={() => navigate('/finance/monthly-payments')}
          whileHover={{ y: -4 }}
          style={{ cursor: 'pointer' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className={styles.chartHeader}>
            <h3><Banknote size={20} /> Monthly Payment Report (Birr)</h3>
            {monthlyPayments.summary && (
              <span className={styles.reportSub}>
                {monthlyPayments.summary.totalClasses || 0} classes •{' '}
                {(monthlyPayments.summary.unlockedTotalPaid || 0).toLocaleString()} Birr collected •{' '}
                {(monthlyPayments.summary.unlockedTotalPending || 0).toLocaleString()} Birr pending
              </span>
            )}
          </div>
          {monthlyPayments.classes.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Students</th>
                    <th>Monthly Fee</th>
                    <th>Collected</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPayments.classes.map((cls, index) => (
                    <tr key={index}>
                      <td><strong>{cls.className}</strong></td>
                      <td>{cls.payingStudents}</td>
                      <td>{Number(cls.monthlyFee).toLocaleString()} Birr</td>
                      <td style={{ color: '#10B981' }}>
                        {Number(cls.unlockedTotalPaid || cls.totalPaid || 0).toLocaleString()} Birr
                      </td>
                      <td style={{ color: '#F59E0B' }}>
                        {Number(cls.unlockedTotalPending || cls.totalPending || 0).toLocaleString()} Birr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyMessage}>
              No monthly payment data available yet. Generate invoices from Payment Settings.
            </p>
          )}
        </motion.div>

        {/* Gender Distribution */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className={styles.chartHeader}>
            <h3><Users size={20} /> Student Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Class Performance */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className={styles.chartHeader}>
            <h3><GraduationCap size={20} /> Class Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" />
              <YAxis dataKey="name" type="category" stroke="#6B7280" width={80} />
              <Tooltip />
              <Bar dataKey="score" fill="#667eea" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Students */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className={styles.chartHeader}>
            <h3><Award size={20} /> Top Performers</h3>
          </div>
          <div className={styles.topStudentsList}>
            {topStudents.map((student, index) => (
              <div key={index} className={styles.topStudentItem}>
                <div className={styles.studentRank} style={{
                  background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#E5E7EB'
                }}>
                  {index + 1}
                </div>
                <div className={styles.studentInfo}>
                  <p className={styles.studentName}>{student.studentName}</p>
                  <p className={styles.studentClass}>{student.className}</p>
                </div>
                <div className={styles.studentScore}>{student.averageScore}%</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Faults by Type */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className={styles.chartHeader}>
            <h3><AlertTriangle size={20} /> Faults by Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={faultsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {faultsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Staff Distribution */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className={styles.chartHeader}>
            <h3><UserCheck size={20} /> Staff Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={staffByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {staffByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Faults Table */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className={styles.chartHeader}>
            <h3><AlertCircle size={20} /> Recent Faults</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Level</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentFaults.slice(0, 5).map((fault, index) => (
                  <tr key={index}>
                    <td>{fault.studentName}</td>
                    <td>{fault.className}</td>
                    <td>{fault.type}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[fault.level?.toLowerCase()]}`}>
                        {fault.level}
                      </span>
                    </td>
                    <td>{fault.daysAgo === 0 ? 'Today' : `${fault.daysAgo}d ago`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Tasks Widget */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <div className={styles.chartHeader}>
            <h3><CheckCircle size={20} /> Tasks</h3>
          </div>
          <div className={styles.tasksList}>
            {tasks.map((task) => (
              <div key={task.id} className={styles.taskItem}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => {
                    setTasks(tasks.map(t => 
                      t.id === task.id ? { ...t, completed: !t.completed } : t
                    ));
                  }}
                  className={styles.taskCheckbox}
                />
                <div className={styles.taskContent}>
                  <p className={task.completed ? styles.taskCompleted : ''}>{task.title}</p>
                  <span className={styles.taskDue}>{task.dueDate}</span>
                </div>
                <button
                  className={styles.taskRemoveBtn}
                  onClick={() => {
                    setTasks(tasks.filter(t => t.id !== task.id));
                  }}
                  title="Remove task"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className={styles.emptyMessage}>No tasks yet</p>
            )}
          </div>
        </motion.div>

        {/* Daily Traffic */}
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <div className={styles.chartHeader}>
            <h3><Activity size={20} /> Daily Traffic</h3>
          </div>
          <div className={styles.trafficWidget}>
            <div className={styles.trafficStat}>
              <p className={styles.trafficLabel}>Visitors</p>
              <h3 className={styles.trafficValue}>0</h3>
              <span className={styles.trafficTrend}>0%</span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={attendanceData.slice(0, 7)}>
                <Bar dataKey="present" fill="#667eea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ModernDashboard;
