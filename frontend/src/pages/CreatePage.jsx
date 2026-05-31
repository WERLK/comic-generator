import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, ArrowLeft, Loader2, Coins, AlertCircle, Tv } from 'lucide-react';
import AdModal from '../components/AdModal';

const GENERATION_COST = 10;

function CreatePage() {
  const [storyText, setStoryText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('manga');
  const [panelCount, setPanelCount] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPanels, setGeneratedPanels] = useState([]);

  // 积分相关
  const [pointsBalance, setPointsBalance] = useState(null); // null = 未加载
  const [showAdModal, setShowAdModal] = useState(false);
  const [pointsWarning, setPointsWarning] = useState(false);

  const styles = [
    { id: 'manga', label: '日漫风格' },
    { id: 'comic', label: '美漫风格' },
    { id: 'manhwa', label: '韩漫风格' },
  ];

  const panelCounts = [4, 6, 8, 12];

  // 检查积分是否充足
  const hasEnoughPoints = pointsBalance === null || pointsBalance >= GENERATION_COST;

  const handleGenerate = async () => {
    if (!storyText.trim()) return;

    // 检查积分
    if (!hasEnoughPoints) {
      setPointsWarning(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedPanels([]);
    setPointsWarning(false);

    // Simulate generation
    setTimeout(() => {
      const panels = Array.from({ length: panelCount }, (_, i) => ({
        id: i + 1,
        status: 'generated',
      }));
      setGeneratedPanels(panels);
      setIsGenerating(false);
      // 扣除积分
      if (pointsBalance !== null) {
        setPointsBalance((prev) => prev - GENERATION_COST);
      }
    }, 3000);
  };

  // 广告奖励回调
  const handleAdReward = (reward) => {
    setPointsBalance((prev) => (prev || 0) + (reward || 10));
    setPointsWarning(false);
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          返回首页
        </Link>
        <h1>文字转漫画</h1>
        <p>输入你的故事，AI 将为你生成精美的漫画分镜</p>
      </div>

      {/* 积分消耗提示 */}
      <div className="points-cost-indicator">
        <Coins size={16} />
        <span>消耗 <strong>{GENERATION_COST}</strong> 积分/次</span>
        {pointsBalance !== null && (
          <span className="points-cost-balance">
            余额: {pointsBalance}
          </span>
        )}
        {!hasEnoughPoints && (
          <button
            className="btn btn-sm btn-outline points-earn-btn"
            onClick={() => setShowAdModal(true)}
          >
            <Tv size={14} />
            赚积分
          </button>
        )}
      </div>

      {/* 积分不足警告 */}
      {pointsWarning && (
        <div className="login-error" style={{ marginBottom: 'var(--spacing-md)' }}>
          <AlertCircle size={16} />
          <span>积分不足，需要 {GENERATION_COST} 积分才能生成漫画</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowAdModal(true)}
            style={{ marginLeft: 'auto' }}
          >
            <Tv size={14} />
            看广告赚积分
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid-2">
        {/* Left: Input Controls */}
        <div>
          <div className="form-group">
            <label className="form-label">故事内容</label>
            <textarea
              className="form-textarea"
              placeholder="在这里输入你的故事...\n\n例如：在一个遥远的星球上，少年小明发现了一本神秘的漫画书。当他翻开第一页时，书中的角色竟然活了过来..."
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              rows={10}
            />
          </div>

          <div className="form-group">
            <label className="form-label">画风选择</label>
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

          <div className="form-group">
            <label className="form-label">分镜数量</label>
            <div className="panel-count-selector">
              {panelCounts.map((count) => (
                <button
                  key={count}
                  className={`panel-count-btn ${panelCount === count ? 'active' : ''}`}
                  onClick={() => setPanelCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
            onClick={handleGenerate}
            disabled={!storyText.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="spinner" />
                AI 生成中...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                生成漫画
              </>
            )}
          </button>
        </div>

        {/* Right: Preview */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
            生成预览
          </h3>
          {isGenerating && (
            <div className="loading">
              <div className="spinner"></div>
              <span>正在生成漫画分镜，请稍候...</span>
            </div>
          )}
          {!isGenerating && generatedPanels.length === 0 && (
            <div className="empty-state">
              <Wand2 size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
              <p>输入故事并点击生成按钮<br />AI 将为你创作漫画</p>
            </div>
          )}
          {generatedPanels.length > 0 && (
            <div className="panel-grid">
              {generatedPanels.map((panel) => (
                <div key={panel.id} className="panel-item">
                  分镜 {panel.id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 广告弹窗 */}
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onReward={handleAdReward}
        placement="create_page"
        userId={null}
      />
    </div>
  );
}

export default CreatePage;
