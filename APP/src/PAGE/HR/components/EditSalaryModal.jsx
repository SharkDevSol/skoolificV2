import React, { useState } from 'react';
import axios from 'axios';

const API_URL = (typeof window !== 'undefined' && window.location.origin ? window.location.origin + '/api' : (import.meta.env.VITE_API_URL || 'https://iqrab3.skoolific.com/api'));

const ETH_MONTHS = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

const EditSalaryModal = ({ onClose, staff, existingSalary, onSuccess }) => {
  const [formData, setFormData] = useState({
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

      const payload = {
        staffId: staff.id,
        staffName: staff.fullName,
        staffType: existingSalary?.staffType || staff.staffType,
        accountName: formData.accountName,
        baseSalary: baseNum,
        effectiveFrom: existingSalary?.effectiveFrom || new Date().toISOString().split('T')[0],
        bankName: formData.bankName.trim(),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        taxEnabled: formData.taxEnabled,
        taxType: formData.taxType,
        taxValue: taxVal,
        paidMonths: allMonths ? null : formData.paidMonths
      };

      const response = await axios.put(
        `${API_URL}/hr/salary/update-complete/${existingSalary.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Salary updated successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Error updating salary:', err);
      setError(err.response?.data?.error?.message || 'Failed to update salary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Salary - {staff.fullName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Number *</label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="Enter account number"
              required
            />
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
                <select value={formData.taxType} onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}>
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
              {loading ? 'Updating...' : 'Update Salary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSalaryModal;
