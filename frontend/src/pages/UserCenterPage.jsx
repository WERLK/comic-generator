import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Camera,
  Coins,
  Gift,
  Tv,
  CreditCard,
  Trophy,
  Settings,
  Lock,
  Moon,
  Sun,
  Globe,
  Shield,
  LogOut,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Package,
  Palette,
  Unlock,
  PartyPopper,
  Medal,
  Crown,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getMe,
  updateProfile,
  changePassword,
  getPointsBalance,
  getPointsHistory,
  claimDailyBonus,
  getLeaderboard,
  getPointsStats,
} from '../api';
import AdModal from '../components/AdModal';

// 分类图标映射
const CATEGORY_CONFIG = {
  ad_watch: { icon: <Tv size={16} />, label: '看广告' },
  ai_generate: { icon: <Palette size={16} />, label: 'AI 生成' },
  unlock_feature: { icon: <Unlock size={16} />, label: '解锁功能' },
  export: { icon: <Package size={16} />, label: '导出' },
  daily_bonus: { icon: <Gift size={16} />, label: '每日签到' },
  register_bonus: { icon: <PartyPopper size={16} />, label: '注册奖励' },
  recharge: { icon: <CreditCard size={16} />, label: '充值' },
};

function UserCenterPage() {
  const navigate = useNavigate();

  // 用户信息
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab 状态
  const [activeTab, setActiveTab] = useState('points');

  // 积分相关
  const [pointsBalance, setPointsBalance] = useState(0);
  const [todayChange, setTodayChange] = useState(0);
  const [pointsStats, setPointsStats] = useState({
    totalEarned: 0,
    totalSpent: 0,
    weeklyEarned: 0,
    monthlyEarned: 0,
  });
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  // 消费记录
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(false);

  // 排行榜
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [myRank, setMyRank] = useState(null);

  // 设置
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('zh-CN');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 编辑用户名
  const [editingUsername, setEditingUsername] = useState(false);
  const [editUsernameValue, setEditUsernameValue] = useState('');

  // 广告弹窗
  const [showAdModal, setShowAdModal] = useState(false);

  // 加载用户信息
  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userRes = await getMe();
      const userData = userRes.data || userRes;
      setUser(userData);
      setEditUsernameValue(userData.username || '');

      const balanceRes = await getPointsBalance();
      const balanceData = balanceRes.data || balanceRes;
      setPointsBalance(balanceData.balance || 0);
      setTodayChange(balanceData.todayChange || 0);
      setDailyClaimed(balanceData.dailyClaimed || false);

      const statsRes = await getPointsStats();
      const statsData = statsRes.data || statsRes;
      setPointsStats(statsData);
    } catch (err) {
      console.error('加载用户数据失败:', err);
      // 使用 mock 数据
      setUser({
        username: '创作者小明',
        email: 'xiaoming@example.com',
        avatar: null,
        level: 1,
        levelName: '新手创作者',
        createdAt: '2025-01-15',
      });
      setPointsBalance(150);
      setTodayChange(20);
      setDailyClaimed(false);
      setPointsStats({
        totalEarned: 500,
        totalSpent: 350,
        weeklyEarned: 80,
        monthlyEarned: 200,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // 加载消费记录
  const loadTransactions = useCallback(async (page = 1, append = false) => {
    setTransactionsLoading(true);
    try {
      const res = await getPointsHistory({
        type: filterType,
        category: filterCategory,
        page,
        limit: 10,
      });
      const data = res.data || res;
      const list = data.list || data.records || data || [];
      if (append) {
        setTransactions((prev) => [...prev, ...list]);
      } else {
        setTransactions(list);
      }
      setTxHasMore(list.length >= 10);
      setTxPage(page);
    } catch (err) {
      console.error('加载消费记录失败:', err);
      // mock 数据
      if (!append) {
        setTransactions([
          { id: 1, category: 'daily_bonus', description: '每日签到奖励', amount: 10, type: 'income', createdAt: '2025-05-31 08:00' },
          { id: 2, category: 'ai_generate', description: 'AI 生成漫画', amount: -10, type: 'expense', createdAt: '2025-05-30 15:30' },
          { id: 3, category: 'ad_watch', description: '观看广告奖励', amount: 10, type: 'income', createdAt: '2025-05-30 14:00' },
          { id: 4, category: 'register_bonus', description: '新用户注册奖励', amount: 100, type: 'income', createdAt: '2025-01-15 10:00' },
          { id: 5, category: 'ai_generate', description: 'AI 生成漫画', amount: -10, type: 'expense', createdAt: '2025-05-29 20:00' },
          { id: 6, category: 'daily_bonus', description: '每日签到奖励', amount: 10, type: 'income', createdAt: '2025-05-29 08:00' },
        ]);
        setTxHasMore(false);
      }
    } finally {
      setTransactionsLoading(false);
    }
  }, [filterType, filterCategory]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions(1);
    }
  }, [activeTab, loadTransactions]);

  // 加载排行榜
  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await getLeaderboard(20);
      const data = res.data || res;
      setLeaderboard(data.list || data || []);
      setMyRank(data.myRank || null);
    } catch (err) {
      console.error('加载排行榜失败:', err);
      // mock 数据
      setLeaderboard([
        { rank: 1, username: '漫画大师', points: 5000, avatar: null },
        { rank: 2, username: '创作达人', points: 4200, avatar: null },
        { rank: 3, username: 'AI 艺术家', points: 3800, avatar: null },
        { rank: 4, username: '分镜高手', points: 3200, avatar: null },
        { rank: 5, username: '故事大王', points: 2800, avatar: null },
        { rank: 6, username: '像素画师', points: 2500, avatar: null },
        { rank: 7, username: '动漫迷', points: 2200, avatar: null },
        { rank: 8, username: '创意无限', points: 1900, avatar: null },
        { rank: 9, username: '新手小白', points: 1500, avatar: null },
        { rank: 10, username: '漫画爱好者', points: 1200, avatar: null },
      ]);
      setMyRank(15);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [activeTab, loadLeaderboard]);

  // 每日签到
  const handleDailyClaim = async () => {
    setClaimLoading(true);
    try {
      const res = await claimDailyBonus();
      const data = res.data || res;
      setPointsBalance((prev) => prev + (data.reward || 10));
      setTodayChange((prev) => prev + (data.reward || 10));
      setDailyClaimed(true);
    } catch (err) {
      console.error('签到失败:', err);
      // mock
      setPointsBalance((prev) => prev + 10);
      setTodayChange((prev) => prev + 10);
      setDailyClaimed(true);
    } finally {
      setClaimLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      setPasswordError('请填写完整信息');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密码至少 6 个字符');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('密码修改成功');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || '密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 保存用户名
  const handleSaveUsername = async () => {
    if (!editUsernameValue.trim()) return;
    try {
      await updateProfile({ username: editUsernameValue });
      setUser((prev) => ({ ...prev, username: editUsernameValue }));
      setEditingUsername(false);
    } catch (err) {
      console.error('更新用户名失败:', err);
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // 广告奖励回调
  const handleAdReward = (reward) => {
    setPointsBalance((prev) => prev + (reward || 10));
    setTodayChange((prev) => prev + (reward || 10));
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="spinner" />
        <span style={{ marginLeft: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>加载中...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'points', label: '积分概览', icon: <Coins size={16} /> },
    { id: 'transactions', label: '消费记录', icon: <CreditCard size={16} /> },
    { id: 'leaderboard', label: '排行榜', icon: <Trophy size={16} /> },
    { id: 'settings', label: '个人设置', icon: <Settings size={16} /> },
  ];

  return (
    <div className="page user-center">
      {/* 用户信息头部 */}
      <div className="user-center-header">
        <div className="user-avatar-wrapper">
          <div className="user-avatar-large">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <User size={48} />
            )}
          </div>
          <button className="user-avatar-upload" title="上传头像">
            <Camera size={14} />
          </button>
        </div>

        <div className="user-info">
          {editingUsername ? (
            <div className="user-username-edit">
              <input
                type="text"
                className="form-input"
                value={editUsernameValue}
                onChange={(e) => setEditUsernameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveUsername();
                  if (e.key === 'Escape') setEditingUsername(false);
                }}
              />
              <button className="btn btn-sm btn-primary" onClick={handleSaveUsername}>保存</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditingUsername(false)}>取消</button>
            </div>
          ) : (
            <h2 className="user-username" onClick={() => setEditingUsername(true)}>
              {user?.username || '用户'}
              <Edit3 size={14} className="user-edit-icon" />
            </h2>
          )}
          <div className="user-email">
            <Mail size={14} />
            <span>{user?.email || '未设置邮箱'}</span>
          </div>
          <div className="user-meta-row">
            <span className="user-level-badge">
              <Crown size={12} />
              Lv.{user?.level || 1} {user?.levelName || '新手创作者'}
            </span>
            <span className="user-reg-date">
              <Calendar size={12} />
              注册于 {user?.createdAt || '2025-01-01'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="user-center-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`user-center-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="user-center-content">
        {/* Tab 1: 积分概览 */}
        {activeTab === 'points' && (
          <div className="points-overview">
            {/* 积分余额 */}
            <div className="points-balance-card">
              <div className="points-balance-label">当前积分</div>
              <div className="points-balance-value">
                <Coins size={32} className="points-coin-icon" />
                <span className="points-balance-number">{pointsBalance}</span>
              </div>
              <div className={`points-today-change ${todayChange >= 0 ? 'positive' : 'negative'}`}>
                {todayChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                今日 {todayChange >= 0 ? '+' : ''}{todayChange}
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="points-quick-actions">
              <button
                className="btn btn-primary points-action-btn"
                onClick={handleDailyClaim}
                disabled={dailyClaimed || claimLoading}
              >
                {claimLoading ? (
                  <Loader2 size={16} className="spinner" />
                ) : dailyClaimed ? (
                  <CheckCircle size={16} />
                ) : (
                  <Gift size={16} />
                )}
                {dailyClaimed ? '已签到' : '每日签到'}
              </button>
              <button
                className="btn btn-secondary points-action-btn"
                onClick={() => setShowAdModal(true)}
              >
                <Tv size={16} />
                看广告赚积分
              </button>
              <button
                className="btn btn-secondary points-action-btn"
                onClick={() => alert('即将开放')}
              >
                <CreditCard size={16} />
                充值积分
              </button>
            </div>

            {/* 积分统计卡片 */}
            <div className="points-stats-grid">
              <div className="points-stat-card">
                <div className="points-stat-label">累计获得</div>
                <div className="points-stat-value">{pointsStats.totalEarned}</div>
              </div>
              <div className="points-stat-card">
                <div className="points-stat-label">累计消费</div>
                <div className="points-stat-value">{pointsStats.totalSpent}</div>
              </div>
              <div className="points-stat-card">
                <div className="points-stat-label">本周获得</div>
                <div className="points-stat-value">{pointsStats.weeklyEarned}</div>
              </div>
              <div className="points-stat-card">
                <div className="points-stat-label">本月获得</div>
                <div className="points-stat-value">{pointsStats.monthlyEarned}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 消费记录 */}
        {activeTab === 'transactions' && (
          <div className="transaction-list">
            {/* 筛选行 */}
            <div className="transaction-filters">
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">全部类型</option>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
              <select
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">全部分类</option>
                <option value="ad_watch">看广告</option>
                <option value="ai_generate">AI 生成</option>
                <option value="unlock_feature">解锁功能</option>
                <option value="export">导出</option>
                <option value="daily_bonus">每日签到</option>
                <option value="register_bonus">注册奖励</option>
              </select>
            </div>

            {/* 记录列表 */}
            {transactionsLoading && transactions.length === 0 ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>加载中...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
                <p>暂无消费记录</p>
              </div>
            ) : (
              <>
                {transactions.map((tx) => {
                  const catConfig = CATEGORY_CONFIG[tx.category] || { icon: <Coins size={16} />, label: tx.category };
                  const isIncome = tx.type === 'income' || tx.amount > 0;
                  return (
                    <div key={tx.id} className="transaction-item">
                      <div className="transaction-item-icon">
                        {catConfig.icon}
                      </div>
                      <div className="transaction-item-info">
                        <div className="transaction-item-desc">{tx.description || catConfig.label}</div>
                        <div className="transaction-item-date">{tx.createdAt}</div>
                      </div>
                      <div className={`transaction-item-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : ''}{tx.amount}
                      </div>
                    </div>
                  );
                })}

                {txHasMore && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                    onClick={() => loadTransactions(txPage + 1, true)}
                    disabled={transactionsLoading}
                  >
                    {transactionsLoading ? (
                      <Loader2 size={16} className="spinner" />
                    ) : (
                      '加载更多'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: 排行榜 */}
        {activeTab === 'leaderboard' && (
          <div className="leaderboard">
            {leaderboardLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>加载中...</span>
              </div>
            ) : (
              <>
                {/* 前三名特殊样式 */}
                {leaderboard.length >= 3 && (
                  <div className="leaderboard-top3">
                    {/* 第二名 */}
                    <div className="leaderboard-top-item silver">
                      <div className="leaderboard-medal silver-medal">2</div>
                      <div className="leaderboard-top-avatar">
                        {leaderboard[1].avatar ? (
                          <img src={leaderboard[1].avatar} alt={leaderboard[1].username} />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <div className="leaderboard-top-name">{leaderboard[1].username}</div>
                      <div className="leaderboard-top-points">
                        <Coins size={12} />
                        {leaderboard[1].points}
                      </div>
                    </div>

                    {/* 第一名 */}
                    <div className="leaderboard-top-item gold">
                      <div className="leaderboard-medal gold-medal">
                        <Crown size={16} />
                      </div>
                      <div className="leaderboard-top-avatar champion">
                        {leaderboard[0].avatar ? (
                          <img src={leaderboard[0].avatar} alt={leaderboard[0].username} />
                        ) : (
                          <User size={36} />
                        )}
                      </div>
                      <div className="leaderboard-top-name">{leaderboard[0].username}</div>
                      <div className="leaderboard-top-points">
                        <Coins size={12} />
                        {leaderboard[0].points}
                      </div>
                    </div>

                    {/* 第三名 */}
                    <div className="leaderboard-top-item bronze">
                      <div className="leaderboard-medal bronze-medal">3</div>
                      <div className="leaderboard-top-avatar">
                        {leaderboard[2].avatar ? (
                          <img src={leaderboard[2].avatar} alt={leaderboard[2].username} />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div className="leaderboard-top-name">{leaderboard[2].username}</div>
                      <div className="leaderboard-top-points">
                        <Coins size={12} />
                        {leaderboard[2].points}
                      </div>
                    </div>
                  </div>
                )}

                {/* 其余排名 */}
                <div className="leaderboard-rest">
                  {leaderboard.slice(3).map((item) => (
                    <div
                      key={item.rank}
                      className={`leaderboard-item ${myRank === item.rank ? 'highlight' : ''}`}
                    >
                      <div className="leaderboard-item-rank">{item.rank}</div>
                      <div className="leaderboard-item-avatar">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.username} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="leaderboard-item-name">{item.username}</div>
                      <div className="leaderboard-item-points">
                        <Coins size={12} />
                        {item.points}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 我的排名 */}
                {myRank && (
                  <div className="leaderboard-my-rank">
                    <Medal size={16} />
                    我的排名: <strong>#{myRank}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 4: 个人设置 */}
        {activeTab === 'settings' && (
          <div className="user-settings">
            {/* 修改密码 */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                <Lock size={16} />
                修改密码
              </h3>
              {passwordError && (
                <div className="login-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="settings-success" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <CheckCircle size={16} />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">当前密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="请输入当前密码"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">新密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="至少 6 个字符"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">确认新密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="请再次输入新密码"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <Loader2 size={16} className="spinner" />
                ) : (
                  <Lock size={16} />
                )}
                修改密码
              </button>
            </div>

            <hr className="section-divider" />

            {/* 主题设置 */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                主题设置
              </h3>
              <div className="settings-row">
                <span>深色模式</span>
                <div
                  className="settings-toggle"
                  onClick={() => setDarkMode(!darkMode)}
                  style={{
                    background: darkMode ? 'var(--accent-primary)' : 'var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      left: darkMode ? '22px' : '2px',
                    }}
                  />
                </div>
              </div>
            </div>

            <hr className="section-divider" />

            {/* 语言设置 */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                <Globe size={16} />
                语言设置
              </h3>
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ maxWidth: '200px' }}
              >
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁体中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <hr className="section-divider" />

            {/* 账号安全 */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                <Shield size={16} />
                账号安全
              </h3>
              <div className="settings-security-info">
                <div className="settings-security-item">
                  <span className="settings-security-label">最近登录时间</span>
                  <span className="settings-security-value">2025-05-31 08:30:00</span>
                </div>
                <div className="settings-security-item">
                  <span className="settings-security-label">登录设备</span>
                  <span className="settings-security-value">Chrome / Windows</span>
                </div>
                <div className="settings-security-item">
                  <span className="settings-security-label">登录 IP</span>
                  <span className="settings-security-value">192.168.1.***</span>
                </div>
              </div>
            </div>

            <hr className="section-divider" />

            {/* 退出登录 */}
            <button className="btn btn-danger logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        )}
      </div>

      {/* 广告弹窗 */}
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onReward={handleAdReward}
        placement="user_center"
        userId={user?.id}
      />
    </div>
  );
}

export default UserCenterPage;
