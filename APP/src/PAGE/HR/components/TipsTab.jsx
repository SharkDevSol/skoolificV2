import React, { useEffect, useState } from 'react';

const ETH_MONTHS = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');

const TipsTab = ({ staff = [], ethDate = {}, API_URL = '', http }) => {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState(['Gift', 'Bonus', 'Help', 'Transport', 'Other']);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(ethDate.month || 1);
  const [filterYear, setFilterYear] = useState(ethDate.year || 2019);
  const [form, setForm] = useState({
    staffId: '', tipType: 'Gift', amount: '', reason: '',
    ethMonth: ethDate.month || 1, ethDay: ethDate.day || 1, ethYear: ethDate.year || 2019,
  });

  const H = () => ({ Authorization: 'Bearer ' + getToken() });

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get(`${API_URL}/hr/tips`, { headers: H(), params: { ethMonth: filterMonth, ethYear: filterYear } });
      if (res.data.success) {
        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) { console.error('Error loading tips:', e); }
    finally { setLoading(false); }
  };

  const loadTypes = async () => {
    try {
      const res = await http.get(`${API_URL}/hr/tips/types`, { headers: H() });
      if (res.data.success && Array.isArray(res.data.data)) setTypes(res.data.data);
    } catch (_) {}
  };

  useEffect(() => { load(); loadTypes(); }, [filterMonth, filterYear]);

  const save = async (e) => {
    e.preventDefault();
    const picked = staff.find(s => String(s.id) === String(form.staffId));
    try {
      const res = await http.post(`${API_URL}/hr/tips`, {
        staffId: form.staffId || null,
        staffName: picked ? picked.fullName : null,
        tipType: form.tipType,
        amount: parseFloat(form.amount) || 0,
        reason: form.reason,
        ethMonth: parseInt(form.ethMonth),
        ethDay: parseInt(form.ethDay),
        ethYear: parseInt(form.ethYear),
      }, { headers: H() });
      if (res.data.success) {
        setShowModal(false);
        setForm({ ...form, amount: '', reason: '', staffId: '' });
        load();
      } else {
        alert(res.data.error || 'Failed to save tip');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save tip');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this tip? The linked expense will also be removed.')) return;
    try {
      await http.delete(`${API_URL}/hr/tips/${id}`, { headers: H() });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete tip');
    }
  };

  const input = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, width: '100%' };
  const label = { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Tips</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            Money the school pays out (gift, lunch, transport...). Recorded as an expense — never in payroll.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} style={{ ...input, width: 'auto' }}>
            {ETH_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value) || 2019)} style={{ ...input, width: 90 }} />
          <button type="button" onClick={() => setShowModal(true)} style={{ background: '#2196F3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
            + Add Tip
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12, fontSize: 14 }}>
        Total for {ETH_MONTHS[filterMonth - 1]} {filterYear}: <strong>{total.toFixed(2)} Birr</strong>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f7fa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Date</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Staff</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Amount</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Reason</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Expense</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center', color: '#999' }}>No tips for this month.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{r.ethiopian_day ? r.ethiopian_day + ' ' + ETH_MONTHS[(r.ethiopian_month || 1) - 1] : '-'}</td>
                <td style={{ padding: 10, fontWeight: 600 }}>{r.tip_type}</td>
                <td style={{ padding: 10 }}>{r.staff_name || 'General'}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{Number(r.amount).toFixed(2)}</td>
                <td style={{ padding: 10 }}>{r.reason || '-'}</td>
                <td style={{ padding: 10 }}>{r.expense_id ? '#' + r.expense_id : '-'}</td>
                <td style={{ padding: 10 }}>
                  <button type="button" onClick={() => remove(r.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(520px, 92vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Add Tip</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Type</label>
              <select value={form.tipType} onChange={(e) => setForm({ ...form, tipType: e.target.value })} style={input}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Staff (optional — leave empty for a general expense)</label>
              <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} style={input}>
                <option value="">— General (no staff) —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.staffType})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Amount (Birr) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={input} required />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Reason</label>
              <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={input} placeholder="Optional" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={label}>Month</label>
                <select value={form.ethMonth} onChange={(e) => setForm({ ...form, ethMonth: e.target.value })} style={input}>
                  {ETH_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Day</label>
                <input type="number" min="1" max="30" value={form.ethDay} onChange={(e) => setForm({ ...form, ethDay: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Year</label>
                <input type="number" value={form.ethYear} onChange={(e) => setForm({ ...form, ethYear: e.target.value })} style={input} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2196F3', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Tip</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TipsTab;
