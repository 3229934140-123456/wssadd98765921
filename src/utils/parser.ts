import type {
  TransportOrder,
  TemperatureRecord,
  TempZoneStandard,
  TransportNode,
  NodeType,
} from '../types';

function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function findColumnIndex(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (keywords.some((k) => h.includes(k.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

function normalizeDateTime(value: string): string {
  if (!value) return '';
  let cleaned = value.replace(/\//g, '-').replace(/年|月/g, '-').replace(/日/g, '');
  if (/^\d{4}-\d{1,2}-\d{1,2}\s\d{1,2}:\d{2}$/.test(cleaned)) {
    cleaned += ':00';
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{2}$/.test(cleaned)) {
    cleaned += ':00';
  }
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  return cleaned;
}

export function parseTransportOrder(content: string, fileName: string): TransportOrder | null {
  try {
    if (fileName.endsWith('.json')) {
      const data = JSON.parse(content);
      return {
        orderNo: data.orderNo || data.order_no || data.运单号 || '',
        vehicleNo: data.vehicleNo || data.vehicle_no || data.车牌号 || '',
        driverName: data.driverName || data.driver_name || data.司机 || '',
        cargoName: data.cargoName || data.cargo_name || data.货物名称 || '',
        cargoWeight: Number(data.cargoWeight || data.cargo_weight || data.重量 || 0),
        startLocation: data.startLocation || data.start_location || data.发货地 || '',
        endLocation: data.endLocation || data.end_location || data.收货地 || '',
        startTime: normalizeDateTime(data.startTime || data.start_time || data.发车时间 || ''),
        endTime: normalizeDateTime(data.endTime || data.end_time || data.到达时间 || ''),
        customerName: data.customerName || data.customer_name || data.客户 || '',
        remark: data.remark || data.备注,
      };
    }
    if (fileName.endsWith('.csv')) {
      const rows = parseCSV(content);
      if (rows.length < 2) return null;
      const headers = rows[0];
      const data: Record<string, string> = {};
      rows.slice(1).forEach((row) => {
        row.forEach((val, i) => {
          if (headers[i]) data[headers[i]] = val;
        });
      });
      const getVal = (keys: string[]) => keys.map((k) => data[k]).find(Boolean) || '';
      return {
        orderNo: getVal(['运单号', 'orderNo', 'order_no']),
        vehicleNo: getVal(['车牌号', 'vehicleNo', 'vehicle_no']),
        driverName: getVal(['司机', 'driverName', 'driver_name']),
        cargoName: getVal(['货物名称', 'cargoName', 'cargo_name']),
        cargoWeight: Number(getVal(['重量', 'cargoWeight', 'cargo_weight'])) || 0,
        startLocation: getVal(['发货地', 'startLocation', 'start_location']),
        endLocation: getVal(['收货地', 'endLocation', 'end_location']),
        startTime: normalizeDateTime(getVal(['发车时间', 'startTime', 'start_time'])),
        endTime: normalizeDateTime(getVal(['到达时间', 'endTime', 'end_time'])),
        customerName: getVal(['客户', 'customerName', 'customer_name']),
        remark: getVal(['备注', 'remark']),
      };
    }
    return null;
  } catch (e) {
    console.error('解析运输单失败:', e);
    return null;
  }
}

export function parseTemperatureRecords(content: string, fileName: string): TemperatureRecord[] {
  try {
    if (fileName.endsWith('.json')) {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : data.records || data.data || [];
      return arr
        .map((r: any) => ({
          timestamp: normalizeDateTime(r.timestamp || r.time || r.时间 || ''),
          temperature: Number(r.temperature ?? r.temp ?? r.温度 ?? NaN),
          humidity: r.humidity ?? r.湿度 ? Number(r.humidity ?? r.湿度) : undefined,
          sensorId: r.sensorId || r.sensor_id || r.传感器,
        }))
        .filter((r: TemperatureRecord) => r.timestamp && !isNaN(r.temperature));
    }
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const rows = parseCSV(content);
      if (rows.length < 2) return [];
      const headers = rows[0];
      const timeIdx = findColumnIndex(headers, ['时间', 'time', 'timestamp', 'datetime', 'date']);
      const tempIdx = findColumnIndex(headers, ['温度', 'temp', 'temperature']);
      const humIdx = findColumnIndex(headers, ['湿度', 'humidity', 'hum']);
      if (timeIdx === -1 || tempIdx === -1) return [];
      return rows
        .slice(1)
        .map((row) => ({
          timestamp: normalizeDateTime(row[timeIdx] || ''),
          temperature: Number(row[tempIdx] || NaN),
          humidity: humIdx >= 0 ? Number(row[humIdx]) || undefined : undefined,
        }))
        .filter((r) => r.timestamp && !isNaN(r.temperature));
    }
    return [];
  } catch (e) {
    console.error('解析温度记录失败:', e);
    return [];
  }
}

export function parseTempZoneStandard(content: string, fileName: string): TempZoneStandard | null {
  try {
    if (fileName.endsWith('.json')) {
      const data = JSON.parse(content);
      return {
        name: data.name || data.名称 || '标准温区',
        minTemp: Number(data.minTemp ?? data.min_temp ?? data.最低温度 ?? -25),
        maxTemp: Number(data.maxTemp ?? data.max_temp ?? data.最高温度 ?? -18),
        description: data.description || data.说明,
      };
    }
    if (fileName.endsWith('.csv')) {
      const rows = parseCSV(content);
      if (rows.length < 2) return null;
      const headers = rows[0];
      const data: Record<string, string> = {};
      rows.slice(1).forEach((row) => {
        row.forEach((val, i) => {
          if (headers[i]) data[headers[i]] = val;
        });
      });
      const getVal = (keys: string[]) => keys.map((k) => data[k]).find(Boolean) || '';
      return {
        name: getVal(['名称', 'name']) || '标准温区',
        minTemp: Number(getVal(['最低温度', 'minTemp', 'min_temp'])) || -25,
        maxTemp: Number(getVal(['最高温度', 'maxTemp', 'max_temp'])) || -18,
        description: getVal(['说明', 'description']),
      };
    }
    return null;
  } catch (e) {
    console.error('解析温区标准失败:', e);
    return null;
  }
}

export function generateNodes(records: TemperatureRecord[]): TransportNode[] {
  if (records.length === 0) return [];
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const nodes: TransportNode[] = [];
  const start = sorted[0];
  const end = sorted[sorted.length - 1];

  nodes.push({
    id: 'node-' + Date.now() + '-1',
    type: 'loading',
    name: '装车',
    timestamp: start.timestamp,
    description: '货物装车，运输开始',
    temperature: start.temperature,
  });

  nodes.push({
    id: 'node-' + Date.now() + '-2',
    type: 'in_transit',
    name: '在途运输',
    timestamp: new Date(new Date(start.timestamp).getTime() + 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, ''),
    description: '正常运输途中',
  });

  if (sorted.length > 20) {
    const midIdx = Math.floor(sorted.length / 2);
    const mid = sorted[midIdx];
    nodes.push({
      id: 'node-' + Date.now() + '-3',
      type: 'door_open',
      name: '临时开门',
      timestamp: mid.timestamp,
      description: '运输途中开门作业',
      temperature: mid.temperature,
    });
  }

  nodes.push({
    id: 'node-' + Date.now() + '-4',
    type: 'unloading',
    name: '开始卸货',
    timestamp: new Date(new Date(end.timestamp).getTime() - 30 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, ''),
    description: '车辆到达，开始卸货作业',
  });

  nodes.push({
    id: 'node-' + Date.now() + '-5',
    type: 'arrival',
    name: '运输完成',
    timestamp: end.timestamp,
    description: '卸货完成，运输结束',
    temperature: end.temperature,
  });

  return nodes.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function generateNodeId(): string {
  return 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export function generateIntervalId(): string {
  return 'interval-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}
