import { useMemo } from 'react';
import type {
  TemperatureRecord,
  TempZoneStandard,
  OverTempInterval,
} from '../types';
import { OVERTEMP_REASON_PRESETS } from '../types';
import { formatDuration, formatFullTime, analyzeTemperature } from '../utils/analyzer';
import TemperatureChart from './TemperatureChart';

interface QualityPageProps {
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  overTempIntervals: OverTempInterval[];
  onIntervalsChange: (intervals: OverTempInterval[]) => void;
}

function QualityPage({
  records,
  standard,
  overTempIntervals,
  onIntervalsChange,
}: QualityPageProps) {
  const analysis = useMemo(
    () => analyzeTemperature(records, standard),
    [records, standard]
  );

  const updateIntervalReason = (id: string, reason: string) => {
    onIntervalsChange(
      overTempIntervals.map((i) => (i.id === id ? { ...i, reason } : i))
    );
  };

  const stats = [
    { label: '总记录数', value: `${analysis.totalRecords} 条`, color: '#1e3a8a' },
    {
      label: '平均温度',
      value: `${analysis.avgTemperature}℃`,
      color: '#2563eb',
    },
    {
      label: '最低温度',
      value: `${analysis.minTemperature}℃`,
      color: '#0891b2',
    },
    {
      label: '最高温度',
      value: `${analysis.maxTemperature}℃`,
      color: '#ea580c',
    },
    {
      label: '温度达标率',
      value: `${analysis.complianceRate}%`,
      color: analysis.complianceRate >= 95 ? '#16a34a' : '#dc2626',
    },
    {
      label: '异常次数',
      value: `${overTempIntervals.length} 次`,
      color: overTempIntervals.length > 0 ? '#dc2626' : '#16a34a',
    },
  ];

  const allReasonsFilled =
    overTempIntervals.length === 0 ||
    overTempIntervals.every((i) => i.reason.trim().length > 0);

  return (
    <div style={styles.container}>
      <div>
        <h2 style={styles.pageTitle}>质控分析</h2>
        <p style={styles.pageDesc}>
          自动标出超温区间，显示起止时间、持续时长和极值温度，为每个异常添加原因说明
        </p>
      </div>

      <div style={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>🌡️ 温度曲线（标注超温区间）</h3>
        <div style={styles.chartWrap}>
          <TemperatureChart
            records={records}
            standard={standard}
            highlightIntervals={overTempIntervals}
            height={300}
          />
        </div>
        {standard && (
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendColor, background: '#dcfce7' }} />
              标准温区（{standard.minTemp}℃ ~ {standard.maxTemp}℃）
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendColor, background: '#dc2626' }} />
              超温异常区间
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>
            ⚠️ 超温异常记录 <span style={styles.count}>({overTempIntervals.length})</span>
          </h3>
          {overTempIntervals.length > 0 && (
            <div
              style={{
                ...styles.statusTag,
                background: allReasonsFilled ? '#dcfce7' : '#fef3c7',
                color: allReasonsFilled ? '#166534' : '#92400e',
              }}
            >
              {allReasonsFilled ? '✓ 全部已填写原因' : '⚠ 请为所有异常补充原因说明'}
            </div>
          )}
        </div>

        {overTempIntervals.length === 0 ? (
          <div style={styles.allGood}>
            <div style={styles.goodIcon}>✅</div>
            <div style={styles.goodTitle}>本次运输全程温度正常</div>
            <div style={styles.goodDesc}>
              所有温度记录均在标准范围内，未检测到超温异常
            </div>
          </div>
        ) : (
          <div style={styles.intervalList}>
            {overTempIntervals.map((interval, idx) => {
              const isHigh = interval.type === 'over_high';
              return (
                <div
                  key={interval.id}
                  style={{
                    ...styles.intervalCard,
                    borderLeftColor: isHigh ? '#dc2626' : '#2563eb',
                  }}
                >
                  <div style={styles.intervalHeader}>
                    <div
                      style={{
                        ...styles.intervalBadge,
                        background: isHigh ? '#fee2e2' : '#dbeafe',
                        color: isHigh ? '#991b1b' : '#1e40af',
                      }}
                    >
                      #{idx + 1} {isHigh ? '🔺 超高温' : '🔻 超低温'}
                    </div>
                    <div style={styles.intervalTime}>
                      {formatFullTime(interval.startTime)}
                      <span style={styles.timeSep}>→</span>
                      {formatFullTime(interval.endTime)}
                    </div>
                  </div>

                  <div style={styles.metricsRow}>
                    <MetricItem
                      label="持续时长"
                      value={formatDuration(interval.durationMinutes)}
                    />
                    <MetricItem
                      label="记录点数"
                      value={`${interval.recordCount} 点`}
                    />
                    <MetricItem
                      label={isHigh ? '峰值温度' : '谷值温度'}
                      value={
                        isHigh
                          ? `${interval.maxTemperature}℃`
                          : `${interval.minTemperature}℃`
                      }
                      highlight={isHigh ? 'danger' : 'warn'}
                    />
                    <MetricItem
                      label="平均温度"
                      value={`${interval.avgTemperature}℃`}
                    />
                  </div>

                  <div style={styles.reasonSection}>
                    <div style={styles.reasonLabel}>
                      📝 原因说明
                      <span style={styles.required}>*</span>
                    </div>
                    <div style={styles.reasonPresets}>
                      {OVERTEMP_REASON_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => updateIntervalReason(interval.id, preset)}
                          style={{
                            ...styles.presetBtn,
                            ...(interval.reason === preset
                              ? styles.presetBtnActive
                              : {}),
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={interval.reason}
                      onChange={(e) =>
                        updateIntervalReason(interval.id, e.target.value)
                      }
                      placeholder="请详细说明超温原因，如具体场景、持续原因、已采取的措施等，便于向客户举证说明"
                      style={{
                        ...styles.reasonTextarea,
                        borderColor: interval.reason.trim() ? '#cbd5e1' : '#fca5a5',
                      }}
                    />
                    {!interval.reason.trim() && (
                      <div style={styles.reasonHint}>
                        ⚠ 请填写原因说明，该内容将出现在最终报告中
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'danger' | 'warn';
}) {
  const color =
    highlight === 'danger' ? '#dc2626' : highlight === 'warn' ? '#d97706' : '#1e293b';
  return (
    <div style={styles.metricItem}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b' },
  pageDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 12,
  },
  statCard: {
    background: '#fff',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  statValue: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748b' },
  chartSection: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb',
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#1e293b', display: 'inline' },
  count: { color: '#dc2626', fontSize: 13, marginLeft: 6 },
  chartWrap: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: 8,
    background: '#fafbfc',
    padding: 10,
  },
  legend: { display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' },
  legendColor: { width: 28, height: 14, borderRadius: 3, border: '1px solid #d1d5db' },
  section: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTag: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  allGood: {
    padding: '40px 20px',
    textAlign: 'center',
    background: '#f0fdf4',
    borderRadius: 10,
    border: '1px solid #bbf7d0',
  },
  goodIcon: { fontSize: 48, marginBottom: 10 },
  goodTitle: { fontSize: 18, fontWeight: 700, color: '#166534', marginBottom: 4 },
  goodDesc: { fontSize: 13, color: '#4ade80' },
  intervalList: { display: 'flex', flexDirection: 'column', gap: 14 },
  intervalCard: {
    padding: '16px 18px',
    background: '#fafbfc',
    borderRadius: 10,
    borderLeft: '4px solid #dc2626',
  },
  intervalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalBadge: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
  },
  intervalTime: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  timeSep: { color: '#94a3b8' },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    padding: '10px 0',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 14,
  },
  metricItem: { textAlign: 'center' },
  metricLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: 700 },
  reasonSection: {},
  reasonLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 8,
  },
  required: { color: '#dc2626', marginLeft: 2 },
  reasonPresets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetBtn: {
    padding: '4px 12px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    fontSize: 12,
    color: '#475569',
    cursor: 'pointer',
  },
  presetBtnActive: {
    background: '#dbeafe',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  reasonTextarea: {
    width: '100%',
    minHeight: 60,
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.6,
    outline: 'none',
    fontFamily: 'inherit',
  },
  reasonHint: { fontSize: 12, color: '#dc2626', marginTop: 6 },
};

export default QualityPage;
