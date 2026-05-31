import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Download,
  ArrowLeft,
  Sparkles,
  Loader2,
  Plus,
  Minus,
  Clock,
  Film,
  Layers,
  Settings,
  Music,
  Monitor,
  ImagePlus,
  Trash2,
  GripVertical,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  ZoomIn,
  ChevronRight,
  X,
  Mic,
  Pause,
  Coins,
  Tv,
} from 'lucide-react';
import { createVideo, getVideoStatus, generateSpeech, generateBGM, mixAudio } from '../api';
import AdModal from '../components/AdModal';

/**
 * VideoPage - 视频漫剧生成页面
 *
 * 功能：
 * - 页面序列管理（排序、添加、删除）
 * - 单页设置（时长、转场、Ken Burns 效果）
 * - 全局设置（分辨率、帧率、背景音乐）
 * - 视频生成与进度追踪
 * - 视频预览与下载
 */

// ============ 常量定义 ============

// 转场效果选项
const TRANSITIONS = [
  { id: 'fade', label: '淡入淡出' },
  { id: 'slide-left', label: '左滑入' },
  { id: 'slide-right', label: '右滑入' },
  { id: 'zoom', label: '缩放' },
  { id: 'none', label: '无' },
];

// 分辨率选项
const RESOLUTIONS = [
  { id: '1080p', label: '1080p', desc: '1920x1080' },
  { id: '720p', label: '720p', desc: '1280x720' },
  { id: '480p', label: '480p', desc: '854x480' },
];

// 帧率选项
const FRAME_RATES = [
  { id: 24, label: '24 fps' },
  { id: 30, label: '30 fps' },
  { id: 60, label: '60 fps' },
];

// 状态文本映射
const STATUS_TEXT = {
  pending: '准备中',
  processing: '处理中',
  completed: '完成',
  failed: '失败',
};

// 状态图标映射
const STATUS_ICON = {
  pending: Loader2,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
};

// 模拟页面数据（实际项目中应从 API 获取）
const DEMO_PAGES = [
  { id: 1, imageUrl: '/placeholder-page-1.jpg', label: '第 1 页', dialogue: '你好，欢迎来到我们的世界！' },
  { id: 2, imageUrl: '/placeholder-page-2.jpg', label: '第 2 页', dialogue: '这个秘密已经隐藏了千年...' },
  { id: 3, imageUrl: '/placeholder-page-3.jpg', label: '第 3 页', dialogue: '我们必须在日落之前找到答案。' },
  { id: 4, imageUrl: '/placeholder-page-4.jpg', label: '第 4 页', dialogue: '看！那边有一道光！' },
  { id: 5, imageUrl: '/placeholder-page-5.jpg', label: '第 5 页', dialogue: '终于，真相大白了。' },
  { id: 6, imageUrl: '/placeholder-page-6.jpg', label: '第 6 页', dialogue: '我们的冒险才刚刚开始...' },
];

// 音色选项
const VOICE_OPTIONS = [
  { id: 'male1', label: '男声1' },
  { id: 'female1', label: '女声1' },
  { id: 'male2', label: '男声2' },
  { id: 'female2', label: '女声2' },
  { id: 'narrator', label: '旁白' },
];

// BGM 情绪选项
const BGM_MOODS = [
  { id: 'epic', label: '史诗' },
  { id: 'calm', label: '平静' },
  { id: 'happy', label: '欢快' },
  { id: 'sad', label: '悲伤' },
  { id: 'tense', label: '紧张' },
];

// BGM 风格选项
const BGM_GENRES = [
  { id: 'orchestral', label: '管弦乐' },
  { id: 'electronic', label: '电子' },
  { id: 'piano', label: '钢琴' },
  { id: 'ambient', label: '氛围' },
];

