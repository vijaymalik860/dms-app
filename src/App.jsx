import { useState, useEffect } from 'react';
import { Network, LayoutDashboard, Users, ShieldAlert, Settings, Menu, X } from 'lucide-react';
import HierarchyGraph   from './components/HierarchyGraph/HierarchyGraph';
import PersonnelList    from './components/Personnel/PersonnelList';
import DropdownMaster   from './components/Dropdown/DropdownMaster';
import Dashboard        from './components/Dashboard/Dashboard';
import './layout.css';

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (module) => {
    setActiveModule(module);
    setIsSidebarOpen(false); // Close sidebar on mobile when navigating
  };

  return (
    <div className="app-layout">
      {/* Mobile Topbar */}
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <Menu size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>D</div>
          <div className="sidebar-title" style={{ fontSize: 18 }}>DMS</div>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">D</div>
          <div className="sidebar-title">DMS</div>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeModule === 'hierarchy' ? 'active' : ''}`}
            onClick={() => handleNavClick('hierarchy')}
          >
            <span className="nav-icon"><Network size={18} /></span>
            Unit Hierarchy
          </button>

          <button 
            className={`nav-item ${activeModule === 'personnel' ? 'active' : ''}`}
            onClick={() => handleNavClick('personnel')}
          >
            <span className="nav-icon"><Users size={18} /></span>
            Personnel
          </button>

          <button 
            className={`nav-item ${activeModule === 'incidents' ? 'active' : ''}`}
            onClick={() => handleNavClick('incidents')}
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
            onClick={() => handleNavClick('personnel')}
          >
            <span className="nav-icon"><Users size={18} /></span>
            Employee Master
          </button>

          <button 
            className={`nav-item ${activeModule === 'dropdowns' ? 'active' : ''}`}
            onClick={() => handleNavClick('dropdowns')}
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
