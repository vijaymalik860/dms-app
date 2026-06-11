// ─────────────────────────────────────────────────────────────
// src/components/Dropdown/DropdownMaster.jsx
// Dropdown Master Management - Tab-based UI matching original design
// Tabs: field type tabs + Personnel Layout tab + Add Tab
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

import {
  Database, Plus, Edit2, Trash2, X, Check, ChevronUp, ChevronDown,
  GripVertical, Save, LayoutTemplate, AlertCircle, ArrowLeft
} from 'lucide-react';
import './dropdown.css';

// ── Personnel Layout Config ─────────────────────────────────────
// Screenshot ke anusar 5 sections + unke fields
const INITIAL_LAYOUT = [
  {
    id: 'personal',
    title: '1. Personal Details',
    strict: false,
    fields: [
      'photo_and_name_block', 'dateOfBirth', 'gender',
      'bloodGroup', 'mobileNumber', 'alternateContact',
      'payCode', 'religion', 'caste',
      'category', 'aadharNumber', 'pan',
      'homeDistrict',
    ],
  },
  {
    id: 'education',
    title: '2. Education & Training',
    strict: false,
    fields: [
      'subjectGraduation', 'subjectPostGraduation', 'swatAwtCourse',
      'specialCourse', 'promotionType',
    ],
  },
  {
    id: 'service',
    title: '3. Service Details',
    strict: false,
    fields: [
      'rank', 'beltNumber', 'cadre',
      'serviceType', 'serviceStatus', 'serviceBookNumber',
      'dateOfEnlistment', 'dateOfLastPromotion', 'retirementDate',
    ],
  },
  {
    id: 'posting',
    title: '4. Posting & Location',
    strict: true,
    fields: [
      'stateId', 'rangeId', 'districtId',
      'unitType', 'currentUnitId', 'currentSubUnitId',
    ],
  },
  {
    id: 'duty',
    title: '5. Duty & Role',
    strict: false,
    fields: [
      'psDutyType', 'ioStatus', 'ioCategory',
      'paradeGroup', 'spoTrade', 'company',
      'dateOfPosting', 'rBatch', 'tDutyOrder',
      'remarks',
    ],
  },
];

// All section IDs for "Move To" dropdown options
const SECTION_OPTIONS = INITIAL_LAYOUT.map(s => ({ id: s.id, title: s.title }));

