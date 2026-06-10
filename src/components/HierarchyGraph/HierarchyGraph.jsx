import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './hierarchy.css';
import CustomNode from './CustomNode';
import NodeModal from './NodeModal';
import { levelConfig } from '../../data/hierarchyData';

// ── Node types registration ──────────────────────
const nodeTypes = { customNode: CustomNode };

const LEVEL_ORDER = ['State', 'Range', 'District', 'PS', 'Chowki'];
const getChildLevel = (parentLevel) => {
  const idx = LEVEL_ORDER.indexOf(parentLevel);
  return idx >= 0 && idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
};

// ── API helpers ───────────────────────────────────
const API = '/api/hierarchy';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data.data;
}

// ── Build React Flow graph from tree ─────────────
function buildGraph(treeNode, expandedIds, handlers, parentId = null) {
  const nodes = [];
  const edges = [];
  const isExpanded = expandedIds.has(treeNode.id);
  const hasChildren = (treeNode.children || []).length > 0;

  nodes.push({
    id: String(treeNode.id),
    type: 'customNode',
    position: { x: 0, y: 0 },
    data: {
      label: treeNode.name,
      level: treeNode.level,
      expanded: isExpanded,
      childCount: (treeNode.children || []).length,
      dbId: treeNode.id,
      onToggle: () => handlers.toggle(treeNode.id),
      onContextMenu: (e) => handlers.contextMenu(e, treeNode),
    },
  });

  if (parentId) {
    edges.push({
      id: `e-${parentId}-${treeNode.id}`,
      source: String(parentId),
      target: String(treeNode.id),
      type: 'smoothstep',
      style: { stroke: 'rgba(148,163,184,0.35)', strokeWidth: 1.5 },
    });
  }

  if (isExpanded && hasChildren) {
    (treeNode.children || []).forEach(child => {
      const { nodes: cn, edges: ce } = buildGraph(child, expandedIds, handlers, treeNode.id);
      nodes.push(...cn);
      edges.push(...ce);
    });
  }

  return { nodes, edges };
}

// ── Auto-Layout Engine ────────────────────────────
function layoutNodes(nodes, edges) {
  const children = {};
  const parentOf = {};
  edges.forEach(e => {
    if (!children[e.source]) children[e.source] = [];
    children[e.source].push(e.target);
    parentOf[e.target] = e.source;
  });

  const roots = nodes.map(n => n.id).filter(id => !parentOf[id]);
  const NODE_W = 260, NODE_H = 56, GAP_X = 60, GAP_Y = 18;
  const positioned = {};

  function getSubtreeHeight(id) {
    const ch = children[id] || [];
    if (!ch.length) return NODE_H;
    return Math.max(NODE_H, ch.reduce((s, c) => s + getSubtreeHeight(c) + GAP_Y, 0) - GAP_Y);
  }

  function place(id, x, yStart) {
    const ch = children[id] || [];
    if (!ch.length) { positioned[id] = { x, y: yStart }; return yStart + NODE_H; }
    let curY = yStart;
    ch.forEach(c => { curY = place(c, x + NODE_W + GAP_X, curY); curY += GAP_Y; });
    curY -= GAP_Y;
    const firstY = positioned[ch[0]].y;
    const lastY  = positioned[ch[ch.length - 1]].y;
    positioned[id] = { x, y: (firstY + lastY) / 2 };
    return curY;
  }

  let yOffset = 40;
  roots.forEach(root => {
    place(root, 40, yOffset);
    yOffset += getSubtreeHeight(root) + 60;
  });

  return nodes.map(n => ({ ...n, position: positioned[n.id] || { x: 0, y: 0 } }));
}

