const fs = require('fs');
const path = require('path');

function pad(n) {
  return n.toString().padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const start = new Date('2026-06-20T08:30:00');
const end = new Date('2026-06-20T12:45:00');
const intervalMs = 2 * 60 * 1000;

let lines = ['时间,温度(℃),湿度(%)'];
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

  const humidity = Math.round(85 + Math.random() * 8);
  lines.push(`${formatDate(date)},${temp.toFixed(1)},${humidity}`);
  current += intervalMs;
  idx++;
}

const outputPath = path.join(__dirname, '温度记录_沪AF8523_20260620.csv');
fs.writeFileSync(outputPath, lines.join('\r\n'), 'utf-8');
console.log(`生成完成，共 ${lines.length - 1} 条记录，保存至: ${outputPath}`);
