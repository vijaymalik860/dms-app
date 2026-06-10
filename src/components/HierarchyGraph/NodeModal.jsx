import { useState, useEffect } from 'react';
import { levelConfig } from '../../data/hierarchyData';

export default function NodeModal({ mode, node, parentNode, childLevel, onSave, onClose, loading }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && node) setName(node.name);
    else setName('');
    setError('');
  }, [mode, node]);

  const targetLevel = mode === 'add' ? childLevel : node?.level;
  const cfg = levelConfig[targetLevel] || levelConfig.Units;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('नाम जरूरी है।'); return; }
    if (name.trim().length < 3) { setError('कम से कम 3 characters डालें।'); return; }
    onSave({ name: name.trim() });
  };

  const title = mode === 'add'
    ? `Add ${childLevel} under "${parentNode?.name}"`
    : `Edit "${node?.name}"`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ borderColor: cfg.border }}>
          <span className="modal-icon">{cfg.icon}</span>
          <div>
            <div className="modal-level" style={{ color: cfg.color }}>{targetLevel}</div>
            <div className="modal-title">{title}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="unit-name">
              {targetLevel} का नाम <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="unit-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder={`e.g. ${
                targetLevel === 'Range'    ? 'Faridabad Range' :
                targetLevel === 'District' ? 'Panipat District' :
                targetLevel === 'Units'       ? 'Police Stations' :
                targetLevel === 'Sub-Units'   ? 'PS Civil Lines' :
                targetLevel === 'Chowki'   ? 'Chowki Bus Stand' :
                'Unit Name'
              }`}
              autoFocus
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          {/* Info row */}
          {mode === 'add' && (
            <div className="modal-info-row">
              <span>📌 Parent:</span>
              <span style={{ color: levelConfig[parentNode?.level]?.color }}>
                {levelConfig[parentNode?.level]?.icon} {parentNode?.name}
              </span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ background: cfg.border }} disabled={loading}>
              {loading ? 'Saving...' : mode === 'add' ? '➕ Add Unit' : '✔ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
