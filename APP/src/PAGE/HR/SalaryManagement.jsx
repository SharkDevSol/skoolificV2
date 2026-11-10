import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// FIX: branch-aware axios — every request sends x-branch-code from the
// session (raw axios missed it -> "Branch code is required" errors)
const branchAxios = (() => {
  const inst = axios.create();
  inst.interceptors.request.use((config) => {
    // FIX: use the SAME keys the app uses + derive the branch from the
    // logged-in account when nothing is stored (the main admin login keeps
    // the branch only in branch_<code>_* keys)
    let branch = sessionStorage.getItem('branchCode')
      || localStorage.getItem('rememberedBranchCode') || '';
    if (branch.includes(',')) branch = branch.split(',')[0].trim();
    branch = branch.toUpperCase();
    if (!branch) {
      // derive from the logged-in admin/staff session keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('branch_') && key.endsWith('_isLoggedIn')
            && localStorage.getItem(key) === 'true') {
          branch = key.slice('branch_'.length, -'_isLoggedIn'.length).toUpperCase();
          break;
        }
      }
    }
    if (!branch) {
      // last resort: the adminUser object may carry a branch
      try {
        const au = JSON.parse(localStorage.getItem('adminUser') || '{}');
        if (au.branchCode) branch = String(au.branchCode).toUpperCase();
      } catch (_) {}
    }
    if (branch) config.headers['x-branch-code'] = branch;
    return config;
  });
  return inst;
})();
// class names must be sane (filters DB garbage like '<' from old rows)
const saneClass = (c) => typeof c === 'string' && c.trim().length >= 1 && /^[A-Za-z0-9 _()-]+$/.test(c.trim());

import { Plus, RefreshCw } from 'lucide-react';
import styles from './SalaryManagement.module.css';
import AddSalaryCompleteModal from './components/AddSalaryCompleteModal';
import Card from '../../COMPONENTS/Card/Card';
import Button from '../../COMPONENTS/Button/Button';
import EditSalaryModal from './components/EditSalaryModal';
import TipsTab from './components/TipsTab';
import CreditTab from './components/CreditTab';
import { getCurrentEthiopianMonth } from '../../utils/ethiopianCalendar';
import { dedupeStaff } from '../../utils/staffList';

const API_URL =
  (typeof window !== 'undefined' && window.location.origin
    ? window.location.origin + '/api'
    : (import.meta.env.VITE_API_URL || '/api'));

