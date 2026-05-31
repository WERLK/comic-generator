import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  Coins,
  Loader2,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { fetchAd, verifyAd } from '../api';

/**
 * AdModal - 广告弹窗组件
 *
 * 支持激励视频广告流程：
 * 1. 展示广告内容 + 倒计时
 * 2. 倒计时结束后显示领取奖励按钮
 * 3. 领取后显示成功动画
 *
 * Props:
 * - isOpen: 是否显示弹窗
 * - onClose: 关闭回调
 * - onReward: 领取奖励回调 (rewardAmount) => void
 * - placement: 广告位置标识
 * - userId: 用户 ID
 */
function AdModal({ isOpen, onClose, onReward, placement = 'default', userId }) {
  const [phase, setPhase] = useState('idle'); // idle | watching | claimable | claimed
  const [countdown, setCountdown] = useState(5);
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(10);
  const [newBalance, setNewBalance] = useState(null);
  const timerRef = useRef(null);

  // 加载广告数据
  const loadAd = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAd(placement);
      const data = res.data || res;
      setAdData(data);
      setRewardAmount(data.reward || 10);
    } catch (err) {
      console.error('加载广告失败:', err);
      // 使用 mock 数据
      setAdData({
        id: 'mock_ad_1',
        title: '发现更多创作可能',
        description: '升级到专业版，解锁更多 AI 漫画风格和高级编辑功能',
        reward: 10,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      });
      setRewardAmount(10);
    } finally {
      setLoading(false);
    }
  }, [placement]);

  // 弹窗打开时加载广告并开始倒计时
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setCountdown(5);
      setNewBalance(null);
      loadAd().then(() => {
        setPhase('watching');
      });
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, loadAd]);

  // 倒计时逻辑
  useEffect(() => {
    if (phase === 'watching' && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setPhase('claimable');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, countdown]);

  // 领取奖励
  const handleClaim = async () => {
    try {
      const res = await verifyAd({
        adId: adData?.id,
        placement,
      });
      const data = res.data || res;
      setNewBalance(data.newBalance || null);
    } catch (err) {
      console.error('验证广告失败:', err);
    }

    setPhase('claimed');
    if (onReward) {
      onReward(rewardAmount);
    }

    // 2 秒后自动关闭
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  // 关闭弹窗
  const handleClose = () => {
    if (phase === 'watching') {
      // 观看中不允许关闭
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  const progressPercent = phase === 'watching' ? ((5 - countdown) / 5) * 100 : 100;

  return (
    <div className="ad-modal-overlay" onClick={handleClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        {phase !== 'watching' && (
          <button className="ad-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        )}

        {/* 广告标识 */}
        <div className="ad-badge">
          <Tag size={10} />
          广告
        </div>

        {loading ? (
          <div className="ad-modal-loading">
            <Loader2 size={32} className="spinner" />
            <span>加载广告中...</span>
          </div>
        ) : (
          <>
            {/* 广告内容卡片 */}
            <div
              className="ad-card"
              style={{
                background: adData?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <div className="ad-card-content">
                <h3 className="ad-card-title">{adData?.title || '发现更多创作可能'}</h3>
                <p className="ad-card-description">
                  {adData?.description || '升级到专业版，解锁更多 AI 漫画风格和高级编辑功能'}
                </p>
                <button className="ad-card-link">
                  了解更多 <ExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* 倒计时 / 领取 / 成功 */}
            <div className="ad-modal-footer">
              {phase === 'watching' && (
                <>
                  <div className="ad-countdown-text">
                    <Clock size={16} />
                    请观看 {countdown} 秒后领取奖励
                  </div>
                  <div className="ad-progress-bar">
                    <div
                      className="ad-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </>
              )}

              {phase === 'claimable' && (
                <button className="btn ad-claim-btn" onClick={handleClaim}>
                  <Coins size={20} />
                  领取奖励
                  <span className="ad-reward-amount">+{rewardAmount} 积分</span>
                </button>
              )}

              {phase === 'claimed' && (
                <div className="ad-claimed-content">
                  <div className="ad-claimed-icon">
                    <CheckCircle size={48} />
                  </div>
                  <div className="ad-claimed-text">奖励已领取</div>
                  <div className="ad-claimed-reward">+{rewardAmount} 积分</div>
                  {newBalance !== null && (
                    <div className="ad-claimed-balance">当前余额: {newBalance} 积分</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * BannerAd - 横幅广告组件（内联展示）
 *
 * Props:
 * - placement: 广告位置标识
 * - onClose: 关闭回调
 */
export function BannerAd({ placement = 'banner', onClose }) {
  const [adData, setAdData] = useState(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const loadBannerAd = async () => {
      try {
        const res = await fetchAd(placement);
        const data = res.data || res;
        setAdData(data);
      } catch (err) {
        setAdData({
          id: 'mock_banner',
          title: '限时活动：邀请好友赢取积分',
          description: '每成功邀请一位好友注册，双方各得 50 积分',
          gradient: 'linear-gradient(90deg, #e94560 0%, #0f3460 100%)',
        });
      }
    };
    loadBannerAd();
  }, [placement]);

  if (!visible || !adData) return null;

  return (
    <div className="banner-ad">
      <div
        className="banner-ad-content"
        style={{
          background: adData.gradient || 'linear-gradient(90deg, #e94560 0%, #0f3460 100%)',
        }}
      >
        <div className="banner-ad-text">
          <div className="banner-ad-title">{adData.title}</div>
          <div className="banner-ad-desc">{adData.description}</div>
        </div>
        <button className="banner-ad-link">
          了解更多 <ChevronRight size={14} />
        </button>
      </div>
      <button
        className="banner-ad-close"
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default AdModal;
