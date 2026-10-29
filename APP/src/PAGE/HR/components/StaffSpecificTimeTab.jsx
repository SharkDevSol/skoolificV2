import React, { useEffect, useState } from 'react';
import axios from 'axios';

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');

const StaffSpecificTimeTab = ({ staff = [], API_URL = '', defaults = {} }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    staffId: '',
    staffName: '',
    staffType: '',
    checkInTime: defaults.standardCheckIn || '08:00',
    checkOutTime: defaults.standardCheckOut || '17:00',
    lateThreshold: defaults.lateThreshold || '08:15',
    anytimeCheck: false,
    connectToSalary: false,
    absentDeducts: true,
    notes: ''
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/hr/attendance/staff-specific-times`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) setRows(res.data.data || []);
    } catch (e) {
      console.error('Error fetching staff-specific times:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      staffId: '',
      staffName: '',
      staffType: '',
      checkInTime: defaults.standardCheckIn || '08:00',
      checkOutTime: defaults.standardCheckOut || '17:00',
      lateThreshold: defaults.lateThreshold || '08:15',
      anytimeCheck: false,
      connectToSalary: false,
      absentDeducts: true,
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      staffId: row.staff_id,
      staffName: row.staff_name,
      staffType: row.staff_type || '',
      checkInTime: (row.check_in_time || '08:00').slice(0, 5),
      checkOutTime: (row.check_out_time || '17:00').slice(0, 5),
      lateThreshold: (row.late_threshold || '08:15').slice(0, 5),
      anytimeCheck: row.anytime_check === true,
      connectToSalary: row.connect_to_salary === true,
      absentDeducts: row.absent_deducts !== false,
      notes: row.notes || ''
    });
    setShowModal(true);
  };

  const handleStaffPick = (e) => {
    const id = e.target.value;
    const picked = staff.find(s => String(s.id) === String(id));
    setForm(prev => ({
      ...prev,
      staffId: id,
      staffName: picked ? picked.name : '',
      staffType: picked ? picked.department : prev.staffType
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.staffId) { alert('Select a staff member first'); return; }
    try {
      const res = await axios.post(`${API_URL}/hr/attendance/staff-specific-times`, {
        staffId: form.staffId,
        staffName: form.staffName,
        staffType: form.staffType,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        lateThreshold: form.lateThreshold,
        anytimeCheck: form.anytimeCheck,
        connectToSalary: form.connectToSalary,
        absentDeducts: form.absentDeducts,
        notes: form.notes
      }, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.data.success) {
        setShowModal(false);
        setMessage('Saved');
        setTimeout(() => setMessage(''), 2500);
        fetchRows();
      }
    } catch (err) {
      console.error('Error saving staff-specific time:', err);
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this staff-specific time?')) return;
    try {
      await axios.delete(`${API_URL}/hr/attendance/staff-specific-times/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchRows();
    } catch (err) {
      console.error('Error deleting staff-specific time:', err);
      alert('Failed to delete');
    }
  };

  const inputStyle = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, width: '100%' };
  const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 };

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#333' }}>Staff Specific Time</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            Give a staff member their own check-in/check-out, or mark them as "any time".
          </p>
        </div>
        <button type="button" onClick={openAdd} style={{ background: '#2196F3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
          + Add Staff Time
        </button>
      </div>

      {message && <div style={{ marginBottom: 12, color: '#2e7d32', fontWeight: 600 }}>{message}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f7fa' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Staff</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Check-In</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Check-Out</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Late After</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Any Time</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Connect to Salary</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Absence Deducts</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="9" style={{ padding: 20, textAlign: 'center', color: '#999' }}>No staff-specific times yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{r.staff_name}</td>
                <td style={{ padding: 10 }}>{r.staff_type || '-'}</td>
                <td style={{ padding: 10 }}>{r.anytime_check ? 'Any' : (r.check_in_time || '-').slice(0, 5)}</td>
                <td style={{ padding: 10 }}>{r.anytime_check ? 'Any' : (r.check_out_time || '-').slice(0, 5)}</td>
                <td style={{ padding: 10 }}>{r.anytime_check ? '-' : (r.late_threshold || '-').slice(0, 5)}</td>
                <td style={{ padding: 10 }}>{r.anytime_check ? 'Yes' : 'No'}</td>
                <td style={{ padding: 10 }}>{r.connect_to_salary ? 'On' : 'Off'}</td>
                <td style={{ padding: 10 }}>{r.absent_deducts === false ? 'No' : 'Yes'}</td>
                <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => openEdit(r)} style={{ marginRight: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #2196F3', background: '#fff', color: '#2196F3', cursor: 'pointer' }}>Edit</button>
                  <button type="button" onClick={() => remove(r.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(560px, 92vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit Staff Time' : 'Add Staff Time'}</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Staff *</label>
              <select value={form.staffId} onChange={handleStaffPick} required style={inputStyle} disabled={!!editingId}>
                <option value="">Select staff</option>
                {staff.map(s => (
                  <option key={String(s.id) + '|' + (s.className || '')} value={s.id}>
                    {s.name} {s.department ? '(' + s.department + ')' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
              <input type="checkbox" checked={form.anytimeCheck} onChange={(e) => setForm({ ...form, anytimeCheck: e.target.checked })} />
              Any time (no late rule — only absence is tracked)
            </label>

            {!form.anytimeCheck && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Check-In</label>
                  <input type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Check-Out</label>
                  <input type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Late After</label>
                  <input type="time" value={form.lateThreshold} onChange={(e) => setForm({ ...form, lateThreshold: e.target.value })} style={inputStyle} />
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 600 }}>
              <input type="checkbox" checked={form.connectToSalary} onChange={(e) => setForm({ ...form, connectToSalary: e.target.checked })} />
              Connect to salary (bad marks can deduct)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={form.absentDeducts} onChange={(e) => setForm({ ...form, absentDeducts: e.target.checked })} />
              Absence deducts{form.anytimeCheck ? ' (any-time staff)' : ''}
            </label>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="Optional" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2196F3', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StaffSpecificTimeTab;