const ETH_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const SalaryManagement = () => {
  const { t } = useTranslation();
  const [allStaff, setAllStaff] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [dedForm, setDedForm] = useState({
    staffId: '', staffName: '', type: 'Tax', amount: '',
    month: String(getCurrentEthiopianMonth().month || 1),
    year: String(getCurrentEthiopianMonth().year || 2019)
  });
  const [allowForm, setAllowForm] = useState({
    staffId: '', staffName: '', type: 'Housing', amount: '',
    month: String(getCurrentEthiopianMonth().month || 1),
    year: String(getCurrentEthiopianMonth().year || 2019)
  });
  const [activeTab, setActiveTab] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
  
  // Modals
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [currentEthiopianDate, setCurrentEthiopianDate] = useState(() => {
    return getCurrentEthiopianMonth();
  });

  useEffect(() => {
    fetchAllStaff();
    fetchSalaries();
    fetchDeductions();
    fetchAllowances();
    
    // Update Ethiopian date every minute
    const interval = setInterval(() => {
      setCurrentEthiopianDate(getCurrentEthiopianMonth());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const types = ['Teachers', 'Supportive Staff', 'Administrative Staff', 'Finance'];
      let allStaffMembers = [];
      
      for (const staffType of types) {
        try {
          const classesResponse = await branchAxios.get(
            `${API_URL}/staff/classes?staffType=${encodeURIComponent(staffType)}`
          );
          
          for (const className of (classesResponse.data || []).filter(saneClass)) {
            try {
              const dataResponse = await branchAxios.get(
                `${API_URL}/staff/data/${staffType}/${className}?includeInactive=true`
              );
              const staffData = dataResponse.data.data || [];
              
              const transformedStaff = staffData.map(staff => ({
                id: staff.global_staff_id || staff.id,
                employeeNumber: staff.global_staff_id || staff.id,
                firstName: (staff.full_name || staff.name || '').split(' ')[0] || '',
                lastName: (staff.full_name || staff.name || '').split(' ').slice(1).join(' ') || '',
                fullName: staff.full_name || staff.name || 'Unknown',
                email: staff.email || '',
                phone: staff.phone || '',
                staffType: staffType,
                role: staff.role || staff.position || staffType,
                isActive: staff.is_active !== false,
                profilePhotoUrl: staff.image_staff || null
              }));
              
              allStaffMembers = [...allStaffMembers, ...transformedStaff];
            } catch (err) {
              console.log(`Error fetching ${className}:`, err.message);
            }
          }
        } catch (err) {
          console.log(`No data for: ${staffType}`);
        }
      }
      
      allStaffMembers = dedupeStaff(allStaffMembers).sort((a, b) =>
        String(a.fullName || '').localeCompare(String(b.fullName || ''))
      );
      setAllStaff(allStaffMembers);
    } catch (err) {
      setError('Failed to fetch staff members');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaries = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await branchAxios.get(`${API_URL}/hr/salary/all-salaries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSalaries(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching salaries:', err);
    }
  };

  const fetchDeductions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await branchAxios.get(`${API_URL}/hr/salary/deductions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setDeductions(response.data.data || []);
    } catch (err) {
      console.error('Error fetching deductions:', err);
    }
  };

  const fetchAllowances = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await branchAxios.get(`${API_URL}/hr/salary/allowances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setAllowances(response.data.data || []);
    } catch (err) {
      console.error('Error fetching allowances:', err);
    }
  };

  const addDeduction = async () => {
    if (!dedForm.staffId || !dedForm.amount) {
      alert('Select a staff member and enter an amount');
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const staff = allStaff.find((x) => String(x.id) === String(dedForm.staffId));
    try {
      await branchAxios.post(`${API_URL}/hr/salary/deductions`, {
        staffId: dedForm.staffId,
        staffName: staff ? staff.fullName : '',
        deductionType: dedForm.type,
        amount: Number(dedForm.amount),
        ethiopianMonth: Number(dedForm.month),
        ethiopianYear: Number(dedForm.year),
        isRecurring: false
      }, { headers: { Authorization: `Bearer ${token}` } });
      setDedForm((f) => ({ ...f, amount: '' }));
      fetchDeductions();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add deduction');
    }
  };

  const addAllowance = async () => {
    if (!allowForm.staffId || !allowForm.amount) {
      alert('Select a staff member and enter an amount');
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const staff = allStaff.find((x) => String(x.id) === String(allowForm.staffId));
    try {
      await branchAxios.post(`${API_URL}/hr/salary/allowances`, {
        staffId: allowForm.staffId,
        staffName: staff ? staff.fullName : '',
        allowanceType: allowForm.type,
        amount: Number(allowForm.amount),
        ethiopianMonth: Number(allowForm.month),
        ethiopianYear: Number(allowForm.year),
        isRecurring: false
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAllowForm((f) => ({ ...f, amount: '' }));
      fetchAllowances();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add allowance');
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!window.confirm('Delete this deduction?')) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    try {
      await branchAxios.delete(`${API_URL}/hr/salary/deductions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeductions();
    } catch (err) {
      alert('Failed to delete deduction');
    }
  };

  const handleDeleteAllowance = async (id) => {
    if (!window.confirm('Delete this allowance?')) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    try {
      await branchAxios.delete(`${API_URL}/hr/salary/allowances/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllowances();
    } catch (err) {
      alert('Failed to delete allowance');
    }
  };

  const handleToggleStop = async (salary) => {
    if (!salary) return;
    const action = salary.isStopped ? 'reactivate' : 'stop';
    const msg = action === 'stop'
      ? 'Stop this staff? They will not appear in future payroll (history is kept).'
      : 'Reactivate this staff? They will appear in payroll again.';
    if (!window.confirm(msg)) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await branchAxios.post(`${API_URL}/hr/salary/${salary.id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSalaries();
    } catch (err) {
      console.error('Error toggling staff status:', err);
      alert('Failed to update staff status');
    }
  };

  // Check if staff has salary
  const staffHasSalary = (staffId) => {
    // Convert both to strings for comparison
    const staffIdStr = String(staffId);
    const hasSalary = salaries.some(salary => String(salary.staffId) === staffIdStr);
    console.log(`🔍 Checking salary for staff ${staffIdStr}:`, hasSalary, 'Salaries:', salaries.map(s => String(s.staffId)));
    return hasSalary;
  };

  // Get salary for staff
  const getStaffSalary = (staffId) => {
    const staffIdStr = String(staffId);
    return salaries.find(salary => String(salary.staffId) === staffIdStr);
  };

  // Handle add salary for specific staff
  const handleAddSalaryForStaff = (staff) => {
    // Check if staff already has a salary
    const existingSalary = salaries.find(s => s.staffId === staff.id);
    
    console.log('🔍 handleAddSalaryForStaff called');
    console.log('🔍 staff:', staff);
    console.log('🔍 staff.id:', staff.id);
    console.log('🔍 all salaries:', salaries);
    console.log('🔍 existingSalary found:', existingSalary);
    
    setSelectedStaffForSalary({
      ...staff,
      existingSalary: existingSalary || null
    });
    setShowAddSalaryModal(true);
  };

  // Handle edit salary for specific staff
  const handleEditSalaryForStaff = (staff) => {
    console.log('✏️ handleEditSalaryForStaff called');
    console.log('✏️ staff:', staff);
    console.log('✏️ staff.id:', staff.id, 'type:', typeof staff.id);
    console.log('✏️ all salaries:', salaries);
    
    // Try to find salary with different comparison methods
    const existingSalary1 = salaries.find(s => s.staffId === staff.id);
    const existingSalary2 = salaries.find(s => String(s.staffId) === String(staff.id));
    const existingSalary3 = salaries.find(s => parseInt(s.staffId) === parseInt(staff.id));
    
    console.log('✏️ existingSalary (===):', existingSalary1);
    console.log('✏️ existingSalary (String):', existingSalary2);
    console.log('✏️ existingSalary (parseInt):', existingSalary3);
    
    const existingSalary = existingSalary1 || existingSalary2 || existingSalary3;
    
    if (!existingSalary) {
      console.error('❌ No salary found!');
      console.error('❌ Looking for staff.id:', staff.id);
      console.error('❌ Available staffIds in salaries:', salaries.map(s => ({id: s.staffId, type: typeof s.staffId})));
      alert('No salary found for this staff member');
      return;
    }
    
    console.log('✅ Found salary:', existingSalary);
    
    setSelectedStaffForSalary({
      ...staff,
      existingSalary: existingSalary
    });
    setShowEditSalaryModal(true);
  };


  const tabs = [
    { id: 'staff', label: t('hr.salary.tabs.staff', 'All Staff') },
    { id: 'deductions', label: 'Deductions' },
    { id: 'allowances', label: 'Allowances' },
    { id: 'tips', label: 'Tips' },
    { id: 'credit', label: 'Credit' }
  ];

  return (
    <main className={styles.container} aria-label={t('hr.salary.title', 'Salary Management')}>
      <header className={styles.header}>
        <div>
          <h1>{t('hr.salary.title', 'Salary Management')}</h1>
          <p>{t('hr.salary.subtitle', 'Manage staff salaries and payroll')}</p>
          <div className={styles.dateBadge} role="status">
            {t('hr.salary.currentDate', 'Current Ethiopian Date')}: {currentEthiopianDate.day} {currentEthiopianDate.monthName} {currentEthiopianDate.year}
          </div>
        </div>
      </header>

      <nav className={styles.tabNavigation} aria-label={t('hr.salary.tabsLabel', 'Salary sections')}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'staff' && (
        <div className={styles.actionBar}>
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={() => {
              fetchAllStaff();
              fetchSalaries();
            }}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading} role="status">{t('common.loading', 'Loading...')}</div>
      ) : error ? (
        <div className={styles.error} role="alert">{error}</div>
      ) : (
        <>
          {/* All Staff Tab */}
          {activeTab === 'staff' && (
            <Card className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.staffTable}>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Staff Name</th>
                    <th>Staff Type</th>
                    <th>Role</th>
                    <th>Account Number</th>
                    <th>Salary Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className={styles.emptyCell}>
                        {t('hr.salary.noStaff', 'No staff members found.')}
                      </td>
                    </tr>
                  ) : (
                    allStaff.map(staff => {
                      const hasSalary = staffHasSalary(staff.id);
                      const salary = getStaffSalary(staff.id);
                      
                      return (
                        <tr key={staff.id}>
                          <td>
                            {staff.profilePhotoUrl ? (
                              <img 
                                src={`${API_URL}/uploads/${staff.profilePhotoUrl}`}
                                alt={staff.fullName}
                                className={styles.staffPhoto}
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            ) : (
                              <div className={styles.staffPhotoPlaceholder} aria-hidden="true">
                                {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{staff.fullName}</strong>
                            {!staff.isActive && (
                              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#b21e23' }}>
                                INACTIVE
                              </span>
                            )}
                            <br />
                            <small className={styles.subText}>ID: {staff.employeeNumber}</small>
                          </td>
                          <td>
                            <span className={styles.staffTypeBadge}>
                              {staff.staffType}
                            </span>
                          </td>
                          <td>{staff.role}</td>
                          <td>
                            {hasSalary && salary?.accountName ? (
                              <span style={{ fontWeight: '500', color: '#2c3e50' }}>
                                {salary.accountName}
                              </span>
                            ) : (
                              <span style={{ color: '#95a5a6' }}>-</span>
                            )}
                          </td>
                          <td>
                            {hasSalary ? (
                              <div className={styles.salaryInfo}>
                                <span className={styles.salaryBadgeHas}>{t('hr.salary.hasSalary', 'Salary Added')}</span>
                                <div className={styles.salaryDetails}>
                                  <small>Base: {parseFloat(salary.baseSalary).toFixed(2)} Birr</small>
                                  <small>Net: {parseFloat(salary.netSalary).toFixed(2)} Birr</small>
                                  {salary.bankName ? <small>Bank: {salary.bankName}</small> : null}
                                  {salary.taxEnabled ? <small>Tax: {salary.taxType === 'PERCENT' ? salary.taxValue + '%' : parseFloat(salary.taxValue || 0).toFixed(2) + ' Birr'}</small> : null}
                                  <small>Months: {Array.isArray(salary.paidMonths) && salary.paidMonths.length ? salary.paidMonths.join(', ') : 'All'}</small>
                                  {salary.isStopped ? <small style={{ color: '#c0392b', fontWeight: 700 }}>STOPPED</small> : null}
                                </div>
                              </div>
                            ) : (
                              <span className={styles.salaryBadgeNo}>{t('hr.salary.noSalary', 'No Salary')}</span>
                            )}
                          </td>
                          <td>
                            {!hasSalary ? (
                              <Button size="sm" variant="primary" onClick={() => handleAddSalaryForStaff(staff)}>
                                {t('hr.salary.addSalary', 'Add Salary')}
                              </Button>
                            ) : (
                              <div className={styles.actionButtonsGroup}>
                                <Button size="sm" variant="secondary" onClick={() => handleEditSalaryForStaff(staff)}>
                                  {t('common.edit', 'Edit')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={salary?.isStopped ? 'success' : 'danger'}
                                  onClick={() => handleToggleStop(salary)}
                                >
                                  {salary?.isStopped ? 'Reactivate' : 'Stop'}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </Card>
          )}

          {activeTab === 'tips' && (
            <TipsTab staff={allStaff} ethDate={currentEthiopianDate} API_URL={API_URL} http={branchAxios} />
          )}

          {activeTab === 'credit' && (
            <CreditTab staff={allStaff} ethDate={currentEthiopianDate} API_URL={API_URL} http={branchAxios} />
          )}

          {/* Deductions Tab */}
          {activeTab === 'deductions' && (
            <Card className={styles.tableCard}>
            <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Add Deduction</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Staff</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={dedForm.staffId} onChange={(e) => {
                    const st = allStaff.find((x) => String(x.id) === e.target.value);
                    setDedForm({ ...dedForm, staffId: e.target.value, staffName: st ? st.fullName : '' });
                  }}>
                    <option value="">Select staff...</option>
                    {allStaff.map((st) => <option key={st.id} value={st.id}>{st.fullName}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 170px', minWidth: 150 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Type</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={dedForm.type} onChange={(e) => setDedForm({ ...dedForm, type: e.target.value })}>
                    {['Tax', 'Pension', 'Credit', 'Attendance', 'Other'].map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Amount (Birr)</label>
                  <input type="number" min="0" step="0.01" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={dedForm.amount} onChange={(e) => setDedForm({ ...dedForm, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Month</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={dedForm.month} onChange={(e) => setDedForm({ ...dedForm, month: e.target.value })}>
                    {ETH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 100px', minWidth: 90 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Year</label>
                  <input type="number" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={dedForm.year} onChange={(e) => setDedForm({ ...dedForm, year: e.target.value })} />
                </div>
                <button type="button" onClick={addDeduction} style={{ padding: '11px 18px', borderRadius: 8, border: 'none', background: 'var(--color-primary, #6f56ff)', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Deduction</button>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.staffTable}>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Deduction Type</th>
                    <th>Amount</th>
                    <th>Ethiopian Month</th>
                    <th>Period</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No deductions added yet. Click "Add Deduction" to get started.
                      </td>
                    </tr>
                  ) : (
                    deductions.map(deduction => (
                      <tr key={deduction.id}>
                        <td>{deduction.staff_name}</td>
                        <td>
                          <span className={styles.deductionBadge}>
                            {(deduction.deduction_type || 'other').charAt(0).toUpperCase() + (deduction.deduction_type || 'other').slice(1)}
                          </span>
                        </td>
                        <td>{parseFloat(deduction.amount).toFixed(2)} Birr</td>
                        <td>
                          <strong>{ETH_MONTHS[Number(deduction.ethiopian_month) - 1] || deduction.ethiopian_month} {deduction.ethiopian_year}</strong>
                        </td>
                        <td>
                          <small>{deduction.start_date || '-'} to {deduction.end_date || '-'}</small>
                        </td>
                        <td>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteDeduction(deduction.id)}>
                            {t('common.delete', 'Delete')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </Card>
          )}

          {/* Allowances Tab */}
          {activeTab === 'allowances' && (
            <Card className={styles.tableCard}>
            <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Add Allowance</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Staff</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={allowForm.staffId} onChange={(e) => {
                    const st = allStaff.find((x) => String(x.id) === e.target.value);
                    setAllowForm({ ...allowForm, staffId: e.target.value, staffName: st ? st.fullName : '' });
                  }}>
                    <option value="">Select staff...</option>
                    {allStaff.map((st) => <option key={st.id} value={st.id}>{st.fullName}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 170px', minWidth: 150 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Type</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={allowForm.type} onChange={(e) => setAllowForm({ ...allowForm, type: e.target.value })}>
                    {['Housing', 'Transport', 'Food', 'Medical', 'Education', 'Bonus', 'Overtime', 'Other'].map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Amount (Birr)</label>
                  <input type="number" min="0" step="0.01" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={allowForm.amount} onChange={(e) => setAllowForm({ ...allowForm, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Month</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={allowForm.month} onChange={(e) => setAllowForm({ ...allowForm, month: e.target.value })}>
                    {ETH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: '0 1 100px', minWidth: 90 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#111827' }}>Year</label>
                  <input type="number" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827' }} value={allowForm.year} onChange={(e) => setAllowForm({ ...allowForm, year: e.target.value })} />
                </div>
                <button type="button" onClick={addAllowance} style={{ padding: '11px 18px', borderRadius: 8, border: 'none', background: 'var(--color-primary, #6f56ff)', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Allowance</button>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.staffTable}>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Allowance Name</th>
                    <th>Amount</th>
                    <th>Ethiopian Month</th>
                    <th>Period</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allowances.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No allowances added yet. Click "Add Allowance" to get started.
                      </td>
                    </tr>
                  ) : (
                    allowances.map(allowance => (
                      <tr key={allowance.id}>
                        <td>{allowance.staff_name}</td>
                        <td>
                          <span className={styles.allowanceBadge}>
                            {allowance.allowance_name || allowance.allowance_type || 'Allowance'}
                          </span>
                        </td>
                        <td>{parseFloat(allowance.amount).toFixed(2)} Birr</td>
                        <td>
                          <strong>{ETH_MONTHS[Number(allowance.ethiopian_month) - 1] || allowance.ethiopian_month} {allowance.ethiopian_year}</strong>
                        </td>
                        <td>
                          <small>{allowance.start_date || '-'} to {allowance.end_date || '-'}</small>
                        </td>
                        <td>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteAllowance(allowance.id)}>
                            {t('common.delete', 'Delete')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </Card>
          )}

          {/* Retentions Tab */}
          {activeTab === 'retentions' && (
            <Card className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.staffTable}>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Retention Type</th>
                    <th>Amount</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {retentions.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                        No retention benefits added yet. Click "Add Retention Benefit" to get started.
                      </td>
                    </tr>
                  ) : (
                    retentions.map(retention => (
                      <tr key={retention.id}>
                        <td>{retention.staff_name}</td>
                        <td>
                          <span className={styles.retentionBadge}>
                            {retention.retention_type.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </td>
                        <td>${parseFloat(retention.amount).toFixed(2)}</td>
                        <td>{new Date(retention.created_at).toLocaleDateString()}</td>
                        <td>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteRetention(retention.id)}>
                            {t('common.delete', 'Delete')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      {showAddSalaryModal && (
        <AddSalaryCompleteModal
          preSelectedStaff={selectedStaffForSalary}
          onClose={() => {
            setShowAddSalaryModal(false);
            setSelectedStaffForSalary(null);
            fetchSalaries().then(() => {
              fetchAllStaff();
            });
          }}
        />
      )}

      {showEditSalaryModal && selectedStaffForSalary && (
        <EditSalaryModal
          staff={selectedStaffForSalary}
          existingSalary={selectedStaffForSalary.existingSalary}
          onClose={() => {
            setShowEditSalaryModal(false);
            setSelectedStaffForSalary(null);
          }}
          onSuccess={() => {
            fetchSalaries().then(() => {
              fetchAllStaff();
            });
          }}
        />
      )}
    </main>
  );
};

export default SalaryManagement;
