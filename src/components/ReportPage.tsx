import { useMemo, useState } from 'react';
import type {
  TransportOrder,
  TemperatureRecord,
  TempZoneStandard,
  TransportNode,
  OverTempInterval,
  ReportData,
} from '../types';
import { REPORT_TEMPLATES } from '../types';
import { analyzeTemperature, formatDuration, formatFullTime } from '../utils/analyzer';
import { generateReportHTML } from '../utils/reportGenerator';
import TemperatureChart from './TemperatureChart';

interface ReportPageProps {
  order: TransportOrder | null;
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  nodes: TransportNode[];
  overTempIntervals: OverTempInterval[];
  carrierConclusion: string;
  templateId: string;
  onConclusionChange: (v: string) => void;
  onTemplateChange: (v: string) => void;
}

function ReportPage({
  order,
  records,
  standard,
  nodes,
  overTempIntervals,
  carrierConclusion,
  templateId,
  onConclusionChange,
  onTemplateChange,
}: ReportPageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const analysis = useMemo(
    () => analyzeTemperature(records, standard),
    [records, standard]
  );

  const reportData: ReportData = useMemo(
    () => ({
      order,
      records,
      standard,
      nodes,
      overTempIntervals,
      carrierConclusion,
      templateId,
    }),
    [order, records, standard, nodes, overTempIntervals, carrierConclusion, templateId]
  );

  const allReasonsFilled =
    overTempIntervals.length === 0 ||
    overTempIntervals.every((i) => i.reason.trim().length > 0);

  const handleExport = async () => {
    const html = generateReportHTML(reportData, templateId);
    const defaultName = order?.orderNo
      ? `温度追踪报告_${order.orderNo}.html`
      : '温度追踪报告.html';

    if (window.electronAPI?.saveReport) {
      setExporting(true);
      try {
        const res = await window.electronAPI.saveReport({
          content: html,
          defaultPath: defaultName,
        });
        if (res.success) {
          alert(`报告已保存至：\n${res.filePath}`);
        }
      } finally {
        setExporting(false);
      }
    } else {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const htmlContent = useMemo(
    () => generateReportHTML(reportData, templateId),
    [reportData, templateId]
  );

  return (
    <div style={styles.container}>
      <div>
        <h2 style={styles.pageTitle}>生成报告</h2>
        <p style={styles.pageDesc}>
          选择客户模板，填写承运商结论，生成可发送给货主的完整温度追踪报告
        </p>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 选择报告模板</h3>
            <div style={styles.templateGrid}>
              {REPORT_TEMPLATES.map((t) => (
                <div
                  key={t.id === templateId ? styles.templateActive : styles.template}
                  onClick={() => onTemplateChange(t.id)}
                >
                  <div style={styles.templateHeader}>
                    <div style={styles.templateRadio}>
                      {t.id === templateId ? '◉' : '○'}
                    </div>
                    <div style={styles.templateName}>{t.name}</div>
                  </div>
                  <div style={styles.templateDesc}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 报告核心数据</h3>
            <div style={styles.dataGrid}>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>运输单号</div>
                <div style={styles.dataValue}>{order?.orderNo || '-'}</div>
              </div>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>车牌号</div>
                <div style={styles.dataValue}>{order?.vehicleNo || '-'}</div>
              </div>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>运输时段</div>
                <div style={styles.dataValue}>
                  {order?.startTime || '-'} → {order?.endTime || '-'}
                </div>
              </div>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>温区标准</div>
                <div style={styles.dataValue}>
                  {standard ? `${standard.minTemp}℃ ~ ${standard.maxTemp}℃` : '-'}
                </div>
              </div>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>温度达标率</div>
                <div
                  style={{
                    ...styles.dataValue,
                    color: analysis.complianceRate >= 95 ? '#16a34a' : '#dc2626',
                    fontWeight: 700,
                  }}
                >
                  {analysis.complianceRate}%
                </div>
              </div>
              <div style={styles.dataItem}>
                <div style={styles.dataLabel}>异常次数</div>
                <div
                  style={{
                    ...styles.dataValue,
                    color: overTempIntervals.length > 0 ? '#dc2626' : '#16a34a',
                    fontWeight: 700,
                  }}
                >
                  {overTempIntervals.length} 次
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🌡️ 温度曲线预览</h3>
            <div style={styles.chartBox}>
              <TemperatureChart
                records={records}
                standard={standard}
                highlightIntervals={overTempIntervals}
                height={260}
              />
            </div>
          </div>

          {templateId !== 'simple' && nodes.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📍 节点列表</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>时间</th>
                      <th style={styles.th}>节点</th>
                      <th style={styles.th}>温度</th>
                      <th style={styles.th}>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes
                      .sort(
                        (a, b) =>
                          new Date(a.timestamp).getTime() -
                          new Date(b.timestamp).getTime()
                      )
                      .map((n) => (
                        <tr key={n.id}>
                          <td style={styles.td}>{formatFullTime(n.timestamp)}</td>
                          <td style={styles.td}>{n.name}</td>
                          <td style={styles.td}>
                            {n.temperature !== undefined
                              ? n.temperature + '℃'
                              : '-'}
                          </td>
                          <td style={styles.td}>{n.description || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {overTempIntervals.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>⚠️ 异常记录</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>序号</th>
                      <th style={styles.th}>类型</th>
                      <th style={styles.th}>时段</th>
                      <th style={styles.th}>时长</th>
                      <th style={styles.th}>峰值</th>
                      <th style={styles.th}>原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overTempIntervals.map((o, idx) => (
                      <tr key={o.id}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              color: o.type === 'over_high' ? '#dc2626' : '#2563eb',
                              fontWeight: 600,
                            }}
                          >
                            {o.type === 'over_high' ? '超高温' : '超低温'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {o.startTime.slice(5, 16)} →{' '}
                          {o.endTime.slice(5, 16)}
                        </td>
                        <td style={styles.td}>
                          {formatDuration(o.durationMinutes)}
                        </td>
                        <td style={styles.td}>
                          {o.type === 'over_high'
                            ? o.maxTemperature + '℃'
                            : o.minTemperature + '℃'}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            color: o.reason ? '#1f2937' : '#dc2626',
                          }}
                        >
                          {o.reason || '未填写'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!allReasonsFilled && (
                <div style={styles.warning}>
                  ⚠ 存在未填写原因的异常记录，请先前往质控页补充原因说明
                </div>
              )}
            </div>
          )}

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              📝 承运商结论
            </h3>
            <textarea
                value={carrierConclusion}
                onChange={(e) => onConclusionChange(e.target.value)}
                style={styles.conclusionInput}
                placeholder="请填写承运商结论，说明温度控制总体情况、异常处理措施、货物安全结论等，此内容将出现在报告最终签章处"
              />
            <div style={styles.conclusionHint}>
              💡 该结论将与签章一起出现在报告末页，作为承运商对本次运输的官方说明
            </div>
          </div>
        </div>

        <div style={styles.sideCol}>
          <div style={styles.stickyBox}>
            <div style={styles.actionCard}>
              <div style={styles.actionTitle}>导出操作</div>
              <button
                onClick={() => setPreviewOpen(true)}
                style={{ ...styles.actionBtn, ...styles.actionBtnSecondary }}
              >
                👁️ 预览报告
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                style={styles.actionBtn}
              >
                {exporting ? '导出中...' : '📄 导出 HTML 报告'}
              </button>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>💡 使用说明</div>
                <ul style={styles.tipList}>
                  <li>HTML 报告可直接用浏览器打开并打印为 PDF</li>
                  <li>报告支持 A4 打印版式，可直接发送客户</li>
                  <li>温度曲线、异常说明、签章一应俱全</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div
          style={styles.modalOverlay}
          onClick={() => setPreviewOpen(false)}
        >
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.previewHeader}>
            <div style={styles.previewTitle}>报告预览</div>
            <button onClick={() => setPreviewOpen(false)} style={styles.closeBtn}>
              ✕
            </button>
          </div>
          <div style={styles.previewBody}>
            <iframe
              srcDoc={htmlContent}
              title="report"
              style={styles.iframe}
              sandbox="allow-same-origin"
            />
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b' },
  pageDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  grid: { display: 'flex', gap: 20 },
  mainCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 },
  sideCol: { width: 280, flexShrink: 0 },
  stickyBox: { position: 'sticky', top: 0 },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 14,
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  template: {
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#fafbfc',
  },
  templateActive: {
    padding: '14px',
    border: '2px solid #2563eb',
    borderRadius: 10,
    cursor: 'pointer',
    background: '#eff6ff',
  },
  templateHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  templateRadio: { fontSize: 16, color: '#2563eb', fontWeight: 700 },
  templateName: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  templateDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px 24px',
  },
  dataItem: {},
  dataLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  dataValue: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  chartBox: {
    width: '100%',
    overflowX: 'auto',
    background: '#fafbfc',
    borderRadius: 8,
    padding: 8,
  },
  tableWrap: { overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f1f5f9',
    fontWeight: 600,
    color: '#334155',
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '9px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#374151',
    whiteSpace: 'nowrap',
  },
  warning: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fef3c7',
    borderRadius: 6,
    fontSize: 13,
    color: '#92400e',
  },
  conclusionInput: {
    width: '100%',
    minHeight: 100,
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.7,
    outline: 'none',
    fontFamily: 'inherit',
  },
  conclusionHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  actionCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 14,
    color: '#1e293b',
  },
  actionBtn: {
    width: '100%',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 10,
  },
  actionBtnSecondary: {
    background: '#f1f5f9',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
  },
  tipBox: {
    marginTop: 16,
    padding: 14,
    background: '#f0f9ff',
    borderRadius: 8,
    border: '1px solid #bae6fd',
  },
  tipTitle: { fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 6 },
  tipList: { paddingLeft: 18, fontSize: 12, color: '#0369a1', lineHeight: 1.8 },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  previewModal: {
    width: '92vw',
    height: '92vh',
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  previewHeader: {
    padding: '14px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px 10px',
  },
  previewBody: { flex: 1, background: '#f3f4f6', padding: 16, overflow: 'hidden' },
  iframe: { width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' },
};

export default ReportPage;
