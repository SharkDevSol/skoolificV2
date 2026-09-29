// Guardian list for the finance app — guardians + their students,
// same endpoint the admin panel Communication page uses.
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import styles from './GuardianList.module.css';

const GuardianList = () => {
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await axios.get('/api/chats/contacts/guardians');
        if (!live) return;
        setGuardians(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (live) setError(e?.response?.data?.error || 'Failed to load guardians');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guardians;
    return guardians.filter(g =>
      String(g.name || '').toLowerCase().includes(q) ||
      String(g.phone || '').toLowerCase().includes(q) ||
      String(g.id || '').toLowerCase().includes(q) ||
      (g.students || []).some(s => String(s.name || s.student_name || '').toLowerCase().includes(q))
    );
  }, [guardians, query]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Guardians</h1>
        <input
          className={styles.search}
          placeholder="Search guardians, phones, students..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading && <div className={styles.state}>Loading guardians...</div>}
      {!loading && error && <div className={styles.state}>{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className={styles.state}>No guardians found</div>
      )}
      <div className={styles.grid}>
        {filtered.map((g, i) => (
          <div key={g.id || i} className={styles.card}>
            <div className={styles.row}>
              <span className={styles.name}>{g.name || g.id}</span>
              <span className={styles.phone}>{g.phone}</span>
            </div>
            {(g.students || []).length > 0 && (
              <div className={styles.students}>
                {(g.students || []).map((s, j) => (
                  <span key={j} className={styles.student}>
                    {s.name || s.student_name}{s.class || s.class_name ? ` (${s.class || s.class_name})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuardianList;