function VideoPage() {
  const { projectId } = useParams();

  // ============ 页面序列状态 ============
  const [pages, setPages] = useState(() =>
    DEMO_PAGES.map((p) => ({
      ...p,
      duration: 3,
      transition: 'fade',
      kenBurns: false,
    }))
  );
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // ============ 全局设置状态 ============
  const [resolution, setResolution] = useState('1080p');
  const [frameRate, setFrameRate] = useState(24);
  const [backgroundMusic, setBackgroundMusic] = useState(null);
  const [musicName, setMusicName] = useState('');

  // ============ 生成状态 ============
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null); // pending | processing | completed | failed
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // ============ UI 状态 ============
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // ============ 积分相关 ============
  const [pointsBalance, setPointsBalance] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [pointsWarning, setPointsWarning] = useState(false);
  const VIDEO_COST = 20;

  // ============ 音频配置状态 ============
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [pageVoiceovers, setPageVoiceovers] = useState(() =>
    DEMO_PAGES.map((p) => ({
      text: p.dialogue || '',
      voice: 'narrator',
      speed: 1.0,
      audioUrl: null,
      isGenerating: false,
    }))
  );
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const [bgmMood, setBgmMood] = useState('epic');
  const [bgmGenre, setBgmGenre] = useState('orchestral');
  const [showBgmOptions, setShowBgmOptions] = useState(false);
  const [isGeneratingBgm, setIsGeneratingBgm] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(70);
  const [speechVolume, setSpeechVolume] = useState(100);
  const [duckBgm, setDuckBgm] = useState(true);

  // 轮询定时器引用
  const pollingRef = useRef(null);
  // 拖拽状态
  const dragItemRef = useRef(null);

  // 当前选中的页面
  const selectedPage = pages[selectedPageIndex] || null;

  // 计算总时长
  const totalDuration = pages.reduce((sum, p) => sum + p.duration, 0);

  // ============ 轮询任务状态 ============
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') {
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await getVideoStatus(jobId);
        const data = res.data || res;

        setStatus(data.status);
        setProgress(data.progress);

        if (data.status === 'completed') {
          setVideoUrl(data.videoUrl);
          clearInterval(pollingRef.current);
        } else if (data.status === 'failed') {
          setError(data.error || '视频生成失败');
          clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.error('查询视频状态失败:', err);
      }
    }, 1500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId, status]);

  // ============ 预估剩余时间 ============
  const estimatedTimeRemaining = (() => {
    if (!startTime || !status || status === 'completed' || status === 'failed') return null;
    const elapsed = (Date.now() - startTime) / 1000;
    if (progress <= 0) return '计算中...';
    const total = elapsed / (progress / 100);
    const remaining = Math.max(0, total - elapsed);
    if (remaining < 60) return `约 ${Math.round(remaining)} 秒`;
    return `约 ${Math.round(remaining / 60)} 分 ${Math.round(remaining % 60)} 秒`;
  })();

  // ============ 事件处理函数 ============

  /**
   * 开始生成视频
   */
  const handleGenerate = async () => {
    if (pages.length === 0) return;

    // 检查积分
    const hasEnough = pointsBalance === null || pointsBalance >= VIDEO_COST;
    if (!hasEnough) {
      setPointsWarning(true);
      return;
    }
    setPointsWarning(false);

    try {
      // 扣除积分
      if (pointsBalance !== null) {
        setPointsBalance((prev) => prev - VIDEO_COST);
      }

      // 重置状态
      setStatus('pending');
      setProgress(0);
      setVideoUrl(null);
      setError(null);
      setStartTime(Date.now());

      // 构建请求数据
      const requestData = {
        pages: pages.map((p) => ({
          imageUrl: p.imageUrl,
          duration: p.duration,
          transition: p.transition,
        })),
        options: {
          resolution,
          fps: frameRate,
          backgroundMusic: !!backgroundMusic,
        },
      };

      const res = await createVideo(requestData);
      const data = res.data || res;

      setJobId(data.jobId);
      setStatus(data.status);
    } catch (err) {
      console.error('创建视频任务失败:', err);
      setError('创建视频任务失败，请稍后重试');
      setStatus('failed');
    }
  };

  /**
   * 添加页面到序列
   */
  const handleAddPage = () => {
    const newId = Math.max(0, ...pages.map((p) => p.id)) + 1;
    const newPage = {
      id: newId,
      imageUrl: `/placeholder-page-${newId}.jpg`,
      label: `第 ${pages.length + 1} 页`,
      duration: 3,
      transition: 'fade',
      kenBurns: false,
    };
    setPages([...pages, newPage]);
    setSelectedPageIndex(pages.length);
  };

  /**
   * 从序列中移除页面
   */
  const handleRemovePage = (index) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  /**
   * 更新选中页面的设置
   */
  const updateSelectedPage = (key, value) => {
    setPages((prev) =>
      prev.map((p, i) => (i === selectedPageIndex ? { ...p, [key]: value } : p))
    );
  };

  /**
   * 拖拽开始
   */
  const handleDragStart = (e, index) => {
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * 拖拽经过
   */
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  /**
   * 拖拽离开
   */
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  /**
   * 放置（完成拖拽排序）
   */
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    const sourceIndex = dragItemRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const newPages = [...pages];
    const [movedPage] = newPages.splice(sourceIndex, 1);
    newPages.splice(targetIndex, 0, movedPage);
    setPages(newPages);

    // 更新选中索引
    if (selectedPageIndex === sourceIndex) {
      setSelectedPageIndex(targetIndex);
    }

    dragItemRef.current = null;
  };

  /**
   * 处理背景音乐上传
   */
  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackgroundMusic(file);
      setMusicName(file.name);
    }
  };

  /**
   * 移除背景音乐
   */
  const handleRemoveMusic = () => {
    setBackgroundMusic(null);
    setMusicName('');
  };

  /**
   * 复制分享链接
   */
  const handleShare = () => {
    const link = videoUrl ? `${window.location.origin}${videoUrl}` : window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /**
   * 下载视频
   */
  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `comic_video_${jobId}.mp4`;
      link.click();
    }
  };

  // ============ 音频处理函数 ============

  /**
   * 更新指定页面的配音设置
   */
  const updatePageVoiceover = (pageIndex, key, value) => {
    setPageVoiceovers((prev) =>
      prev.map((v, i) => (i === pageIndex ? { ...v, [key]: value } : v))
    );
  };

  /**
   * 生成单页语音
   */
  const handleGenerateSpeech = async (pageIndex) => {
    const voiceover = pageVoiceovers[pageIndex];
    if (!voiceover.text.trim()) return;

    updatePageVoiceover(pageIndex, 'isGenerating', true);

    try {
      const res = await generateSpeech({
        text: voiceover.text,
        voice: voiceover.voice,
        speed: voiceover.speed,
      });
      const data = res.data || res;
      updatePageVoiceover(pageIndex, 'audioUrl', data.audioUrl);
    } catch (err) {
      console.error('生成语音失败:', err);
    } finally {
      updatePageVoiceover(pageIndex, 'isGenerating', false);
    }
  };

  /**
   * 播放/暂停配音音频
   */
  const handlePlayPauseAudio = (pageIndex) => {
    const voiceover = pageVoiceovers[pageIndex];
    if (!voiceover.audioUrl) return;

    if (playingAudioIndex === pageIndex) {
      setPlayingAudioIndex(null);
    } else {
      setPlayingAudioIndex(pageIndex);
      // 模拟播放（实际应使用 Audio API）
      setTimeout(() => setPlayingAudioIndex(null), voiceover.text.length * 200);
    }
  };

  /**
   * AI 生成背景音乐
   */
  const handleGenerateBgm = async () => {
    setIsGeneratingBgm(true);
    try {
      const res = await generateBGM({
        mood: bgmMood,
        genre: bgmGenre,
        duration: totalDuration,
      });
      const data = res.data || res;
      setBackgroundMusic(data.bgmUrl);
      setMusicName(`AI 生成 - ${bgmMood}_${bgmGenre}`);
    } catch (err) {
      console.error('生成背景音乐失败:', err);
    } finally {
      setIsGeneratingBgm(false);
    }
  };

  // ============ 渲染 ============
  return (
    <div className="page">
      {/* 页面标题 */}
      <div className="page-header">
        <Link
          to={`/editor/${projectId}`}
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
          返回编辑器
        </Link>
        <h1>视频漫剧</h1>
        <p>将漫画页面转换为动态视频，添加转场效果与背景音乐</p>
      </div>

      {/* 积分消耗提示 */}
      <div className="points-cost-indicator">
        <Coins size={16} />
        <span>消耗 <strong>{VIDEO_COST}</strong> 积分/次</span>
        {pointsBalance !== null && (
          <span className="points-cost-balance">
            余额: {pointsBalance}
          </span>
        )}
      </div>

      {/* 积分不足警告 */}
      {pointsWarning && (
        <div className="login-error" style={{ marginBottom: 'var(--spacing-md)' }}>
          <AlertCircle size={16} />
          <span>积分不足，需要 {VIDEO_COST} 积分才能生成视频</span>
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

      {/* 页面序列区域 */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
            }}
          >
            <Layers size={16} />
            页面序列
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({pages.length} 页，拖拽排序)
            </span>
          </h3>
          <button className="btn btn-sm btn-secondary" onClick={handleAddPage}>
            <ImagePlus size={14} />
            添加页面
          </button>
        </div>

        {/* 水平可滚动缩略图条 */}
        <div
          className="video-page-strip"
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            overflowX: 'auto',
            padding: 'var(--spacing-sm) 0',
            minHeight: '140px',
          }}
        >
          {pages.map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => setSelectedPageIndex(index)}
              style={{
                flexShrink: 0,
                width: '100px',
                position: 'relative',
                cursor: 'grab',
              }}
            >
              {/* 缩略图卡片 */}
              <div
                style={{
                  width: '100px',
                  height: '120px',
                  background:
                    selectedPageIndex === index
                      ? 'var(--bg-card-hover)'
                      : 'var(--bg-card)',
                  border:
                    selectedPageIndex === index
                      ? '2px solid var(--accent-primary)'
                      : dragOverIndex === index
                      ? '2px dashed var(--accent-highlight)'
                      : '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                  overflow: 'hidden',
                }}
              >
                {/* 拖拽手柄 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                  }}
                >
                  <GripVertical size={12} />
                </div>

                {/* 页面序号 */}
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  {index + 1}
                </span>

                {/* 模拟缩略图 */}
                <div
                  style={{
                    width: '60px',
                    height: '70px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Film size={20} style={{ color: 'var(--text-muted)' }} />
                </div>

                {/* 时长标签 */}
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  {page.duration}s
                </span>
              </div>

              {/* 删除按钮 */}
              {pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePage(index);
                  }}
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.6rem',
                    padding: 0,
                    opacity: 0.8,
                    transition: 'opacity var(--transition-fast)',
                  }}
                  title="移除页面"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 主内容区域：设置 + 预览 */}
      <div className="video-layout">
        {/* 左侧：页面设置 + 全局设置 */}
        <div>
          {/* 选中页面设置面板 */}
          {selectedPage && (
            <div
              className="video-settings"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <Settings size={16} />
                第 {selectedPageIndex + 1} 页设置
              </h3>

              {/* 时长滑块 */}
              <div className="form-group">
                <label className="form-label">
                  <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  持续时间：{selectedPage.duration} 秒
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1s</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={selectedPage.duration}
                    onChange={(e) => updateSelectedPage('duration', parseFloat(e.target.value))}
                    style={{
                      flex: 1,
                      accentColor: 'var(--accent-primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>10s</span>
                </div>
              </div>

              {/* 转场效果 */}
              <div className="form-group">
                <label className="form-label">
                  <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  转场效果
                </label>
                <select
                  className="form-select"
                  value={selectedPage.transition}
                  onChange={(e) => updateSelectedPage('transition', e.target.value)}
                >
                  {TRANSITIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ken Burns 效果开关 */}
              <div className="form-group">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ZoomIn size={14} />
                    Ken Burns 效果（缓慢缩放平移）
                  </span>
                  <div
                    onClick={() => updateSelectedPage('kenBurns', !selectedPage.kenBurns)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: selectedPage.kenBurns
                        ? 'var(--accent-primary)'
                        : 'var(--border-color)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: selectedPage.kenBurns ? '22px' : '2px',
                        transition: 'left var(--transition-fast)',
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ===== 音频配置区域 ===== */}
          <div
            className="audio-section"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <Volume2 size={16} />
              音频配置
            </h3>

            {/* 配音设置 */}
            <div className="form-group">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  <Mic size={14} />
                  配音设置
                </span>
                <div
                  onClick={() => setVoiceoverEnabled(!voiceoverEnabled)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: voiceoverEnabled
                      ? 'var(--accent-primary)'
                      : 'var(--border-color)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '2px',
                      left: voiceoverEnabled ? '22px' : '2px',
                      transition: 'left var(--transition-fast)',
                    }}
                  />
                </div>
              </label>
            </div>

            {voiceoverEnabled && (
              <div className="voiceover-list" style={{ marginTop: 'var(--spacing-sm)' }}>
                {pages.map((page, index) => {
                  const voiceover = pageVoiceovers[index] || { text: '', voice: 'narrator', speed: 1.0, audioUrl: null, isGenerating: false };
                  return (
                    <div
                      key={page.id}
                      className="voiceover-item"
                      style={{
                        padding: 'var(--spacing-md)',
                        background: selectedPageIndex === index ? 'var(--bg-card-hover)' : 'var(--bg-input)',
                        border: selectedPageIndex === index ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-sm)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 'var(--spacing-sm)',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          第 {index + 1} 页
                        </span>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                          {voiceover.audioUrl && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handlePlayPauseAudio(index)}
                              title={playingAudioIndex === index ? '暂停' : '播放'}
                            >
                              {playingAudioIndex === index ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGenerateSpeech(index)}
                            disabled={voiceover.isGenerating || !voiceover.text.trim()}
                          >
                            {voiceover.isGenerating ? (
                              <Loader2 size={12} className="spinner" />
                            ) : (
                              <Mic size={12} />
                            )}
                            {voiceover.isGenerating ? '生成中' : '生成语音'}
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="form-textarea"
                        placeholder="输入配音文本..."
                        value={voiceover.text}
                        onChange={(e) => updatePageVoiceover(index, 'text', e.target.value)}
                        rows={2}
                        style={{ minHeight: '60px', fontSize: '0.85rem' }}
                      />

                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--spacing-md)',
                          alignItems: 'center',
                          marginTop: 'var(--spacing-sm)',
                        }}
                      >
                        {/* 音色选择 */}
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                            音色
                          </label>
                          <select
                            className="form-select"
                            value={voiceover.voice}
                            onChange={(e) => updatePageVoiceover(index, 'voice', e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                          >
                            {VOICE_OPTIONS.map((v) => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* 语速滑块 */}
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                            语速：{voiceover.speed.toFixed(1)}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={voiceover.speed}
                            onChange={(e) => updatePageVoiceover(index, 'speed', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      {/* 音频波形指示器 */}
                      {voiceover.audioUrl && (
                        <div
                          className="audio-waveform"
                          style={{
                            marginTop: 'var(--spacing-sm)',
                            height: '24px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 var(--spacing-sm)',
                            gap: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          {Array.from({ length: 30 }, (_, i) => (
                            <div
                              key={i}
                              style={{
                                width: '3px',
                                height: `${Math.max(4, Math.random() * 20)}px`,
                                background: playingAudioIndex === index ? 'var(--accent-primary)' : 'var(--text-muted)',
                                borderRadius: '2px',
                                opacity: playingAudioIndex === index ? 0.8 : 0.4,
                                transition: 'height 0.2s ease',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 背景音乐设置 */}
            <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
              <label className="form-label">
                <Music size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                背景音乐设置
              </label>

              {/* AI 生成 BGM 按钮 */}
              <button
                className="btn btn-sm btn-outline"
                style={{ marginBottom: 'var(--spacing-sm)' }}
                onClick={() => setShowBgmOptions(!showBgmOptions)}
              >
                <Sparkles size={14} />
                AI 生成背景音乐
              </button>

              {showBgmOptions && (
                <div
                  className="bgm-options"
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-sm)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        情绪
                      </label>
                      <div className="style-selector">
                        {BGM_MOODS.map((m) => (
                          <button
                            key={m.id}
                            className={`style-option ${bgmMood === m.id ? 'active' : ''}`}
                            onClick={() => setBgmMood(m.id)}
                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      风格
                    </label>
                    <div className="style-selector">
                      {BGM_GENRES.map((g) => (
                        <button
                          key={g.id}
                          className={`style-option ${bgmGenre === g.id ? 'active' : ''}`}
                          onClick={() => setBgmGenre(g.id)}
                          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      marginBottom: 'var(--spacing-sm)',
                    }}
                  >
                    <span>自动时长</span>
                    <span style={{ color: 'var(--text-primary)' }}>{totalDuration} 秒</span>
                  </div>

                  <button
                    className="btn btn-sm btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleGenerateBgm}
                    disabled={isGeneratingBgm}
                  >
                    {isGeneratingBgm ? (
                      <>
                        <Loader2 size={14} className="spinner" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        生成
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 保留原有上传功能 */}
              {musicName ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--spacing-sm)',
                  }}
                >
                  <Volume2 size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {musicName}
                  </span>
                  <button
                    onClick={handleRemoveMusic}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                    }}
                    title="移除音乐"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-input)',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    marginTop: 'var(--spacing-sm)',
                  }}
                >
                  <VolumeX size={16} />
                  或上传音频文件
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* 音频混合设置 */}
            <div
              className="audio-mixer"
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginTop: 'var(--spacing-md)',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <Volume2 size={14} />
                音频混合设置
              </h4>

              {/* 语音优先开关 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>语音优先（自动降低 BGM）</span>
                <div
                  onClick={() => setDuckBgm(!duckBgm)}
                  style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: duckBgm ? 'var(--accent-primary)' : 'var(--border-color)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '2px',
                      left: duckBgm ? '20px' : '2px',
                      transition: 'left var(--transition-fast)',
                    }}
                  />
                </div>
              </div>

              {/* BGM 音量 */}
              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  <span>BGM 音量</span>
                  <span>{bgmVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              {/* 语音音量 */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  <span>语音音量</span>
                  <span>{speechVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={speechVolume}
                  onChange={(e) => setSpeechVolume(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* 全局设置 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <Monitor size={16} />
              全局设置
            </h3>

            {/* 分辨率 */}
            <div className="form-group">
              <label className="form-label">输出分辨率</label>
              <div className="style-selector">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.id}
                    className={`style-option ${resolution === r.id ? 'active' : ''}`}
                    onClick={() => setResolution(r.id)}
                  >
                    <span style={{ display: 'block', fontWeight: 600 }}>{r.label}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7 }}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 帧率 */}
            <div className="form-group">
              <label className="form-label">帧率</label>
              <div className="style-selector">
                {FRAME_RATES.map((f) => (
                  <button
                    key={f.id}
                    className={`style-option ${frameRate === f.id ? 'active' : ''}`}
                    onClick={() => setFrameRate(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 背景音乐 - 已移至音频配置区域 */}

            {/* 总时长显示 */}
            <div
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 2,
                }}
              >
                <span>总页数</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pages.length} 页</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 2,
                }}
              >
                <span>预计时长</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {totalDuration} 秒
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 2,
                }}
              >
                <span>分辨率</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{resolution}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 2,
                }}
              >
                <span>帧率</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{frameRate} fps</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览 + 生成 */}
        <div>
          {/* 视频预览区域 */}
          <div className="video-preview-area" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {status === 'processing' || status === 'pending' ? (
              /* 生成中状态 */
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div
                  className="spinner"
                  style={{ margin: '0 auto var(--spacing-md)', width: '48px', height: '48px' }}
                />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  {STATUS_TEXT[status] || '处理中'}...
                </p>

                {/* 进度条 */}
                <div
                  style={{
                    width: '80%',
                    maxWidth: '400px',
                    margin: '0 auto var(--spacing-sm)',
                    height: '8px',
                    background: 'var(--bg-input)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'var(--accent-gradient)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>

                <p style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 700 }}>
                  {progress}%
                </p>

                {/* 预估剩余时间 */}
                {estimatedTimeRemaining && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'var(--spacing-sm)' }}>
                    预计剩余时间：{estimatedTimeRemaining}
                  </p>
                )}
              </div>
            ) : status === 'completed' && videoUrl ? (
              /* 完成状态 - 视频播放器 */
              <div style={{ width: '100%', height: '100%' }}>
                <video
                  src={videoUrl}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-lg)',
                    background: '#000',
                  }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            ) : status === 'failed' ? (
              /* 失败状态 */
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <XCircle
                  size={48}
                  style={{ color: 'var(--accent-primary)', marginBottom: 'var(--spacing-md)' }}
                />
                <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  视频生成失败
                </p>
                {error && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</p>
                )}
              </div>
            ) : (
              /* 初始状态 */
              <div style={{ textAlign: 'center' }}>
                <Film
                  size={64}
                  style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}
                />
                <p style={{ color: 'var(--text-muted)' }}>配置参数后点击生成</p>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
            onClick={handleGenerate}
            disabled={status === 'processing' || status === 'pending' || pages.length === 0}
          >
            {status === 'processing' || status === 'pending' ? (
              <>
                <Loader2 size={20} className="spinner" />
                生成中...
              </>
            ) : (
              <>
                <Play size={20} />
                生成视频
              </>
            )}
          </button>

          {/* 完成后的操作按钮 */}
          {status === 'completed' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={handleDownload}
              >
                <Download size={18} />
                下载视频
              </button>
              <button
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={handleShare}
              >
                {copied ? <CheckCircle size={18} /> : <Share2 size={18} />}
                {copied ? '已复制' : '分享链接'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 广告弹窗 */}
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onReward={(reward) => {
          setPointsBalance((prev) => (prev || 0) + (reward || 10));
          setPointsWarning(false);
        }}
        placement="video_page"
        userId={null}
      />
    </div>
  );
}

export default VideoPage;
