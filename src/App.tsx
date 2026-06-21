import { useState, useCallback } from 'react';
import type {
  TransportOrder,
  TemperatureRecord,
  TempZoneStandard,
  TransportNode,
  OverTempInterval,
} from './types';
import {
  parseTransportOrder,
  parseTemperatureRecords,
  parseTempZoneStandard,
  generateNodes,
} from './utils/parser';
import { analyzeTemperature } from './utils/analyzer';
import { sampleOrder, generateSampleRecords, sampleStandard } from './utils/sampleData';
import DropZone from './components/DropZone';
import PreviewPage from './components/PreviewPage';
import QualityPage from './components/QualityPage';
import ReportPage from './components/ReportPage';

type TabType = 'preview' | 'quality' | 'report';

declare global {
  interface Window {
    electronAPI?: {
      saveReport: (data: { content: string; defaultPath?: string }) => Promise<{
        success: boolean;
        filePath?: string;
      }>;
      readFile: (data: { filePath: string }) => Promise<{
        success: boolean;
        content?: string;
        error?: string;
      }>;
    };
  }
}

function App() {
  const [order, setOrder] = useState<TransportOrder | null>(null);
  const [records, setRecords] = useState<TemperatureRecord[]>([]);
  const [standard, setStandard] = useState<TempZoneStandard | null>(null);
  const [nodes, setNodes] = useState<TransportNode[]>([]);
  const [overTempIntervals, setOverTempIntervals] = useState<OverTempInterval[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [carrierConclusion, setCarrierConclusion] = useState<string>(
    '本次运输全程温度控制良好，除必要的装卸货作业外，车厢温度稳定在标准范围内，货物质量安全，符合客户温区要求。'
  );
  const [templateId, setTemplateId] = useState<string>('standard');

  const runAnalysis = useCallback(
    (recs: TemperatureRecord[], std: TempZoneStandard | null) => {
      const result = analyzeTemperature(recs, std);
      setOverTempIntervals(result.overTempIntervals);
    },
    []
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const name = file.name.toLowerCase();
        const keywords = {
          order: ['运单', '运输单', 'order', 'shipment'],
          records: ['温度', '记录', 'temp', 'record', 'log', '数据'],
          standard: ['标准', '温区', 'standard', 'zone'],
        };
        let type: 'order' | 'records' | 'standard' = 'records';
        if (keywords.order.some((k) => name.includes(k))) type = 'order';
        else if (keywords.standard.some((k) => name.includes(k))) type = 'standard';
        else if (keywords.records.some((k) => name.includes(k))) type = 'records';

        if (type === 'order') {
          const parsed = parseTransportOrder(content, file.name);
          if (parsed) {
            setOrder(parsed);
          }
        } else if (type === 'records') {
          const parsed = parseTemperatureRecords(content, file.name);
          if (parsed.length > 0) {
            setRecords(parsed);
            const newNodes = generateNodes(parsed);
            setNodes(newNodes);
            runAnalysis(parsed, standard);
          }
        } else if (type === 'standard') {
          const parsed = parseTempZoneStandard(content, file.name);
          if (parsed) {
            setStandard(parsed);
            runAnalysis(records, parsed);
          }
        }
      };
      reader.readAsText(file);
    },
    [records, standard, runAnalysis]
  );

  const loadSampleData = useCallback(() => {
    setOrder(sampleOrder);
    const recs = generateSampleRecords();
    setRecords(recs);
    setStandard(sampleStandard);
    setNodes(generateNodes(recs));
    runAnalysis(recs, sampleStandard);
  }, [runAnalysis]);

  const hasData = records.length > 0;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'preview', label: '节点预览', icon: '📋' },
    { key: 'quality', label: '质控分析', icon: '🔍' },
    { key: 'report', label: '报告生成', icon: '📄' },
  ];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>❄️</div>
          <div>
            <h1 style={styles.title}>冷链运输温度报告工具</h1>
            <p style={styles.subtitle}>运输凭证整理 · 客诉举证 · 事后交付</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.demoBtn} onClick={loadSampleData}>
            加载示例数据
          </button>
        </div>
      </header>

      {!hasData ? (
        <div style={styles.emptyState}>
          <DropZone onFileUpload={handleFileUpload} onLoadDemo={loadSampleData} />
          <div style={styles.hintBox}>
            <h3 style={styles.hintTitle}>使用说明</h3>
            <ol style={styles.hintList}>
              <li>将 <strong>运输单文件</strong>（运单信息 JSON/CSV）拖入窗口</li>
              <li>将 <strong>温度记录文件</strong>（记录仪导出 CSV/JSON/TXT）拖入窗口</li>
              <li>将 <strong>温区标准文件</strong>（客户要求的温度范围 JSON/CSV）拖入窗口</li>
              <li>在 <em>节点预览</em> 页确认装车、在途、开门、卸货等关键节点</li>
              <li>在 <em>质控分析</em> 页标记超温区间并补充原因说明</li>
              <li>在 <em>报告生成</em> 页选择模板，导出完整温度追踪报告</li>
            </ol>
            <p style={styles.hintTip}>
              💡 也可以点击右上角「加载示例数据」快速体验完整流程
            </p>
          </div>
        </div>
      ) : (
        <div style={styles.content}>
          <aside style={styles.sidebar}>
            <FileStatusCard
              label="运输单"
              filled={!!order}
              detail={order ? `单号：${order.orderNo}` : '未上传'}
            />
            <FileStatusCard
              label="温度记录"
              filled={records.length > 0}
              detail={records.length > 0 ? `共 ${records.length} 条记录` : '未上传'}
            />
            <FileStatusCard
              label="温区标准"
              filled={!!standard}
              detail={standard ? `${standard.minTemp}℃ ~ ${standard.maxTemp}℃` : '未上传'}
            />

            <div style={styles.tabNav}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === tab.key ? styles.tabBtnActive : {}),
                  }}
                >
                  <span style={styles.tabIcon}>{tab.icon}</span>
                  {tab.label}
                  {tab.key === 'quality' && overTempIntervals.length > 0 && (
                    <span style={styles.badge}>{overTempIntervals.length}</span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <main style={styles.main}>
            {activeTab === 'preview' && (
              <PreviewPage
                order={order}
                records={records}
                standard={standard}
                nodes={nodes}
                onNodesChange={setNodes}
              />
            )}
            {activeTab === 'quality' && (
              <QualityPage
                records={records}
                standard={standard}
                overTempIntervals={overTempIntervals}
                onIntervalsChange={setOverTempIntervals}
              />
            )}
            {activeTab === 'report' && (
              <ReportPage
                order={order}
                records={records}
                standard={standard}
                nodes={nodes}
                overTempIntervals={overTempIntervals}
                carrierConclusion={carrierConclusion}
                templateId={templateId}
                onConclusionChange={setCarrierConclusion}
                onTemplateChange={setTemplateId}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function FileStatusCard({
  label,
  filled,
  detail,
}: {
  label: string;
  filled: boolean;
  detail: string;
}) {
  return (
    <div style={{ ...styles.statusCard, borderLeftColor: filled ? '#16a34a' : '#cbd5e1' }}>
      <div style={styles.statusRow}>
        <span style={styles.statusDot} className={filled ? 'ok' : ''}>
          {filled ? '✓' : '○'}
        </span>
        <span style={styles.statusLabel}>{label}</span>
      </div>
      <div style={{ ...styles.statusDetail, color: filled ? '#1f2937' : '#9ca3af' }}>
        {detail}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#f0f2f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    fontSize: 32,
    background: 'rgba(255,255,255,0.15)',
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerRight: { display: 'flex', gap: 10 },
  demoBtn: {
    padding: '8px 16px',
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 60px',
    overflow: 'auto',
  },
  hintBox: {
    marginTop: 30,
    maxWidth: 640,
    background: '#fff',
    padding: '24px 28px',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  hintTitle: { fontSize: 16, marginBottom: 14, color: '#1e3a8a' },
  hintList: { paddingLeft: 22, lineHeight: 2, color: '#4b5563' },
  hintTip: { marginTop: 14, padding: '10px 14px', background: '#fef3c7', borderRadius: 6, color: '#92400e', fontSize: 13 },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: 260,
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flexShrink: 0,
  },
  statusCard: {
    padding: '12px 14px',
    borderRadius: 8,
    background: '#f8fafc',
    borderLeft: '4px solid #cbd5e1',
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { fontSize: 14, color: '#94a3b8', fontWeight: 700, width: 18 },
  statusLabel: { fontSize: 13, fontWeight: 600, color: '#334155' },
  statusDetail: { fontSize: 12, paddingLeft: 26 },
  tabNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    color: '#475569',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  tabIcon: { fontSize: 16 },
  badge: {
    marginLeft: 'auto',
    background: '#dc2626',
    color: '#fff',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 20,
    textAlign: 'center',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: 24,
  },
};

export default App;
