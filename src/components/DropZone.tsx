import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface DropZoneProps {
  onFileUpload: (file: File) => void;
  onLoadDemo: () => void;
}

function DropZone({ onFileUpload, onLoadDemo }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => onFileUpload(file));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => onFileUpload(file));
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClick = () => inputRef.current?.click();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        ...styles.dropZone,
        ...(isDragOver ? styles.dropZoneActive : {}),
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.json,.txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div style={styles.uploadIcon}>{isDragOver ? '📥' : '📂'}</div>
      <div style={styles.uploadTitle}>
        {isDragOver ? '释放即可上传' : '拖入文件到此处'}
      </div>
      <div style={styles.uploadSubtitle}>
        支持 CSV / JSON / TXT 格式，或 <span style={styles.link}>点击选择文件</span>
      </div>
      <div style={styles.fileChips}>
        <span style={styles.chip}>📄 运输单文件</span>
        <span style={styles.chip}>🌡️ 温度记录文件</span>
        <span style={styles.chip}>❄️ 温区标准文件</span>
      </div>
      <div style={styles.divider}>
        <span>或</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLoadDemo();
        }}
        style={styles.demoInlineBtn}
      >
        ⚡ 快速加载示例数据体验
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dropZone: {
    width: '100%',
    maxWidth: 720,
    border: '3px dashed #93c5fd',
    borderRadius: 20,
    background: '#fff',
    padding: '50px 40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropZoneActive: {
    borderColor: '#2563eb',
    background: '#eff6ff',
    transform: 'scale(1.02)',
  },
  uploadIcon: { fontSize: 56, marginBottom: 18 },
  uploadTitle: { fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 },
  uploadSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  link: { color: '#2563eb', textDecoration: 'underline', fontWeight: 500 },
  fileChips: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    padding: '6px 14px',
    background: '#f1f5f9',
    borderRadius: 16,
    fontSize: 12,
    color: '#475569',
  },
  divider: {
    margin: '28px 0 20px',
    position: 'relative',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
  },
  demoInlineBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
  },
};

export default DropZone;
