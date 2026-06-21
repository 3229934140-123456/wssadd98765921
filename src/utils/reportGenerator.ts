import type { ReportData, TemperatureRecord } from '../types';
import { NODE_TYPE_LABELS } from '../types';
import { formatDuration, formatFullTime } from './analyzer';

export function generateReportHTML(data: ReportData, templateId: string): string {
  const { order, records, standard, nodes, overTempIntervals, carrierConclusion } = data;
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalRecords = sortedRecords.length;
  const avgTemp =
    totalRecords > 0
      ? (sortedRecords.reduce((s, r) => s + r.temperature, 0) / totalRecords).toFixed(2)
      : '0';
  const minTemp =
    totalRecords > 0
      ? Math.min(...sortedRecords.map((r) => r.temperature)).toFixed(2)
      : '0';
  const maxTemp =
    totalRecords > 0
      ? Math.max(...sortedRecords.map((r) => r.temperature)).toFixed(2)
      : '0';
  const overTempCount = overTempIntervals.length;
  const overTempMinutes = overTempIntervals.reduce(
    (acc, i) => acc + i.durationMinutes,
    0
  );
  const complianceRate =
    totalRecords > 0
      ? (
          ((totalRecords - overTempIntervals.reduce((acc, i) => acc + i.recordCount, 0)) /
            totalRecords) *
          100
        ).toFixed(2)
      : '100.00';

  const chartSVG = generateTemperatureChartSVG(sortedRecords, standard);

  const orderHtml = order
    ? `
  <div class="info-grid">
    <div class="info-item"><span class="label">运单号：</span><span class="value">${order.orderNo || '-'}</span></div>
    <div class="info-item"><span class="label">车牌号：</span><span class="value">${order.vehicleNo || '-'}</span></div>
    <div class="info-item"><span class="label">司机：</span><span class="value">${order.driverName || '-'}</span></div>
    <div class="info-item"><span class="label">客户：</span><span class="value">${order.customerName || '-'}</span></div>
    <div class="info-item"><span class="label">货物：</span><span class="value">${order.cargoName || '-'}</span></div>
    <div class="info-item"><span class="label">重量：</span><span class="value">${order.cargoWeight || 0} KG</span></div>
    <div class="info-item"><span class="label">发货地：</span><span class="value">${order.startLocation || '-'}</span></div>
    <div class="info-item"><span class="label">收货地：</span><span class="value">${order.endLocation || '-'}</span></div>
    <div class="info-item"><span class="label">发车时间：</span><span class="value">${order.startTime || '-'}</span></div>
    <div class="info-item"><span class="label">到达时间：</span><span class="value">${order.endTime || '-'}</span></div>
  </div>`
    : '<p style="color:#999;">暂无运输单信息</p>';

  const standardHtml = standard
    ? `<p><strong>温区要求：</strong>${standard.name}（${standard.minTemp}℃ ~ ${standard.maxTemp}℃）${standard.description ? ' - ' + standard.description : ''}</p>`
    : '<p style="color:#999;">暂无温区标准</p>';

  const statsHtml = `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${avgTemp}℃</div>
      <div class="stat-label">平均温度</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${minTemp}℃</div>
      <div class="stat-label">最低温度</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${maxTemp}℃</div>
      <div class="stat-label">最高温度</div>
    </div>
    <div class="stat-card ${Number(complianceRate) < 95 ? 'warning' : ''}">
      <div class="stat-value">${complianceRate}%</div>
      <div class="stat-label">温度达标率</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${overTempCount}</div>
      <div class="stat-label">异常次数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatDuration(overTempMinutes)}</div>
      <div class="stat-label">异常总时长</div>
    </div>
  </div>`;

  const nodesHtml =
    nodes.length > 0
      ? `
  <table class="data-table">
    <thead>
      <tr><th>时间</th><th>节点类型</th><th>节点名称</th><th>温度</th><th>说明</th></tr>
    </thead>
    <tbody>
      ${nodes
        .map(
          (n) => `<tr>
        <td>${formatFullTime(n.timestamp)}</td>
        <td>${NODE_TYPE_LABELS[n.type]}</td>
        <td>${n.name}</td>
        <td>${n.temperature !== undefined ? n.temperature + '℃' : '-'}</td>
        <td>${n.description || '-'}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>`
      : '<p style="color:#999;">暂无节点信息</p>';

  const overTempHtml =
    overTempIntervals.length > 0
      ? `
  <table class="data-table">
    <thead>
      <tr><th>序号</th><th>类型</th><th>开始时间</th><th>结束时间</th><th>持续时长</th><th>峰值温度</th><th>原因说明</th></tr>
    </thead>
    <tbody>
      ${overTempIntervals
        .map(
          (o, idx) => `<tr>
        <td>${idx + 1}</td>
        <td class="${o.type}">${o.type === 'over_high' ? '超高温' : '超低温'}</td>
        <td>${formatFullTime(o.startTime)}</td>
        <td>${formatFullTime(o.endTime)}</td>
        <td>${formatDuration(o.durationMinutes)}</td>
        <td>${o.type === 'over_high' ? o.maxTemperature + '℃' : o.minTemperature + '℃'}</td>
        <td>${o.reason || '待补充'}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>`
      : '<p style="color:#16a34a; font-weight:600;">✓ 本次运输全程温度正常，无超温记录</p>';

  const detailedRecordsHtml =
    templateId === 'detailed' && sortedRecords.length > 0
      ? `
  <h3>逐时温度记录</h3>
  <table class="data-table small">
    <thead>
      <tr><th>时间</th><th>温度</th>${sortedRecords[0].humidity !== undefined ? '<th>湿度</th>' : ''}</tr>
    </thead>
    <tbody>
      ${sortedRecords
        .map(
          (r) => `<tr>
        <td>${formatFullTime(r.timestamp)}</td>
        <td>${r.temperature}℃</td>
        ${r.humidity !== undefined ? '<td>' + r.humidity + '%</td>' : ''}
      </tr>`
        )
        .join('')}
    </tbody>
  </table>`
      : '';

  const title = templateId === 'simple' ? '温度达标情况说明' : '冷链运输温度追踪报告';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #fff;
      color: #1f2937;
      padding: 40px 50px;
      font-size: 14px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 24px;
      color: #1e3a8a;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #6b7280;
      font-size: 13px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section h2 {
      font-size: 16px;
      color: #1e3a8a;
      margin-bottom: 12px;
      padding-left: 10px;
      border-left: 4px solid #2563eb;
    }
    .section h3 {
      font-size: 14px;
      color: #374151;
      margin: 16px 0 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 24px;
      background: #f8fafc;
      padding: 16px 20px;
      border-radius: 6px;
    }
    .info-item { display: flex; }
    .info-item .label { color: #6b7280; width: 80px; flex-shrink: 0; }
    .info-item .value { color: #1f2937; font-weight: 500; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
    }
    .stat-card {
      background: #eff6ff;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #bfdbfe;
    }
    .stat-card.warning {
      background: #fef3c7;
      border-color: #fcd34d;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 4px;
    }
    .stat-card.warning .stat-value { color: #92400e; }
    .stat-label {
      font-size: 12px;
      color: #64748b;
    }
    .chart-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .data-table.small { font-size: 12px; }
    .data-table th {
      background: #f1f5f9;
      color: #334155;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      color: #374151;
    }
    .data-table tr:nth-child(even) td { background: #fafbfc; }
    .data-table td.over_high { color: #dc2626; font-weight: 600; }
    .data-table td.over_low { color: #2563eb; font-weight: 600; }
    .conclusion-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #7dd3fc;
      border-left: 4px solid #0284c7;
      padding: 16px 20px;
      border-radius: 6px;
    }
    .conclusion-box p { white-space: pre-wrap; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
      text-align: right;
    }
    .footer .sign { margin-top: 24px; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .chart-container { overflow: visible; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">Cold Chain Transportation Temperature Report · 报告生成时间：${formatFullTime(new Date().toISOString().replace('T', ' '))}</div>
  </div>

  <div class="section">
    <h2>运输信息</h2>
    ${orderHtml}
    <div style="margin-top: 12px;">${standardHtml}</div>
  </div>

  <div class="section">
    <h2>温度统计概览</h2>
    ${statsHtml}
  </div>

  ${templateId !== 'simple' ? `
  <div class="section">
    <h2>温度曲线</h2>
    <div class="chart-container">${chartSVG}</div>
  </div>` : ''}

  ${templateId !== 'simple' ? `
  <div class="section">
    <h2>运输节点</h2>
    ${nodesHtml}
  </div>` : ''}

  <div class="section">
    <h2>温度异常说明</h2>
    ${overTempHtml}
  </div>

  ${detailedRecordsHtml}

  <div class="section">
    <h2>承运商结论</h2>
    <div class="conclusion-box">
      <p>${carrierConclusion || '本次运输温度控制符合要求，货物质量安全。'}</p>
    </div>
  </div>

  <div class="footer">
    <div class="sign">
      <span>承运商盖章：__________________</span>
      <span>日期：${new Date().toISOString().slice(0, 10)}</span>
    </div>
    <div style="margin-top: 12px;">本报告由冷链温度报告工具自动生成，数据来源于车载温度记录仪</div>
  </div>
</body>
</html>`;
}

function generateTemperatureChartSVG(
  records: TemperatureRecord[],
  standard: { minTemp: number; maxTemp: number } | null
): string {
  if (records.length === 0) {
    return '<div style="padding:40px;text-align:center;color:#999;">暂无温度数据</div>';
  }

  const width = Math.max(900, records.length * 8);
  const height = 320;
  const padding = { top: 30, right: 40, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const temps = records.map((r) => r.temperature);
  let minT = Math.min(...temps);
  let maxT = Math.max(...temps);
  if (standard) {
    minT = Math.min(minT, standard.minTemp - 2);
    maxT = Math.max(maxT, standard.maxTemp + 2);
  }
  minT = Math.floor(minT - 1);
  maxT = Math.ceil(maxT + 1);

  const xScale = (i: number) =>
    padding.left + (records.length > 1 ? (i / (records.length - 1)) * chartW : chartW / 2);
  const yScale = (t: number) =>
    padding.top + ((maxT - t) / (maxT - minT)) * chartH;

  const pathD = records
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(r.temperature).toFixed(1)}`)
    .join(' ');

  const yTicks = 6;
  const yLines: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const t = minT + ((maxT - minT) * i) / yTicks;
    const y = yScale(t);
    yLines.push(
      `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="3,3"/>`
    );
    yLines.push(
      `<text x="${padding.left - 8}" y="${y + 4}" font-size="11" fill="#6b7280" text-anchor="end">${t.toFixed(0)}℃</text>`
    );
  }

  const xLabelCount = Math.min(8, records.length);
  const xLabels: string[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (records.length - 1));
    const r = records[idx];
    const x = xScale(idx);
    const timeStr = r.timestamp.slice(5, 16).replace('T', ' ');
    xLabels.push(
      `<text x="${x}" y="${height - padding.bottom + 20}" font-size="11" fill="#6b7280" text-anchor="middle">${timeStr}</text>`
    );
  }

  let standardBands = '';
  if (standard) {
    const yMin = yScale(standard.minTemp);
    const yMax = yScale(standard.maxTemp);
    standardBands = `
      <rect x="${padding.left}" y="${Math.min(yMin, yMax)}" width="${chartW}" height="${Math.abs(yMax - yMin)}" fill="#dcfce7" opacity="0.4"/>
      <line x1="${padding.left}" y1="${yScale(standard.maxTemp)}" x2="${width - padding.right}" y2="${yScale(standard.maxTemp)}" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="5,3"/>
      <line x1="${padding.left}" y1="${yScale(standard.minTemp)}" x2="${width - padding.right}" y2="${yScale(standard.minTemp)}" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="5,3"/>
      <text x="${width - padding.right - 4}" y="${yScale(standard.maxTemp) - 4}" font-size="10" fill="#16a34a" text-anchor="end">上限 ${standard.maxTemp}℃</text>
      <text x="${width - padding.right - 4}" y="${yScale(standard.minTemp) + 14}" font-size="10" fill="#16a34a" text-anchor="end">下限 ${standard.minTemp}℃</text>
    `;
  }

  const dotPoints = records
    .filter((_, i) => i % Math.max(1, Math.floor(records.length / 60)) === 0)
    .map(
      (r, i) =>
        `<circle cx="${xScale(i * Math.max(1, Math.floor(records.length / 60))).toFixed(1)}" cy="${yScale(r.temperature).toFixed(1)}" r="2" fill="#2563eb"/>`
    )
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${standardBands}
    ${yLines.join('')}
    <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#94a3b8"/>
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#94a3b8"/>
    ${xLabels.join('')}
    <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2"/>
    ${dotPoints}
  </svg>`;
}