// ── Context Menu ──────────────────────────────────
function ContextMenu({ menu, onAdd, onEdit, onDelete, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const canAddChild = getChildLevel(menu.node.level) !== null;

  return (
    <div ref={ref} className="context-menu" style={{ top: menu.y, left: menu.x }}>
      <div className="context-menu-header">
        <span className="ctx-icon">{levelConfig[menu.node.level]?.icon}</span>
        <span className="ctx-name">{menu.node.name}</span>
      </div>
      {canAddChild && (
        <button className="ctx-btn ctx-add" onClick={() => { onAdd(menu.node); onClose(); }}>
          <span>➕</span> Add {getChildLevel(menu.node.level)}
        </button>
      )}
      <button className="ctx-btn ctx-edit" onClick={() => { onEdit(menu.node); onClose(); }}>
        <span>✏️</span> Edit Unit
      </button>
      {menu.node.level !== 'State' && (
        <button className="ctx-btn ctx-delete" onClick={() => { onDelete(menu.node); onClose(); }}>
          <span>🗑️</span> Delete Unit
        </button>
      )}
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────
function DeleteConfirm({ node, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box delete-confirm">
        <div className="delete-icon">⚠️</div>
        <h3>Delete Unit?</h3>
        <p><strong>{node.name}</strong> और इसके सभी sub-units permanently delete हो जाएंगे।</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn-danger" onClick={() => onConfirm(node)} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast Notification ────────────────────────────
function Toast({ msg, type }) {
  return (
    <div className={`toast toast--${type}`}>
      {type === 'success' ? '✅' : '❌'} {msg}
    </div>
  );
}

// ── Main Component ────────────────────────────────
export default function HierarchyGraph() {
  const [treeData, setTreeData]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [apiLoading, setApiLoading]     = useState(false);
  const [expandedIds, setExpandedIds]   = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenu, setContextMenu]   = useState(null);
  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]               = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ── Show toast ──
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch tree from API ──
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch(API);
      setTreeData(data);
      setExpandedIds(new Set([String(data.id)])); // root auto-expand
    } catch (err) {
      showToast('Database से data load नहीं हुआ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // ── Toggle expand ──
  const handleToggle = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(String(id)) ? next.delete(String(id)) : next.add(String(id));
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleNodeClick = useCallback((_, node) => setSelectedNode(node.data), []);

  // ── Rebuild graph ──
  useEffect(() => {
    if (!treeData) return;
    const { nodes: raw, edges: raw2 } = buildGraph(
      treeData, expandedIds, { toggle: handleToggle, contextMenu: handleContextMenu }
    );
    setNodes(layoutNodes(raw, raw2));
    setEdges(raw2);
  }, [treeData, expandedIds, handleToggle, handleContextMenu]);

  // ── CRUD: Add ──
  const handleSave = async (formData) => {
    setApiLoading(true);
    try {
      if (modal.mode === 'add') {
        await apiFetch(`${API}/nodes`, {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, parent_id: modal.parentNode.id }),
        });
        showToast(`"${formData.name}" successfully add हो गया!`);
        setExpandedIds(prev => new Set([...prev, String(modal.parentNode.id)]));
      } else {
        await apiFetch(`${API}/nodes/${modal.node.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: formData.name }),
        });
        showToast(`"${formData.name}" update हो गया!`);
      }
      setModal(null);
      await fetchTree();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // ── CRUD: Delete ──
  const handleDelete = async (node) => {
    setApiLoading(true);
    try {
      await apiFetch(`${API}/nodes/${node.id}`, { method: 'DELETE' });
      showToast(`"${node.name}" delete हो गया।`);
      setDeleteTarget(null);
      setSelectedNode(null);
      await fetchTree();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // ── Expand/Collapse all ──
  const getAllIds = (node) => [String(node.id), ...(node.children || []).flatMap(getAllIds)];
  const expandAll   = () => treeData && setExpandedIds(new Set(getAllIds(treeData)));
  const collapseAll = () => treeData && setExpandedIds(new Set([String(treeData.id)]));

  if (loading) {
    return (
      <div className="hierarchy-wrapper" style={{ display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div className="loading-spinner" />
        <p style={{ color:'#64748b', fontSize:14 }}>Database से data load हो रहा है...</p>
      </div>
    );
  }

  return (
    <div className="hierarchy-wrapper" onClick={() => setContextMenu(null)}>

      {/* ── Header ── */}
      <div className="hierarchy-header">
        <div className="hierarchy-title">
          <span>🏛️ Haryana Police — Organizational Hierarchy</span>
          <span className="badge">{nodes.length} units visible</span>
          <span className="badge badge--db">☁️ Neon DB</span>
        </div>
        <div className="hierarchy-legend">
          {Object.entries(levelConfig).map(([level, cfg]) => (
            <div key={level} className="legend-item">
              <div className="legend-dot" style={{ background: cfg.border }} />
              <span>{cfg.icon} {level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="hierarchy-toolbar">
        <button className="toolbar-btn" onClick={expandAll}>⊞ Expand All</button>
        <button className="toolbar-btn" onClick={collapseAll}>⊟ Collapse All</button>
        <button className="toolbar-btn" onClick={fetchTree}>🔄 Refresh</button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn toolbar-btn--hint" style={{ cursor:'default', opacity:0.6 }}>
          🖱️ Right-click to edit
        </button>
      </div>

      {/* ── React Flow ── */}
      <div className="react-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(99,102,241,0.12)" />
          <Controls />
          <MiniMap nodeColor={n => levelConfig[n.data?.level]?.border || '#555'} maskColor="rgba(15,15,26,0.7)" />
        </ReactFlow>
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onAdd={(node) => setModal({ mode: 'add', parentNode: node })}
          onEdit={(node) => setModal({ mode: 'edit', node })}
          onDelete={(node) => setDeleteTarget(node)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <NodeModal
          mode={modal.mode}
          node={modal.node}
          parentNode={modal.parentNode}
          childLevel={modal.mode === 'add' ? getChildLevel(modal.parentNode?.level) : null}
          loading={apiLoading}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          node={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={apiLoading}
        />
      )}

      {/* ── Selected Node Info ── */}
      {selectedNode && !contextMenu && (
        <div className="info-panel" onClick={() => setSelectedNode(null)}>
          <h4>{selectedNode.label}</h4>
          <p><span className="info-label">Level: </span>{selectedNode.level}</p>
          <p><span className="info-label">DB ID: </span>#{selectedNode.dbId}</p>
          <p><span className="info-label">Children: </span>{selectedNode.childCount}</p>
          <p style={{ marginTop:8, color:'#64748b', fontSize:'10px' }}>Click to close • Right-click to edit</p>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
