export interface TransportOrder {
  orderNo: string;
  vehicleNo: string;
  driverName: string;
  cargoName: string;
  cargoWeight: number;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  customerName: string;
  remark?: string;
}

export interface TemperatureRecord {
  timestamp: string;
  temperature: number;
  humidity?: number;
  sensorId?: string;
}

export interface TempZoneStandard {
  name: string;
  minTemp: number;
  maxTemp: number;
  description?: string;
}

export type NodeType =
  | 'loading'
  | 'in_transit'
  | 'door_open'
  | 'unloading'
  | 'arrival'
  | 'custom';

export interface TransportNode {
  id: string;
  type: NodeType;
  name: string;
  timestamp: string;
  description: string;
  temperature?: number;
}

export type OverTempType = 'over_high' | 'over_low';

export interface OverTempInterval {
  id: string;
  type: OverTempType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxTemperature?: number;
  minTemperature?: number;
  avgTemperature?: number;
  reason: string;
  recordCount: number;
}

export interface ReportData {
  order: TransportOrder | null;
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  nodes: TransportNode[];
  overTempIntervals: OverTempInterval[];
  carrierConclusion: string;
  templateId: string;
}

export interface AppState {
  order: TransportOrder | null;
  records: TemperatureRecord[];
  standard: TempZoneStandard | null;
  nodes: TransportNode[];
  overTempIntervals: OverTempInterval[];
  activeTab: 'preview' | 'quality' | 'report';
  carrierConclusion: string;
  templateId: string;
}

export interface FileUploadInfo {
  type: 'order' | 'records' | 'standard';
  fileName: string;
  fileSize: number;
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  loading: '装车',
  in_transit: '在途',
  door_open: '开门',
  unloading: '卸货',
  arrival: '到达',
  custom: '自定义',
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  loading: '#2563eb',
  in_transit: '#16a34a',
  door_open: '#f59e0b',
  unloading: '#7c3aed',
  arrival: '#059669',
  custom: '#6b7280',
};

export const OVERTEMP_REASON_PRESETS = [
  '排队卸货等待',
  '临时开门盘点',
  '设备预冷不足',
  '装卸货时间过长',
  '交通拥堵延误',
  '冷库设施异常',
  '客户要求停留',
  '其他（请在下方说明）',
];

export const REPORT_TEMPLATES = [
  {
    id: 'standard',
    name: '标准模板',
    description: '包含完整温度曲线、节点列表、异常统计和承运商结论',
  },
  {
    id: 'simple',
    name: '简洁模板',
    description: '突出温度达标情况和关键结论，适合快速交付',
  },
  {
    id: 'detailed',
    name: '详细模板',
    description: '包含逐时温度数据、完整异常分析和详细节点说明',
  },
];
