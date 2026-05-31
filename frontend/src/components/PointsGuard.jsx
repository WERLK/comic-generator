import React, { useState, useEffect } from 'react';
import { Coins, Tv, X, AlertCircle } from 'lucide-react';
import { getPointsBalance } from '../api';
import AdModal from './AdModal';

/**
 * PointsGuard - 积分守卫组件
 *
 * 包裹需要消耗积分的功能，当积分不足时显示覆盖层
 * 提示用户看广告赚取积分或取消操作
 *
 * Props:
 * - cost: 所需积分数量
 * - featureName: 功能名称
 * - children: 子组件（积分充足时正常渲染）
 * - userId: 用户 ID
 */
function PointsGuard({ cost, featureName, children, userId }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasEnough, setHasEnough] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);

  // 加载积分余额
  useEffect(() => {
    const loadBalance = async () => {
      setLoading(true);
      try {
        const res = await getPointsBalance();
        const data = res.data || res;
        setBalance(data.balance || 0);
        setHasEnough((data.balance || 0) >= cost);
      } catch (err) {
        console.error('获取积分余额失败:', err);
        // mock: 假设有足够积分
        setBalance(150);
        setHasEnough(150 >= cost);
      } finally {
        setLoading(false);
      }
    };
    loadBalance();
  }, [cost]);

  // 广告奖励回调
  const handleAdReward = (reward) => {
    setBalance((prev) => prev + (reward || 10));
    setHasEnough((prev) => prev + (reward || 10) >= cost);
  };

  if (loading) {
    return (
      <div style={{ position: 'relative' }}>
        {children}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-lg)',
            zIndex: 10,
          }}
        >
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (hasEnough) {
    return <>{children}</>;
  }

  // 积分不足覆盖层
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div className="points-guard-overlay">
        <div className="points-guard-content">
          <AlertCircle size={32} className="points-guard-icon" />
          <h3 className="points-guard-title">积分不足</h3>
          <p className="points-guard-desc">
            使用「{featureName}」需要 <strong>{cost}</strong> 积分
          </p>
          <div className="points-guard-balance">
            <Coins size={16} />
            当前余额: <strong>{balance}</strong> 积分
          </div>
          <div className="points-guard-shortage">
            还差 <strong>{cost - balance}</strong> 积分
          </div>
          <div className="points-guard-actions">
            <button
              className="btn btn-primary points-guard-ad-btn"
              onClick={() => setShowAdModal(true)}
            >
              <Tv size={16} />
              看广告赚积分
            </button>
            <button
              className="btn btn-secondary points-guard-cancel-btn"
              onClick={() => {}}
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
      </div>

      {/* 广告弹窗 */}
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onReward={handleAdReward}
        placement="points_guard"
        userId={userId}
      />
    </div>
  );
}

export default PointsGuard;