// ── Main Component ──────────────────────────────────────────────
export default function DropdownMaster({ goHome }) {
  const [fieldTypes, setFieldTypes] = useState([]);
  const [activeTab, setActiveTab] = useState(null); // field_type id or 'personnel_layout'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Tab modal
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [addTabError, setAddTabError] = useState(null);
  const [addingTab, setAddingTab] = useState(false);

  // Value Add/Edit modal
  const [showValueModal, setShowValueModal] = useState(false);
  const [editValue, setEditValue] = useState(null);
  const [modalValue, setModalValue] = useState('');
  const [modalOrder, setModalOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Personnel Layout state
  const [layout, setLayout] = useState(INITIAL_LAYOUT);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [layoutSaved, setLayoutSaved] = useState(false);

  // ── Fetch field types ─────────────────────────────────────────
  const fetchDropdowns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dropdowns');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setFieldTypes(data.data);
      // Default to first tab
      if (!activeTab && data.data.length > 0) {
        setActiveTab(data.data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDropdowns(); }, []);

  // ── Active tab data ───────────────────────────────────────────
  const selectedFT = fieldTypes.find(ft => ft.id === activeTab);

  // ── Value Modal open ──────────────────────────────────────────
  const openAdd = () => {
    setEditValue(null);
    setModalValue('');
    setModalOrder('0');
    setModalError(null);
    setShowValueModal(true);
  };

  const openEdit = (v) => {
    setEditValue(v);
    setModalValue(v.value);
    setModalOrder(String(v.display_order));
    setModalError(null);
    setShowValueModal(true);
  };

  // ── Save value (add or edit) ──────────────────────────────────
  const handleSave = async () => {
    if (!modalValue.trim()) { setModalError('Value required hai'); return; }
    setSaving(true);
    setModalError(null);
    try {
      let res;
      if (editValue) {
        res = await fetch(`/api/dropdowns/values/${editValue.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: modalValue, display_order: parseInt(modalOrder) || 0 }),
        });
      } else {
        res = await fetch('/api/dropdowns/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field_type_id: selectedFT.id,
            value: modalValue,
            display_order: parseInt(modalOrder) || 0,
          }),
        });
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowValueModal(false);
      fetchDropdowns();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete value ──────────────────────────────────────────────
  const handleDelete = async (v) => {
    if (!confirm(`"${v.value}" delete karna chahte hain?`)) return;
    try {
      const res = await fetch(`/api/dropdowns/values/${v.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchDropdowns();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // ── Add new tab (field type) ──────────────────────────────────
  const handleAddTab = async () => {
    if (!newTabName.trim()) { setAddTabError('Tab name required hai'); return; }
    setAddingTab(true);
    setAddTabError(null);
    try {
      const res = await fetch('/api/dropdowns/field-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: newTabName.trim().toLowerCase().replace(/\s+/g, '_'),
          display_name: newTabName.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowAddTab(false);
      setNewTabName('');
      await fetchDropdowns();
      setActiveTab(data.data.id);
    } catch (err) {
      setAddTabError(err.message);
    } finally {
      setAddingTab(false);
    }
  };

  // ── Personnel Layout helpers ──────────────────────────────────
  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Move field up within section
  const moveFieldUp = (sectionIdx, fieldIdx) => {
    if (fieldIdx === 0) return;
    setLayout(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const fields = next[sectionIdx].fields;
      [fields[fieldIdx - 1], fields[fieldIdx]] = [fields[fieldIdx], fields[fieldIdx - 1]];
      return next;
    });
  };

  // Move field down within section
  const moveFieldDown = (sectionIdx, fieldIdx) => {
    setLayout(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const fields = next[sectionIdx].fields;
      if (fieldIdx >= fields.length - 1) return prev;
      [fields[fieldIdx], fields[fieldIdx + 1]] = [fields[fieldIdx + 1], fields[fieldIdx]];
      return next;
    });
  };

  // Move field to another section
  const moveFieldTo = (sectionIdx, fieldIdx, targetSectionId) => {
    if (!targetSectionId) return;
    setLayout(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const field = next[sectionIdx].fields.splice(fieldIdx, 1)[0];
      const targetIdx = next.findIndex(s => s.id === targetSectionId);
      if (targetIdx !== -1) next[targetIdx].fields.push(field);
      return next;
    });
  };

  // Save layout config
  const saveLayout = () => {
    // In real app: POST to API. Here just show success flash.
    setLayoutSaved(true);
    setTimeout(() => setLayoutSaved(false), 2500);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="dm-root">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="dm-header">
        <div className="dm-header-left">
          {goHome && (
            <button className="dm-btn-ghost" style={{ padding: '6px' }} onClick={goHome} title="Back to Dashboard">
              <ArrowLeft size={18} />
            </button>
          )}
          <Database size={20} className="dm-header-icon" />
          <div>
            <h1 className="dm-header-title">Dropdown Master Management</h1>
          </div>
        </div>
        <div className="dm-header-right">
          Centralized dropdown values for the entire portal
        </div>
      </div>

      {/* ── Tabs Row ────────────────────────────────────────── */}
      <div className="dm-tabs-bar">
        <div className="dm-tabs-scroll">
          {loading && (
            <div className="dm-tab-skeleton">
              {[1,2,3,4].map(i => <div key={i} className="dm-tab-skeleton-item" />)}
            </div>
          )}
          {!loading && fieldTypes.map(ft => (
            <button
              key={ft.id}
              className={`dm-tab ${activeTab === ft.id ? 'dm-tab-active' : ''}`}
              onClick={() => setActiveTab(ft.id)}
            >
              {ft.display_name}
              <span className="dm-tab-count">{ft.values?.length || 0}</span>
            </button>
          ))}

          {/* Personnel Layout Tab */}
          {!loading && (
            <button
              className={`dm-tab dm-tab-layout ${activeTab === 'personnel_layout' ? 'dm-tab-layout-active' : ''}`}
              onClick={() => setActiveTab('personnel_layout')}
            >
              <LayoutTemplate size={13} />
              Personnel Layout
            </button>
          )}

          {/* Add Tab */}
          {!loading && (
            <button
              className="dm-tab-add"
              onClick={() => { setNewTabName(''); setAddTabError(null); setShowAddTab(true); }}
            >
              <Plus size={13} /> Add Tab
            </button>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="dm-error-bar">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── Tab Content ─────────────────────────────────────── */}
      <div className="dm-content">

        {/* ── FIELD TYPE PANEL ──────────────────────────────── */}
        {activeTab !== 'personnel_layout' && selectedFT && (
          <div className="dm-values-panel">
            {/* Panel header */}
            <div className="dm-values-header">
              <div>
                <div className="dm-values-title">{selectedFT.display_name} Values</div>
                {selectedFT.helper_example && (
                  <div className="dm-values-sub">Example: {selectedFT.helper_example}</div>
                )}
              </div>
              <button className="dm-btn-primary" onClick={openAdd}>
                <Plus size={14} /> Add Value
              </button>
            </div>

            {/* Values table */}
            {selectedFT.values.length === 0 ? (
              <div className="dm-empty">
                <Database size={36} />
                <p>Koi value nahi hai — "Add Value" karein</p>
              </div>
            ) : (
              <div className="dm-table-wrap">
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Value</th>
                      <th>Display Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFT.values.map((v, i) => (
                      <tr key={v.id}>
                        <td className="dm-td-num">{i + 1}</td>
                        <td className="dm-td-value">{v.value}</td>
                        <td className="dm-td-order">{v.display_order}</td>
                        <td>
                          <span className={`dm-badge ${v.is_active ? 'dm-badge-active' : 'dm-badge-inactive'}`}>
                            {v.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="dm-actions">
                            <button className="dm-btn-icon dm-btn-edit" onClick={() => openEdit(v)} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button className="dm-btn-icon dm-btn-delete" onClick={() => handleDelete(v)} title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Placeholder if no tab selected */}
        {activeTab !== 'personnel_layout' && !selectedFT && !loading && (
          <div className="dm-empty dm-empty-full">
            <Database size={40} />
            <p>Upar se ek tab select karein</p>
          </div>
        )}

        {/* ── PERSONNEL LAYOUT PANEL ────────────────────────── */}
        {activeTab === 'personnel_layout' && (
          <div className="dm-layout-panel">
            {/* Layout header */}
            <div className="dm-layout-header">
              <div className="dm-layout-header-left">
                <LayoutTemplate size={16} className="dm-layout-icon" />
                <div>
                  <div className="dm-layout-title">Personnel Form Layout</div>
                  <div className="dm-layout-sub">
                    Manage sections and shuffle fields to customize the Personnel Add/View screens.
                  </div>
                </div>
              </div>
              <button
                className={`dm-btn-save-config ${layoutSaved ? 'dm-btn-saved' : ''}`}
                onClick={saveLayout}
              >
                {layoutSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Configuration</>}
              </button>
            </div>

            {/* Sections */}
            <div className="dm-sections">
              {layout.map((section, sIdx) => (
                <div key={section.id} className="dm-section-card">
                  {/* Section header */}
                  <div className="dm-section-header" onClick={() => toggleSection(section.id)}>
                    <span className="dm-section-title">
                      {section.title}
                      {section.strict && <span className="dm-strict-badge">STRICT</span>}
                    </span>
                    <div className="dm-section-controls">
                      <ChevronUp size={16} className={`dm-chevron ${collapsedSections[section.id] ? 'dm-chevron-rotated' : ''}`} />
                      <ChevronDown size={16} className={`dm-chevron2 ${collapsedSections[section.id] ? 'dm-chevron2-rotated' : ''}`} />
                    </div>
                  </div>

                  {/* Fields grid */}
                  {!collapsedSections[section.id] && (
                    <div className="dm-fields-grid">
                      {section.fields.map((field, fIdx) => (
                        <div key={field} className="dm-field-item">
                          <GripVertical size={14} className="dm-field-grip" />
                          <span className="dm-field-name">{field}</span>
                          <div className="dm-field-controls">
                            {!section.strict && (
                              <>
                                <button
                                  className="dm-arr-btn"
                                  onClick={() => moveFieldUp(sIdx, fIdx)}
                                  title="Upar"
                                >
                                  <ChevronUp size={12} />
                                </button>
                                <button
                                  className="dm-arr-btn"
                                  onClick={() => moveFieldDown(sIdx, fIdx)}
                                  title="Neeche"
                                >
                                  <ChevronDown size={12} />
                                </button>
                                <select
                                  className="dm-moveto-select"
                                  defaultValue=""
                                  onChange={e => { moveFieldTo(sIdx, fIdx, e.target.value); e.target.value = ''; }}
                                  title="Move To..."
                                >
                                  <option value="" disabled>Move To...</option>
                                  {SECTION_OPTIONS
                                    .filter(s => s.id !== section.id)
                                    .map(s => (
                                      <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Value Modal ──────────────────────────────────── */}
      {showValueModal && (
        <div className="dm-modal-overlay" onClick={e => e.target === e.currentTarget && setShowValueModal(false)}>
          <div className="dm-modal">
            <div className="dm-modal-header">
              <h2>{editValue ? 'Value Edit Karein' : `"${selectedFT?.display_name}" mein Value Add Karein`}</h2>
              <button className="dm-modal-close" onClick={() => setShowValueModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dm-modal-body">
              {modalError && (
                <div className="dm-modal-error">
                  <AlertCircle size={14} /> {modalError}
                </div>
              )}
              <div className="dm-form-group">
                <label>Value *</label>
                <input
                  type="text"
                  className="dm-input"
                  value={modalValue}
                  onChange={e => setModalValue(e.target.value)}
                  placeholder={`e.g. ${selectedFT?.helper_example || 'value likhein'}`}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              <div className="dm-form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  className="dm-input"
                  value={modalOrder}
                  onChange={e => setModalOrder(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn-ghost" onClick={() => setShowValueModal(false)}>Cancel</button>
              <button className="dm-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editValue ? 'Update' : 'Add Karein'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Tab Modal ────────────────────────────────────── */}
      {showAddTab && (
        <div className="dm-modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddTab(false)}>
          <div className="dm-modal" style={{ maxWidth: 400 }}>
            <div className="dm-modal-header">
              <h2>Naya Tab Add Karein</h2>
              <button className="dm-modal-close" onClick={() => setShowAddTab(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dm-modal-body">
              {addTabError && (
                <div className="dm-modal-error">
                  <AlertCircle size={14} /> {addTabError}
                </div>
              )}
              <div className="dm-form-group">
                <label>Tab Name *</label>
                <input
                  type="text"
                  className="dm-input"
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  placeholder="e.g. Marital Status"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddTab()}
                />
              </div>
            </div>
            <div className="dm-modal-footer">
              <button className="dm-btn-ghost" onClick={() => setShowAddTab(false)}>Cancel</button>
              <button className="dm-btn-primary" onClick={handleAddTab} disabled={addingTab}>
                {addingTab ? 'Adding...' : 'Add Tab'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
