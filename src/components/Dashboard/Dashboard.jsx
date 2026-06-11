// src/components/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import './dashboard.css';

function getTodayStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Map level_order → friendly display label
function getLevelLabel(lo, dbName) {
  const MAP = {
    2: 'Ranges / Commissionerates',
    3: 'Districts',
    4: 'Units / Police Stations',
    5: 'Sub-Units / Chowki',
    6: 'Sub-Units / Chowki',  // level 6 = same group
  };
  return MAP[lo] || dbName;
}

export default function Dashboard() {
  const [totalPersonnel, setTotalPersonnel] = useState(0);
  const [orgRows, setOrgRows]               = useState([]);   // [{label, count}]
  const [recent, setRecent]                 = useState([]);
  const [stateRows, setStateRows]           = useState([]);   // [{name, districts}]
  const [loading, setLoading]               = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // ── Personnel ─────────────────────────────────────────
      const pRes  = await fetch('/api/personnel?limit=5');
      const pData = await pRes.json();
      if (pData.success) {
        setRecent(pData.data);
        setTotalPersonnel(pData.total);
      }

      // ── Hierarchy flat nodes ──────────────────────────────
      const hRes  = await fetch('/api/hierarchy/nodes');
      const hData = await hRes.json();
      if (!hData.success) return;

      const nodes = hData.data || [];

      // Group nodes by level_order
      const levelMap = {};
      nodes.forEach(n => {
        const lo = n.level_order;
        if (!levelMap[lo]) levelMap[lo] = { name: n.level_name, count: 0 };
        levelMap[lo].count++;
      });

      // Org Structure rows: skip level 1 (State), merge same labels
      const rawRows = Object.entries(levelMap)
        .filter(([lo]) => parseInt(lo) > 1)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([lo, v]) => ({
          label: getLevelLabel(parseInt(lo), v.name),
          count: v.count,
        }));

      // Merge rows with same label (e.g. level 5 + level 6 both = "Sub-Units / Chowki")
      const mergedRows = [];
      rawRows.forEach(r => {
        const existing = mergedRows.find(m => m.label === r.label);
        if (existing) existing.count += r.count;
        else mergedRows.push({ ...r });
      });

      setOrgRows(mergedRows);

      // State → District count (level 3 nodes under each state)
      // node.parent_id = range_id, range.parent_id = state_id
      const nodeMap = {};
      nodes.forEach(n => { nodeMap[String(n.id)] = n; });

      const states    = nodes.filter(n => n.level_order === 1);
      const districts = nodes.filter(n => n.level_order === 3);

      const stateData = states.map(s => {
        const distCount = districts.filter(d => {
          const range = nodeMap[String(d.parent_id)];
          return range && String(range.parent_id) === String(s.id);
        }).length;
        return { name: s.name, districts: distCount };
      });
      setStateRows(stateData);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const statusCls = (s) =>
    s === 'Active' ? 'db-status-active' :
    s === 'Suspended' ? 'db-status-suspended' : 'db-status-other';

  return (
    <div className="db-page">

      {/* ── Top nav bar ─────────────────────────────────────── */}
      <div className="db-top-bar">
        <span className="db-top-title">Dashboard</span>
        <div className="db-top-right">
          <div className="db-bell">
            <span className="db-bell-badge">3</span>🔔
          </div>
          <div className="db-avatar">👤</div>
        </div>
      </div>

      <div className="db-content">

        {/* ── Page title ──────────────────────────────────── */}
        <div className="db-page-title">
          <h2>DMS Overview</h2>
          <p>{getTodayStr()}</p>
        </div>

        {/* ── Top Row ─────────────────────────────────────── */}
        <div className="db-grid-2">

          {/* Personnel card */}
          <div className="db-card db-personnel-card">
            <div className="db-personnel-icon"><Users size={28} /></div>
            <div>
              <div className="db-big-num">{loading ? '—' : totalPersonnel}</div>
              <div className="db-card-label">Total Personnel</div>
            </div>
          </div>

          {/* Org Structure card — dynamic from DB levels */}
          <div className="db-card">
            <div className="db-org-title">ORG. STRUCTURE</div>
            <div className="db-org-list">
              {loading ? (
                <div className="db-org-row"><span>Loading...</span></div>
              ) : orgRows.map((r, i) => (
                <div key={i} className="db-org-row">
                  <span>{r.label}</span>
                  <strong>{r.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Row ──────────────────────────────────── */}
        <div className="db-grid-2">

          {/* Recent Personnel table */}
          <div className="db-card">
            <div className="db-section-title">Recent Personnel</div>
            <table className="db-table">
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>Belt No.</th>
                  <th>Name</th>
                  <th>Rank</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="db-loading-cell">Loading...</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan={5} className="db-empty-cell">Koi record nahi</td></tr>
                ) : recent.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.belt_number || '—'}</td>
                    <td>{p.full_name}</td>
                    <td className="db-rank-cell">{p.rank || '—'}</td>
                    <td>
                      <span className={`db-status ${statusCls(p.service_status)}`}>
                        {p.service_status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* States & Districts table */}
          <div className="db-card">
            <div className="db-section-title">All Configured States &amp; Districts</div>
            <table className="db-table">
              <thead>
                <tr>
                  <th>State / District Name</th>
                  <th className="db-th-right">Total Districts</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="db-loading-cell">Loading...</td></tr>
                ) : stateRows.length === 0 ? (
                  <tr><td colSpan={2} className="db-empty-cell">Koi data nahi</td></tr>
                ) : stateRows.map((s, i) => (
                  <tr key={i}>
                    <td><span className="db-chevron">›</span>{s.name}</td>
                    <td className="db-td-right">{s.districts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
