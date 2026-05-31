import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Image,
  ArrowLeft,
  Upload,
  Loader2,
  Sparkles,
  ArrowRight,
  Download,
} from 'lucide-react';

function ImageToComicPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('manga');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const styles = [
    { id: 'manga', label: '日漫风格' },
    { id: 'comic', label: '美漫风格' },
    { id: 'watercolor', label: '水彩风格' },
    { id: 'sketch', label: '素描风格' },
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!uploadedImage) return;
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setProcessedImage('processed');
      setIsProcessing(false);
    }, 4000);
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: 'var(--spacing-md)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>
        <h1>图片转漫画</h1>
        <p>上传照片，AI 将为你转换为精美的漫画风格</p>
      </div>

      {/* Upload Area */}
      {!uploadedImage && (
        <div
          className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="upload-icon">
            <Upload size={48} />
          </div>
          <p>拖拽图片到此处，或点击上传</p>
          <p className="upload-hint">支持 JPG、PNG、WebP 格式，最大 10MB</p>
        </div>
      )}

      {/* Style Selector */}
      {uploadedImage && (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="form-group">
            <label className="form-label">风格选择</label>
            <div className="style-selector">
              {styles.map((style) => (
                <button
                  key={style.id}
                  className={`style-option ${selectedStyle === style.id ? 'active' : ''}`}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Process Button */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleProcess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="spinner" />
                  AI 处理中...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  开始转换
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setUploadedImage(null);
                setProcessedImage(null);
              }}
            >
              重新上传
            </button>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="loading">
              <div className="spinner"></div>
              <span>正在转换图片风格，请稍候...</span>
            </div>
          )}

          {/* Before/After Comparison */}
          {processedImage && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>
                转换结果
              </h3>
              <div className="comparison-view">
                <div>
                  <div className="comparison-panel">
                    <Image size={48} />
                  </div>
                  <p className="comparison-label">原始图片</p>
                </div>
                <div className="comparison-arrow">
                  <ArrowRight size={32} />
                </div>
                <div>
                  <div className="comparison-panel" style={{ borderColor: 'var(--accent-primary)' }}>
                    <Sparkles size={48} />
                  </div>
                  <p className="comparison-label">漫画风格</p>
                </div>
              </div>
              <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)' }}>
                <button className="btn btn-primary">
                  <Download size={18} />
                  下载结果
                </button>
                <button className="btn btn-secondary">
                  进入编辑器
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageToComicPage;
