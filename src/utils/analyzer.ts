import type {
  TemperatureRecord,
  TempZoneStandard,
  OverTempInterval,
  OverTempType,
} from '../types';
import { generateIntervalId } from './parser';

export interface AnalysisResult {
  overTempIntervals: OverTempInterval[];
  totalRecords: number;
  overTempCount: number;
  overTempDurationMinutes: number;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  complianceRate: number;
}

export function analyzeTemperature(
  records: TemperatureRecord[],
  standard: TempZoneStandard | null
): AnalysisResult {
  const result: AnalysisResult = {
    overTempIntervals: [],
    totalRecords: records.length,
    overTempCount: 0,
    overTempDurationMinutes: 0,
    avgTemperature: 0,
    minTemperature: Infinity,
    maxTemperature: -Infinity,
    complianceRate: 100,
  };

  if (records.length === 0) {
    result.minTemperature = 0;
    result.maxTemperature = 0;
    return result;
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let sum = 0;
  sorted.forEach((r) => {
    sum += r.temperature;
    if (r.temperature < result.minTemperature) result.minTemperature = r.temperature;
    if (r.temperature > result.maxTemperature) result.maxTemperature = r.temperature;
  });
  result.avgTemperature = Number((sum / sorted.length).toFixed(2));

  if (!standard) return result;

  let currentInterval: {
    type: OverTempType | null;
    records: TemperatureRecord[];
  } = { type: null, records: [] };

  sorted.forEach((record) => {
    const isOverHigh = record.temperature > standard.maxTemp;
    const isOverLow = record.temperature < standard.minTemp;
    const isOverTemp = isOverHigh || isOverLow;
    const currentType: OverTempType | null = isOverHigh
      ? 'over_high'
      : isOverLow
      ? 'over_low'
      : null;

    if (isOverTemp) {
      if (currentInterval.type === currentType && currentInterval.records.length > 0) {
        currentInterval.records.push(record);
      } else {
        if (currentInterval.records.length > 0) {
          result.overTempIntervals.push(buildInterval(currentInterval));
        }
        currentInterval = { type: currentType, records: [record] };
      }
    } else {
      if (currentInterval.records.length > 0) {
        result.overTempIntervals.push(buildInterval(currentInterval));
        currentInterval = { type: null, records: [] };
      }
    }
  });

  if (currentInterval.records.length > 0) {
    result.overTempIntervals.push(buildInterval(currentInterval));
  }

  result.overTempIntervals = result.overTempIntervals.filter((i) => i.recordCount > 0);
  result.overTempCount = result.overTempIntervals.reduce(
    (acc, i) => acc + i.recordCount,
    0
  );
  result.overTempDurationMinutes = result.overTempIntervals.reduce(
    (acc, i) => acc + i.durationMinutes,
    0
  );
  result.complianceRate =
    result.totalRecords > 0
      ? Number(((1 - result.overTempCount / result.totalRecords) * 100).toFixed(2))
      : 100;

  return result;
}

function buildInterval(data: {
  type: OverTempType | null;
  records: TemperatureRecord[];
}): OverTempInterval {
  const records = data.records;
  const start = records[0];
  const end = records[records.length - 1];
  const startMs = new Date(start.timestamp).getTime();
  const endMs = new Date(end.timestamp).getTime();
  const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

  let maxTemp: number | undefined;
  let minTemp: number | undefined;
  let sum = 0;

  records.forEach((r) => {
    sum += r.temperature;
    if (maxTemp === undefined || r.temperature > maxTemp) maxTemp = r.temperature;
    if (minTemp === undefined || r.temperature < minTemp) minTemp = r.temperature;
  });

  return {
    id: generateIntervalId(),
    type: data.type || 'over_high',
    startTime: start.timestamp,
    endTime: end.timestamp,
    durationMinutes,
    maxTemperature: Number(maxTemp?.toFixed(2)),
    minTemperature: Number(minTemp?.toFixed(2)),
    avgTemperature: Number((sum / records.length).toFixed(2)),
    reason: '',
    recordCount: records.length,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

export function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatFullTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
