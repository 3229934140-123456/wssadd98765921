import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { TemperatureRecord, TempZoneStandard, OverTempInterval } from '../types';

interface TemperatureChartProps {
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  highlightIntervals?: OverTempInterval[];
  height?: number;
}

function TemperatureChart({
  records,
  standard,
  highlightIntervals = [],
  height = 300,
}: TemperatureChartProps) {
  const data = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((r, idx) => ({
        idx,
        time: r.timestamp.slice(5, 16).replace('T', ' '),
        fullTime: r.timestamp,
        temperature: r.temperature,
        humidity: r.humidity,
      }));
  }, [records]);

  const highlightRefAreas = useMemo(() => {
    if (highlightIntervals.length === 0 || data.length === 0) return [];
    const startTs = new Date(data[0].fullTime).getTime();
    const endTs = new Date(data[data.length - 1].fullTime).getTime();
    const totalSpan = endTs - startTs;
    return highlightIntervals.map((interval) => {
      const intStartTs = new Date(interval.startTime).getTime();
      const intEndTs = new Date(interval.endTime).getTime();
      const x1 = totalSpan > 0 ? ((intStartTs - startTs) / totalSpan) * (data.length - 1) : 0;
      const x2 = totalSpan > 0 ? ((intEndTs - startTs) / totalSpan) * (data.length - 1) : data.length - 1;
      return { id: interval.id, x1: Math.round(x1), x2: Math.round(x2), type: interval.type };
    });
  }, [highlightIntervals, data]);

  const tickInterval = useMemo(() => {
    const len = data.length;
    if (len <= 10) return 1;
    if (len <= 30) return Math.ceil(len / 10);
    if (len <= 100) return Math.ceil(len / 8);
    return Math.ceil(len / 6);
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
        暂无温度数据
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: data.length > 50 ? 800 : '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {standard && (
            <ReferenceArea
              y1={standard.minTemp}
              y2={standard.maxTemp}
              fill="#dcfce7"
              fillOpacity={0.35}
            />
          )}
          {standard && (
            <ReferenceLine
              y={standard.maxTemp}
              stroke="#16a34a"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `上限 ${standard.maxTemp}℃`,
                position: 'right',
                fill: '#16a34a',
                fontSize: 11,
              }}
            />
          )}
          {standard && (
            <ReferenceLine
              y={standard.minTemp}
              stroke="#16a34a"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `下限 ${standard.minTemp}℃`,
                position: 'right',
                fill: '#16a34a',
                fontSize: 11,
              }}
            />
          )}

          {highlightRefAreas.map((area) => (
            <ReferenceArea
              key={area.id}
              x1={area.x1}
              x2={area.x2}
              fill="#fee2e2"
              fillOpacity={0.5}
              stroke="#dc2626"
              strokeOpacity={0.6}
              strokeWidth={1}
            />
          ))}

          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={tickInterval}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}℃`}
            width={55}
          />
          <Tooltip
            formatter={(value: number) => [`${value}℃`, '温度']}
            labelFormatter={(label: any, payload: any) => {
              if (payload?.[0]?.payload?.fullTime) {
                return `时间：${payload[0].payload.fullTime}`;
              }
              return label;
            }}
            contentStyle={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#2563eb"
            strokeWidth={2}
            dot={data.length <= 50}
            r={1.5}
            activeDot={{ r: 5, fill: '#2563eb' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TemperatureChart;
