import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { levelConfig } from '../../data/hierarchyData';

const CustomNode = memo(({ data }) => {
  const config = levelConfig[data.level] || levelConfig.PS;
  const hasChildren = data.childCount > 0;

  return (
    <div
      className={`custom-node custom-node--${data.level?.toLowerCase()}`}
      style={{
        background: config.bg,
        border: `1.5px solid ${config.border}`,
        color: config.color,
      }}
      onClick={data.onToggle}
      onContextMenu={data.onContextMenu}
    >
      {/* Left handle (incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: config.border, width: 6, height: 6 }}
      />

      <div className="node-content">
        <span className="node-icon">{config.icon}</span>
        <div className="node-text">
          <span className="node-level">{data.level}</span>
          <span className="node-name">{data.label}</span>
        </div>
        {hasChildren && (
          <span className={`node-toggle ${data.expanded ? 'expanded' : ''}`}>
            {data.expanded ? '−' : '+'}
          </span>
        )}
      </div>

      {/* Right handle (outgoing to children) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: config.border, width: 6, height: 6 }}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;
