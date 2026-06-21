import { useState } from 'react';
import type {
  TransportOrder,
  TemperatureRecord,
  TempZoneStandard,
  TransportNode,
  NodeType,
} from '../types';
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '../types';
import { generateNodeId } from '../utils/parser';
import { formatFullTime } from '../utils/analyzer';

interface PreviewPageProps {
  order: TransportOrder | null;
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  nodes: TransportNode[];
  onNodesChange: (nodes: TransportNode[]) => void;
}

function PreviewPage({ order, records, standard, nodes, onNodesChange }: PreviewPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNode, setNewNode] = useState<Partial<TransportNode>>({
    type: 'custom',
    name: '',
    timestamp: '',
    description: '',
  });

  const sortedNodes = [...nodes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const updateNode = (id: string, updates: Partial<TransportNode>) => {
    onNodesChange(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNode = (id: string) => {
    onNodesChange(nodes.filter((n) => n.id !== id));
  };

  const addNode = () => {
    if (!newNode.timestamp || !newNode.name) return;
    const type = (newNode.type as NodeType) || 'custom';
    const node: TransportNode = {
      id: generateNodeId(),
      type,
      name: newNode.name || NODE_TYPE_LABELS[type],
      timestamp: newNode.timestamp,
      description: newNode.description || '',
    };
    onNodesChange([...nodes, node]);
    setShowAddModal(false);
    setNewNode({ type: 'custom', name: '', timestamp: '', description: '' });
  };

  const totalRecords = records.length;
  const startTime = totalRecords > 0 ? records[0]?.timestamp : '';
  const endTime = totalRecords > 0 ? records[totalRecords - 1]?.timestamp : '';

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.pageTitle}>运输节点预览</h2>
          <p style={styles.pageDesc}>
            按时间顺序确认装车、在途、开门、卸货等关键节点，可逐条修正名称或补充说明
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
          ➕ 添加节点
        </button>
      </div>

      <div style={styles.summaryCards}>
        <SummaryCard label="运输单号" value={order?.orderNo || '-'} />
        <SummaryCard label="车牌号" value={order?.vehicleNo || '-'} />
        <SummaryCard label="客户" value={order?.customerName || '-'} />
        <SummaryCard
          label="温区要求"
          value={standard ? `${standard.minTemp}℃ ~ ${standard.maxTemp}℃` : '-'}
        />
        <SummaryCard label="记录总数" value={`${totalRecords} 条`} />
        <SummaryCard
          label="运输时长"
          value={startTime && endTime ? calcDuration(startTime, endTime) : '-'}
        />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📌 关键节点时间轴</h3>
        <div style={styles.timeline}>
          {sortedNodes.map((node, idx) => {
            const color = NODE_TYPE_COLORS[node.type];
            const isEditing = editingId === node.id;
            return (
              <div key={node.id} style={styles.timelineItem}>
                <div style={styles.timelineLeft}>
                  <div
                    style={{
                      ...styles.timelineDot,
                      background: color,
                      boxShadow: `0 0 0 4px ${color}22`,
                    }}
                  />
                  {idx < sortedNodes.length - 1 && <div style={styles.timelineLine} />}
                </div>
                <div style={{ ...styles.timelineContent, borderLeftColor: color }}>
                  {isEditing ? (
                    <div style={styles.editForm}>
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>节点类型：</label>
                        <select
                          value={node.type}
                          onChange={(e) =>
                            updateNode(node.id, {
                              type: e.target.value as NodeType,
                              name: NODE_TYPE_LABELS[e.target.value as NodeType] || node.name,
                            })
                          }
                          style={styles.select}
                        >
                          {(Object.keys(NODE_TYPE_LABELS) as NodeType[]).map((t) => (
                            <option key={t} value={t}>
                              {NODE_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>节点名称：</label>
                        <input
                          value={node.name}
                          onChange={(e) => updateNode(node.id, { name: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>时间：</label>
                        <input
                          value={node.timestamp}
                          onChange={(e) => updateNode(node.id, { timestamp: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>说明：</label>
                        <textarea
                          value={node.description}
                          onChange={(e) => updateNode(node.id, { description: e.target.value })}
                          style={{ ...styles.input, minHeight: 60 }}
                        />
                      </div>
                      <div style={styles.editActions}>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ ...styles.btn, ...styles.btnPrimary }}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => deleteNode(node.id)}
                          style={{ ...styles.btn, ...styles.btnDanger }}
                        >
                          删除节点
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.nodeHeader}>
                        <span style={{ ...styles.nodeTypeTag, background: `${color}1a`, color }}>
                          {NODE_TYPE_LABELS[node.type]}
                        </span>
                        <span style={styles.nodeTime}>{formatFullTime(node.timestamp)}</span>
                        {node.temperature !== undefined && (
                          <span style={styles.nodeTemp}>🌡️ {node.temperature}℃</span>
                        )}
                      </div>
                      <div style={styles.nodeName}>{node.name}</div>
                      {node.description && (
                        <div style={styles.nodeDesc}>{node.description}</div>
                      )}
                      <button
                        onClick={() => setEditingId(node.id)}
                        style={styles.editBtn}
                      >
                        ✏️ 编辑
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {sortedNodes.length === 0 && (
            <div style={styles.empty}>暂无节点数据，点击右上角「添加节点」手动添加</div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>添加运输节点</h3>
            <div style={styles.editRow}>
              <label style={styles.editLabel}>节点类型：</label>
              <select
                value={newNode.type || 'custom'}
                onChange={(e) =>
                  setNewNode({
                    ...newNode,
                    type: e.target.value as NodeType,
                    name: NODE_TYPE_LABELS[e.target.value as NodeType],
                  })
                }
                style={styles.select}
              >
                {(Object.keys(NODE_TYPE_LABELS) as NodeType[]).map((t) => (
                  <option key={t} value={t}>
                    {NODE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.editRow}>
              <label style={styles.editLabel}>节点名称：</label>
              <input
                value={newNode.name || ''}
                onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                placeholder="输入节点名称"
                style={styles.input}
              />
            </div>
            <div style={styles.editRow}>
              <label style={styles.editLabel}>时间：</label>
              <input
                value={newNode.timestamp || ''}
                onChange={(e) => setNewNode({ ...newNode, timestamp: e.target.value })}
                placeholder="如：2026-06-20 09:30:00"
                style={styles.input}
              />
            </div>
            <div style={styles.editRow}>
              <label style={styles.editLabel}>说明：</label>
              <textarea
                value={newNode.description || ''}
                onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
                placeholder="补充详细说明（可选）"
                style={{ ...styles.input, minHeight: 60 }}
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowAddModal(false)} style={{ ...styles.btn }}>
                取消
              </button>
              <button
                onClick={addNode}
                style={{ ...styles.btn, ...styles.btnPrimary }}
                disabled={!newNode.timestamp || !newNode.name}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function calcDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}分钟`;
  return `${Math.floor(mins / 60)}小时${mins % 60}分钟`;
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b' },
  pageDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  addBtn: {
    padding: '10px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 12,
  },
  summaryCard: {
    background: '#fff',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
  },
  summaryLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: 600, color: '#1e293b' },
  section: { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#1e293b' },
  timeline: { paddingLeft: 10 },
  timelineItem: { display: 'flex', gap: 14 },
  timelineLeft: {
    width: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    background: '#e5e7eb',
    margin: '4px 0',
  },
  timelineContent: {
    flex: 1,
    marginBottom: 16,
    padding: '14px 16px',
    background: '#fafbfc',
    borderRadius: 10,
    borderLeft: '4px solid #2563eb',
  },
  nodeHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  nodeTypeTag: { padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  nodeTime: { fontSize: 13, color: '#64748b', fontFamily: 'monospace' },
  nodeTemp: { fontSize: 12, color: '#0891b2', fontWeight: 600 },
  nodeName: { fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 },
  nodeDesc: { fontSize: 13, color: '#475569', lineHeight: 1.6 },
  editBtn: {
    marginTop: 8,
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12,
    color: '#475569',
  },
  editForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  editRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  editLabel: { width: 80, fontSize: 13, color: '#475569', paddingTop: 6, flexShrink: 0 },
  input: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  select: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    background: '#fff',
  },
  editActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  btn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnPrimary: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  btnDanger: { background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' },
  empty: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 480,
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1e293b' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
};

export default PreviewPage;
