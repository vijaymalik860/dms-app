import { useState } from 'react';
import { Network, LayoutDashboard, Users, ShieldAlert, Settings } from 'lucide-react';
import HierarchyGraph   from './components/HierarchyGraph/HierarchyGraph';
import PersonnelList    from './components/Personnel/PersonnelList';
import DropdownMaster   from './components/Dropdown/DropdownMaster';
import Dashboard        from './components/Dashboard/Dashboard';
import './layout.css';

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">D</div>
          <div className="sidebar-title">DMS</div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveModule('dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeModule === 'hierarchy' ? 'active' : ''}`}
            onClick={() => setActiveModule('hierarchy')}
          >
            <span className="nav-icon"><Network size={18} /></span>
            Unit Hierarchy
          </button>

          <button 
            className={`nav-item ${activeModule === 'personnel' ? 'active' : ''}`}
            onClick={() => setActiveModule('personnel')}
          >
            <span className="nav-icon"><Users size={18} /></span>
            Personnel
          </button>

          <button 
            className={`nav-item ${activeModule === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveModule('incidents')}
          >
            <span className="nav-icon"><ShieldAlert size={18} /></span>
            Incidents
          </button>

          {/* ── New Modules ──────────────────── */}
          <div style={{ padding: '8px 12px 4px', fontSize: '0.68rem', fontWeight: 700, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 8 }}>
            Management
          </div>

          <button 
            className={`nav-item ${activeModule === 'personnel' ? 'active' : ''}`}
            onClick={() => setActiveModule('personnel')}
          >
            <span className="nav-icon"><Users size={18} /></span>
            Employee Master
          </button>

          <button 
            className={`nav-item ${activeModule === 'dropdowns' ? 'active' : ''}`}
            onClick={() => setActiveModule('dropdowns')}
          >
            <span className="nav-icon"><Settings size={18} /></span>
            Dropdown Master
          </button>
        </nav>

        <div className="sidebar-footer">
          v2.0.1 • Haryana Police
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeModule === 'dashboard'  && <Dashboard />}
        {activeModule === 'hierarchy'  && <HierarchyGraph />}
        {activeModule === 'personnel'  && <PersonnelList />}
        {activeModule === 'dropdowns'  && <DropdownMaster />}
        {activeModule !== 'dashboard' && activeModule !== 'hierarchy' && activeModule !== 'personnel' && activeModule !== 'dropdowns' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            <h2>{activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Module (Coming Soon)</h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
