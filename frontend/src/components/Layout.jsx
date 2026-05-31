import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, User, Coins, Gift, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { getMe, getPointsBalance, claimDailyBonus } from '../api';

const NAV_LINKS = [
  { path: '/', label: '首页' },
  { path: '/create', label: '创建' },
  { path: '/image-to-comic', label: '图片转漫画' },
  { path: '/projects', label: '我的项目' },
];

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 认证状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const userRes = await getMe();
        const userData = userRes.data || userRes;
        setUser(userData);
        setIsLoggedIn(true);

        const balanceRes = await getPointsBalance();
        const balanceData = balanceRes.data || balanceRes;
        setPointsBalance(balanceData.balance || 0);
        setDailyClaimed(balanceData.dailyClaimed || false);
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // 每日签到
  const handleDailyClaim = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setClaimLoading(true);
    try {
      const res = await claimDailyBonus();
      const data = res.data || res;
      setPointsBalance((prev) => prev + (data.reward || 10));
      setDailyClaimed(true);
      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 2000);
    } catch (err) {
      // mock
      setPointsBalance((prev) => prev + 10);
      setDailyClaimed(true);
      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 2000);
    } finally {
      setClaimLoading(false);
    }
  };

  // 退出登录
  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setPointsBalance(0);
    navigate('/');
  };

  return (
    <div className="app">
      {/* 导航栏 */}
      <nav className="navbar">
        <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
          <Sparkles size={24} />
          漫剧生成器
        </Link>

        {/* 桌面端导航链接 */}
        <ul className="navbar-links">
          {NAV_LINKS.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={isActive(link.path) ? 'active' : ''}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* 右侧用户区域 */}
        <div className="navbar-right">
          {isLoggedIn ? (
            <>
              {/* 每日签到按钮 */}
              <button
                className={`navbar-daily-checkin ${dailyClaimed ? 'claimed' : ''} ${claimSuccess ? 'success' : ''}`}
                onClick={handleDailyClaim}
                disabled={dailyClaimed || claimLoading}
                title={dailyClaimed ? '今日已签到' : '每日签到'}
              >
                {claimLoading ? (
                  <Loader2 size={14} className="spinner" />
                ) : claimSuccess ? (
                  <CheckCircle size={14} />
                ) : dailyClaimed ? (
                  <CheckCircle size={14} />
                ) : (
                  <Gift size={14} />
                )}
                <span className="navbar-daily-text">{dailyClaimed ? '已签到' : '签到'}</span>
              </button>

              {/* 积分徽章 */}
              <Link to="/user-center" className="points-badge" onClick={closeMobileMenu}>
                <Coins size={14} />
                <span>{pointsBalance}</span>
              </Link>

              {/* 用户头像和名称 */}
              <Link to="/user-center" className="navbar-user" onClick={closeMobileMenu}>
                <div className="navbar-user-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <span className="navbar-user-name">{user?.username || '用户'}</span>
              </Link>

              {/* 退出按钮 */}
              <button className="navbar-logout-btn" onClick={handleLogout} title="退出登录">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm navbar-login-btn">
              登录
            </Link>
          )}
        </div>

        {/* 移动端汉堡菜单按钮 */}
        <button
          className="navbar-mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* 移动端下拉菜单 */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`navbar-mobile-link ${isActive(link.path) ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            {link.label}
          </Link>
        ))}
        {isLoggedIn && (
          <>
            <Link
              to="/user-center"
              className="navbar-mobile-link"
              onClick={closeMobileMenu}
            >
              <User size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              个人中心
              <span className="points-badge points-badge-inline">
                <Coins size={12} />
                {pointsBalance}
              </span>
            </Link>
            <button
              className="navbar-mobile-link"
              onClick={() => {
                handleLogout({ preventDefault: () => {}, stopPropagation: () => {} });
                closeMobileMenu();
              }}
              style={{ color: 'var(--accent-primary)' }}
            >
              <LogOut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              退出登录
            </button>
          </>
        )}
        {!isLoggedIn && (
          <Link
            to="/login"
            className="navbar-mobile-link"
            onClick={closeMobileMenu}
          >
            登录 / 注册
          </Link>
        )}
      </div>

      {/* 页面内容 */}
      <Outlet />
    </div>
  );
}

export default Layout;
