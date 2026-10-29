import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = (typeof window !== 'undefined' && window.location.origin ? window.location.origin + '/api' : (import.meta.env.VITE_API_URL || 'https://iqrab3.skoolific.com/api'));

const ETH_MONTHS = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

// Add Salary Modal Component - Updated with bank / optional tax / paid months
const AddSalaryCompleteModal = ({ onClose, preSelectedStaff }) => {
  const isEditMode = preSelectedStaff?.existingSalary ? true : false;
  const existingSalary = preSelectedStaff?.existingSalary;

  const [staffTypes, setStaffTypes] = useState([]);
  const [staffType, setStaffType] = useState(preSelectedStaff?.staffType || '');
  const [staffList, setStaffList] = useState(preSelectedStaff ? [preSelectedStaff] : []);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    staffId: preSelectedStaff?.id || '',
    staffName: preSelectedStaff?.fullName || '',
    accountId: existingSalary?.accountId || '',
    accountName: existingSalary?.accountName || '',
    baseSalary: existingSalary?.baseSalary || '',
    bankName: existingSalary?.bankName || '',
    bankAccountNumber: existingSalary?.bankAccountNumber || '',
    taxEnabled: existingSalary?.taxEnabled === true,
    taxType: existingSalary?.taxType || 'FIXED',
    taxValue: existingSalary?.taxValue != null ? existingSalary.taxValue : '',
    paidMonths: Array.isArray(existingSalary?.paidMonths) ? existingSalary.paidMonths : []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchStaffTypes();
  }, []);

  useEffect(() => {
    if (staffType) {
      fetchStaffByType(staffType);
    } else {
      setStaffList([]);
      setFormData((prev) => ({ ...prev, staffId: '', staffName: '', accountId: '', accountName: '' }));
    }
  }, [staffType]);

  const fetchStaffTypes = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/hr/salary/staff-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setStaffTypes(response.data.data);
    } catch (err) {
      console.error('Error fetching staff types:', err);
      setStaffTypes([
        { type: 'TEACHER', label: 'Teacher' },
        { type: 'SUPPORTIVE', label: 'Supportive' },
        { type: 'ADMINISTRATIVE', label: 'Administrative' }
      ]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/finance/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setAccounts(response.data.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchStaffByType = async (type) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/hr/salary/staff?staffType=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setStaffList(response.data.data);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to fetch staff list');
    }
  };

  const handleStaffChange = (e) => {
    const selectedStaffId = e.target.value;
    const selectedStaff = staffList.find(s => String(s.id) === String(selectedStaffId));
    let fullName = '';
    if (selectedStaff) {
      const firstName = selectedStaff.firstName || '';
      const lastName = selectedStaff.lastName || '';
      fullName = `${firstName} ${lastName}`.trim();
      if (!fullName && selectedStaff.email) fullName = selectedStaff.email.split('@')[0];
    }
    setFormData({ ...formData, staffId: selectedStaffId, staffName: fullName });
  };

  const toggleMonth = (month) => {
    setFormData((prev) => {
      const has = prev.paidMonths.includes(month);
      return { ...prev, paidMonths: has ? prev.paidMonths.filter(m => m !== month) : [...prev.paidMonths, month].sort((a, b) => a - b) };
    });
  };

  const baseNum = parseFloat(formData.baseSalary) || 0;
  const taxVal = parseFloat(formData.taxValue) || 0;
  const taxCalc = !formData.taxEnabled ? 0 : (formData.taxType === 'PERCENT' ? (baseNum * taxVal) / 100 : taxVal);
  const taxShown = Math.min(Math.max(0, taxCalc), baseNum);
  const netShown = baseNum - taxShown;
  const allMonths = formData.paidMonths.length === 0 || formData.paidMonths.length >= 13;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const accountInput = formData.accountName.trim();
      if (!accountInput) {
        setError('Please enter an account number');
        setLoading(false);
        return;
      }

      const payload = {
        staffId: formData.staffId,
        staffName: formData.staffName,
        staffType: isEditMode ? (existingSalary?.staffType || staffType) : staffType,
        accountName: accountInput,
        baseSalary: baseNum,
        effectiveFrom: new Date().toISOString().split('T')[0],
        bankName: formData.bankName.trim(),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        taxEnabled: formData.taxEnabled,
        taxType: formData.taxType,
        taxValue: taxVal,
        paidMonths: allMonths ? null : formData.paidMonths
      };

      let response;
      if (isEditMode && existingSalary?.id) {
        response = await axios.put(`${API_URL}/hr/salary/update-complete/${existingSalary.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_URL}/hr/salary/add-complete`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        alert(isEditMode ? 'Salary updated successfully!' : 'Salary added successfully!');
        onClose();
      }
    } catch (err) {
      console.error('Error saving salary:', err);
      setError(err.response?.data?.error?.message || 'Failed to add salary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? `Edit Salary - ${preSelectedStaff.fullName}` : (preSelectedStaff ? `Add Salary - ${preSelectedStaff.fullName}` : 'Add Salary')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {!preSelectedStaff && (
            <>
              <div className="form-group">
                <label>Staff Type *</label>
                <select value={staffType} onChange={(e) => setStaffType(e.target.value)} required>
                  <option value="">Select Staff Type</option>
                  {staffTypes.map(type => (
                    <option key={type.type} value={type.type}>{type.label}</option>
                  ))}
                </select>
              </div>

              {staffType && (
                <div className="form-group">
                  <label>Staff Name *</label>
                  <select value={formData.staffId} onChange={handleStaffChange} required>
                    <option value="">Select Staff Member</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} ({staff.employeeNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Account Number *</label>
            <input
              type="text"
              list="accounts-list"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="Type or select account number (e.g., 5100 - Salary Expense)"
              required
            />
            <datalist id="accounts-list">
              {accounts.map(account => (
                <option key={account.id} value={`${account.code} - ${account.name}`} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Base Salary Amount *</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.baseSalary}
              onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
              placeholder="Enter base salary"
              required
            />
          </div>

          <div className="form-group">
            <label>Bank Name</label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g., Commercial Bank of Ethiopia"
            />
          </div>

          <div className="form-group">
            <label>Bank Account Number</label>
            <input
              type="text"
              value={formData.bankAccountNumber}
              onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              placeholder="Staff bank account number"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
              />
              Apply tax (optional)
            </label>
          </div>

          {formData.taxEnabled && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tax Type</label>
                <select
                  value={formData.taxType}
                  onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{formData.taxType === 'PERCENT' ? 'Tax Percent (%)' : 'Tax Amount (Birr)'}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={formData.taxValue}
                  onChange={(e) => setFormData({ ...formData, taxValue: e.target.value })}
                  placeholder={formData.taxType === 'PERCENT' ? 'e.g., 15' : 'e.g., 500'}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Paid Months (leave empty = every month)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ETH_MONTHS.map((name, idx) => {
                const month = idx + 1;
                const active = allMonths || formData.paidMonths.includes(month);
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => toggleMonth(month)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: '1px solid ' + (active ? '#1976d2' : '#ccc'),
                      background: active ? '#1976d2' : '#fff',
                      color: active ? '#fff' : '#333',
                      fontSize: 12
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <small style={{ color: '#666' }}>
              {allMonths ? 'All 13 months' : `Selected: ${formData.paidMonths.map(m => ETH_MONTHS[m - 1]).join(', ')}`}
            </small>
          </div>

          <div style={{ background: '#f5f7fa', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base</span><strong>{baseNum.toFixed(2)} Birr</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><strong>-{taxShown.toFixed(2)} Birr</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Net (before allowances/deductions)</span><strong>{netShown.toFixed(2)} Birr</strong></div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Salary' : 'Add Salary')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSalaryCompleteModal;
