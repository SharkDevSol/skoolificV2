import React, { useEffect, useState } from 'react';

const ETH_MONTHS = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];
const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');

const CreditTab = ({ staff = [], ethDate = {}, API_URL = '', http }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [planFor, setPlanFor] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    staffId: '', amount: '', reason: '',
    ethMonth: ethDate.month || 1, ethDay: ethDate.day || 1, ethYear: ethDate.year || 2019,
  });
  const [planForm, setPlanForm] = useState({
    months: 3, startEthMonth: ethDate.month || 1, startEthYear: ethDate.year || 2019,
  });

  const H = () => ({ Authorization: 'Bearer ' + getToken() });

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get(`${API_URL}/hr/credits`, { headers: H() });
      if (res.data.success) setRows(res.data.data || []);
    } catch (e) { console.error('Error loading credits:', e); }
    finally { setLoading(false); }
  };

  const loadPlans = async (creditId) => {
    try {
      const res = await http.get(`${API_URL}/hr/debt-plans`, { headers: H(), params: { creditId } });
      if (res.data.success) setPlans(res.data.data || []);
    } catch (_) { setPlans([]); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const picked = staff.find(s => String(s.id) === String(form.staffId));
    try {
      const res = await http.post(`${API_URL}/hr/credits`, {
        staffId: form.staffId,
        staffName: picked ? picked.fullName : null,
        amount: parseFloat(form.amount) || 0,
        reason: form.reason,
        ethMonth: parseInt(form.ethMonth),
        ethDay: parseInt(form.ethDay),
        ethYear: parseInt(form.ethYear),
      }, { headers: H() });
      if (res.data.success) {
        if (res.data.warning) alert(res.data.warning);
        setShowAdd(false);
        setForm({ ...form, staffId: '', amount: '', reason: '' });
        load();
      } else {
        alert(res.data.error || 'Failed to save credit');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save credit');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this credit? The linked expense will also be removed.')) return;
    try {
      await http.delete(`${API_URL}/hr/credits/${id}`, { headers: H() });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete credit');
    }
  };

  const cancelCredit = async (id) => {
    const reason = window.prompt('Reason for cancelling this credit:');
    if (reason === null) return;
    try {
      await http.post(`${API_URL}/hr/credits/${id}/cancel`, { reason }, { headers: H() });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel credit');
    }
  };

  const openPlan = async (credit) => {
    setPlanFor(credit);
    setPlanForm({ months: 3, startEthMonth: ethDate.month || 1, startEthYear: ethDate.year || 2019 });
    await loadPlans(credit.id);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    try {
      const res = await http.post(`${API_URL}/hr/debt-plans`, {
        creditId: planFor.id,
        months: parseInt(planForm.months),
        startEthMonth: parseInt(planForm.startEthMonth),
        startEthYear: parseInt(planForm.startEthYear),
      }, { headers: H() });
      if (res.data.success) {
        setPlanFor(null);
        load();
        setExpanded(planFor.id);
        await loadPlans(planFor.id);
      } else {
        alert(res.data.error || 'Failed to create plan');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create plan');
    }
  };

  const cancelPlan = async (planId, creditId) => {
    if (!window.confirm('Cancel this repayment plan? The credit stays open with its remaining balance.')) return;
    try {
      await http.post(`${API_URL}/hr/debt-plans/${planId}/cancel`, {}, { headers: H() });
      load();
      if (expanded === creditId) await loadPlans(creditId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel plan');
    }
  };

  const input = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, width: '100%' };
  const label = { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 };
  const remaining = planFor ? Math.max(0, Number(planFor.amount) - Number(planFor.repaid_amount)) : 0;
  const monthlyPreview = planFor ? Math.round((remaining / Math.max(1, parseInt(planForm.months) || 1)) * 100) / 100 : 0;

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Credit</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            Money given to a staff member that comes back. Repaid only through the Debt deduction in payroll.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} style={{ background: '#2196F3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
          + Give Credit
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f7fa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Staff</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Amount</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Repaid</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Remaining</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Plan</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Reason</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: 20, textAlign: 'center', color: '#999' }}>No credits yet.</td></tr>
            ) : rows.map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{r.staff_name || r.staff_id}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{Number(r.amount).toFixed(2)}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{Number(r.repaid_amount || 0).toFixed(2)}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 700 }}>{Number(r.remaining || 0).toFixed(2)}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: r.status === 'REPAID' ? '#e8f5e9' : (r.status === 'CANCELLED' ? '#ffebee' : '#e3f2fd'),
                      color: r.status === 'REPAID' ? '#2e7d32' : (r.status === 'CANCELLED' ? '#c62828' : '#1565c0')
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: 10 }}>{r.plan ? r.plan.months + ' months × ' + Number(r.plan.monthly_amount).toFixed(2) : '—'}</td>
                  <td style={{ padding: 10 }}>{r.reason || '-'}</td>
                  <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                    {Number(r.remaining) > 0 && r.status !== 'CANCELLED' && (
                      r.plan
                        ? <button type="button" onClick={() => cancelPlan(r.plan.id, r.id)} style={{ marginRight: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #f39c12', background: '#fff', color: '#b9770e', cursor: 'pointer' }}>Stop plan</button>
                        : <button type="button" onClick={() => openPlan(r)} style={{ marginRight: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #2196F3', background: '#fff', color: '#1565c0', cursor: 'pointer' }}>Repay</button>
                    )}
                    <button type="button" onClick={() => { setExpanded(expanded === r.id ? null : r.id); loadPlans(r.id); }} style={{ marginRight: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #7f8c8d', background: '#fff', color: '#566573', cursor: 'pointer' }}>Schedule</button>
                    {Number(r.repaid_amount) === 0 && r.status !== 'CANCELLED' && (
                      <>
                        <button type="button" onClick={() => cancelCredit(r.id)} style={{ marginRight: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #e67e22', background: '#fff', color: '#c0392b', cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={() => remove(r.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', cursor: 'pointer' }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr>
                    <td colSpan="8" style={{ padding: 12, background: '#f9fbfd' }}>
                      {plans.length === 0 ? (
                        <span style={{ fontSize: 13, color: '#777' }}>No repayment plan yet.</span>
                      ) : plans.map(pl => (
                        <div key={pl.id} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            Plan #{pl.id} — {pl.months} months × {Number(pl.monthly_amount).toFixed(2)} · status {pl.status}
                          </div>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#eef3f8' }}>
                                <th style={{ textAlign: 'left', padding: 6 }}>Month</th>
                                <th style={{ textAlign: 'right', padding: 6 }}>Amount</th>
                                <th style={{ textAlign: 'left', padding: 6 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(pl.items || []).map(it => (
                                <tr key={it.id}>
                                  <td style={{ padding: 6 }}>{ETH_MONTHS[(it.ethiopian_month || 1) - 1]} {it.ethiopian_year}</td>
                                  <td style={{ padding: 6, textAlign: 'right' }}>{Number(it.amount).toFixed(2)}</td>
                                  <td style={{ padding: 6 }}>{it.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(520px, 92vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Give Credit</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Staff *</label>
              <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} style={input} required>
                <option value="">Select staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.staffType})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Amount (Birr) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={input} required />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Reason</label>
              <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={input} placeholder="Why is this credit given?" />
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
              <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2196F3', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Credit</button>
            </div>
          </form>
        </div>
      )}

      {planFor && (
        <div onClick={() => setPlanFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={savePlan} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(520px, 92vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Repayment Plan</h3>
              <button type="button" onClick={() => setPlanFor(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ background: '#f5f7fa', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              <div><strong>Staff:</strong> {planFor.staff_name || planFor.staff_id}</div>
              <div><strong>Remaining:</strong> {remaining.toFixed(2)} Birr</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={label}>Months *</label>
                <input type="number" min="1" max="60" value={planForm.months} onChange={(e) => setPlanForm({ ...planForm, months: e.target.value })} style={input} required />
              </div>
              <div>
                <label style={label}>Start month</label>
                <select value={planForm.startEthMonth} onChange={(e) => setPlanForm({ ...planForm, startEthMonth: e.target.value })} style={input}>
                  {ETH_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Start year</label>
                <input type="number" value={planForm.startEthYear} onChange={(e) => setPlanForm({ ...planForm, startEthYear: e.target.value })} style={input} />
              </div>
            </div>

            <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              Monthly deduction: <strong>{monthlyPreview.toFixed(2)} Birr</strong> — last month takes the remainder.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setPlanFor(null)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2196F3', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Plan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreditTab;
