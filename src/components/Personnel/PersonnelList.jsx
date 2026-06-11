// src/components/Personnel/PersonnelList.jsx
import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Upload, RefreshCw, UserCheck, ArrowLeft } from 'lucide-react';
import PersonnelForm from './PersonnelForm';
import ExcelImport from './ExcelImport';
import './personnel.css';

export default function PersonnelList({ goHome }) {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [ranks, setRanks]         = useState([]);
  const [total, setTotal]         = useState(0);

  // View state: 'list' | 'form' | 'import'
  const [view, setView]           = useState('list');
  const [editRecord, setEditRecord] = useState(null);


  const fetchPersonnel = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (search)     params.append('search', search);
      if (rankFilter) params.append('rank', rankFilter);
      const res  = await fetch(`/api/personnel?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPersonnel(data.data);
      setTotal(data.total);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [search, rankFilter]);

  const fetchRanks = async () => {
    try {
      const res  = await fetch('/api/dropdowns');
      const data = await res.json();
      if (data.success) {
        const rt = data.data.find(ft => ft.field_name === 'rank');
        if (rt) setRanks(rt.values.map(v => v.value));
      }
    } catch (_) {}
  };

  // Extract short code from "Sub-Inspector (SI)" → "SI"
  // Falls back to full string if no parentheses found
  const getRankCode = (rankStr) => {
    const match = rankStr.match(/\(([^)]+)\)$/);
    return match ? match[1] : rankStr;
  };

  useEffect(() => { fetchPersonnel(); }, [fetchPersonnel]);
  useEffect(() => { fetchRanks(); }, []);

  const handleDelete = async (p) => {
    if (!confirm(`"${p.full_name}" delete karna chahte hain?`)) return;
    try {
      const res  = await fetch(`/api/personnel/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchPersonnel();
    } catch (err) { alert('Delete failed: ' + err.message); }
  };

  const openAdd    = () => { setEditRecord(null); setView('form'); };
  const openEdit   = (p) => { setEditRecord(p); setView('form'); };
  const openImport = () => setView('import');
  const backToList = () => { setView('list'); setEditRecord(null); };
  const onSaved    = () => { backToList(); fetchPersonnel(); };
  const onImported = () => { backToList(); fetchPersonnel(); };

  const renderAvatar = (p) => {
    if (p.photo_url)
      return <img src={`/${p.photo_url}`} alt={p.full_name} className="avatar" />;
    const initials = p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('');
    return <div className="avatar-placeholder">{initials}</div>;
  };

  const statusBadge = (s) => {
    const cls = s === 'Active' ? 'badge-active' : s === 'Suspended' ? 'badge-suspended' : 'badge-inactive';
    return <span className={`badge ${cls}`}>{s || '—'}</span>;
  };

  // ── Full-page form view ─────────────────────────────────────
  if (view === 'form') {
    return <PersonnelForm record={editRecord} onClose={backToList} onSaved={onSaved} />;
  }

  // ── Full-page import view ────────────────────────────────────
  if (view === 'import') {
    return <ExcelImport onClose={backToList} onImported={onImported} />;
  }

  // ── List view ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {goHome && (
            <button className="btn btn-ghost btn-sm" onClick={goHome} title="Back to Dashboard">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1><Users size={20} /> Employee Master Data</h1>
            <div className="module-subtitle">Total Records: {total}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={openImport}>
            <Upload size={15} /> Excel Import
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={15} /> Naya Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="pl-filters">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={15} />
          <input
            placeholder="Naam, Belt No, Pay Code se search karein..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width: 180 }} value={rankFilter} onChange={e => setRankFilter(e.target.value)}>
          <option value="">Sabhi Ranks</option>
          {ranks.map(r => <option key={r} value={getRankCode(r)}>{r}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchPersonnel} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '12px 20px' }}>{error}</div>}

      {/* Table */}
      <div className="data-table-wrapper">
        {loading ? (
          <div className="loading-center"><div className="spinner" /><p>Loading...</p></div>
        ) : personnel.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={48} />
            <p>Koi record nahi mila</p>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={14} /> Pehla Employee Add Karein
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Naam</th>
                <th>Belt No.</th>
                <th>Rank</th>
                <th>Mobile</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map(p => (
                <tr key={p.id}>
                  <td>{renderAvatar(p)}</td>
                  <td>
                    <div className="td-name">{p.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.pay_code || '—'}</div>
                  </td>
                  <td>{p.belt_number || '—'}</td>
                  <td style={{ maxWidth: 160, whiteSpace: 'normal' }}>{p.rank || '—'}</td>
                  <td>{p.mobile_number || '—'}</td>
                  <td>
                    {p.unit_name
                      ? <div><div style={{ fontSize: '0.8rem' }}>{p.unit_name}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.unit_level}</div></div>
                      : '—'}
                  </td>
                  <td>{statusBadge(p.service_status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


    </div>
  );
}
