import type { TransportOrder, TemperatureRecord, TempZoneStandard } from '../types';

export const sampleOrder: TransportOrder = {
  orderNo: 'CC2026062000891',
  vehicleNo: '沪A·F8523冷',
  driverName: '张建国',
  cargoName: '进口冷冻牛肉',
  cargoWeight: 18500,
  startLocation: '上海洋山港冷库',
  endLocation: '苏州工业园区普洛斯物流园',
  startTime: '2026-06-20 08:30:00',
  endTime: '2026-06-20 12:45:00',
  customerName: '苏州某食品有限公司',
  remark: '全程要求-18℃以下',
};

export function generateSampleRecords(): TemperatureRecord[] {
  const records: TemperatureRecord[] = [];
  const start = new Date('2026-06-20T08:30:00');
  const end = new Date('2026-06-20T12:45:00');
  const intervalMs = 2 * 60 * 1000;
  let current = start.getTime();
  let idx = 0;

  while (current <= end.getTime()) {
    const date = new Date(current);
    const hours = date.getHours() + date.getMinutes() / 60;
    let temp = -20 + Math.sin(idx / 15) * 0.8 + (Math.random() - 0.5) * 0.6;

    if (hours > 9.2 && hours < 9.35) {
      temp = -16 + (hours - 9.2) * 30 + Math.random() * 0.5;
    }
    if (hours > 10.1 && hours < 10.25) {
      temp = -17 + (hours - 10.1) * 40 + Math.random() * 0.5;
    }
    if (hours > 11.8 && hours < 11.95) {
      temp = -15 + (hours - 11.8) * 50 + Math.random() * 0.5;
    }

    records.push({
      timestamp: date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ''),
      temperature: Number(temp.toFixed(1)),
      humidity: Math.round(85 + Math.random() * 8),
    });
    current += intervalMs;
    idx++;
  }
  return records;
}

export const sampleStandard: TempZoneStandard = {
  name: '冷冻冷藏标准',
  minTemp: -25,
  maxTemp: -18,
  description: '进口冷冻肉类要求全程-18℃以下',
};
