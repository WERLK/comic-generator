import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { login, register, oauthGithub, oauthGoogle } from '../api';

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    agreeTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
  };

  // 密码强度检测
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: '弱', color: '#e94560' };
    if (score <= 3) return { level: 2, text: '中', color: '#f0a500' };
    return { level: 3, text: '强', color: '#4caf50' };
  };

  // 表单验证
  const validateForm = () => {
    const errors = {};

    if (mode === 'register') {
      if (!formData.username || formData.username.length < 3 || formData.username.length > 20) {
        errors.username = '用户名需要 3-20 个字符';
      }
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址';
      }
      if (!formData.password || formData.password.length < 6) {
        errors.password = '密码至少 6 个字符';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }
      if (!formData.agreeTerms) {
        errors.agreeTerms = '请阅读并同意用户协议';
      }
    } else {
      if (!formData.username) {
        errors.username = '请输入用户名或邮箱';
      }
      if (!formData.password) {
        errors.password = '请输入密码';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 登录处理
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const res = await login({
        username: formData.username,
        password: formData.password,
      });
      const data = res.data || res;
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '登录失败，请检查用户名和密码';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const res = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      const data = res.data || res;
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '注册失败，请稍后重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // GitHub OAuth
  const handleGithubLogin = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(window.location.origin + '/login');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  // Google OAuth
  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(window.location.origin + '/login');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`;
  };

  // 忘记密码
  const handleForgotPassword = () => {
    alert('请联系管理员重置密码');
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="login-page">
      {/* 左侧品牌区域（桌面端显示） */}
      <div className="login-branding">
        <div className="login-branding-content">
          <Sparkles size={48} style={{ color: '#e94560', marginBottom: 'var(--spacing-lg)' }} />
          <h1>漫剧生成器</h1>
          <p>用 AI 的力量，将你的创意故事转化为精美的漫画和动态漫剧</p>
          <div className="login-branding-features">
            <div className="login-branding-feature">
              <span>AI 智能分镜</span>
            </div>
            <div className="login-branding-feature">
              <span>多种画风选择</span>
            </div>
            <div className="login-branding-feature">
              <span>一键生成视频</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区域 */}
      <div className="login-form-area">
        <div className="login-form-container">
          {/* 表单标题 */}
          <div className="login-form-header">
            <h2>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
            <p>{mode === 'login' ? '登录你的账号继续创作' : '注册一个新账号开始你的漫画之旅'}</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 登录表单 */}
          {mode === 'login' && (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">用户名 / 邮箱</label>
                <div className="login-input-wrapper">
                  <User size={18} className="login-input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入用户名或邮箱"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    autoComplete="username"
                  />
                </div>
                {fieldErrors.username && (
                  <span className="login-field-error">{fieldErrors.username}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="login-field-error">{fieldErrors.password}</span>
                )}
              </div>

              <div className="login-form-options">
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => updateField('rememberMe', e.target.checked)}
                  />
                  <span>记住我</span>
                </label>
                <button
                  type="button"
                  className="login-forgot-btn"
                  onClick={handleForgotPassword}
                >
                  忘记密码?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>

              {/* 分隔线 */}
              <div className="login-divider">
                <span>或</span>
              </div>

              {/* OAuth 按钮 */}
              <div className="oauth-buttons">
                <button
                  type="button"
                  className="btn btn-secondary oauth-btn oauth-github"
                  onClick={handleGithubLogin}
                >
                  <Github size={18} />
                  GitHub 登录
                </button>
                <button
                  type="button"
                  className="btn btn-secondary oauth-btn oauth-google"
                  onClick={handleGoogleLogin}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google 登录
                </button>
              </div>

              {/* 切换到注册 */}
              <p className="login-switch-text">
                还没有账号？{' '}
                <button
                  type="button"
                  className="login-switch-btn"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setFieldErrors({});
                  }}
                >
                  立即注册
                </button>
              </p>
            </form>
          )}

          {/* 注册表单 */}
          {mode === 'register' && (
            <form className="register-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <div className="login-input-wrapper">
                  <User size={18} className="login-input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="3-20 个字符"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    autoComplete="username"
                  />
                </div>
                {fieldErrors.username && (
                  <span className="login-field-error">{fieldErrors.username}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">邮箱</label>
                <div className="login-input-wrapper">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="请输入邮箱地址"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <span className="login-field-error">{fieldErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="至少 6 个字符"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="login-field-error">{fieldErrors.password}</span>
                )}
                {/* 密码强度指示器 */}
                {formData.password && (
                  <div className="login-password-strength">
                    <div className="login-strength-bars">
                      <div
                        className={`login-strength-bar ${passwordStrength.level >= 1 ? 'active' : ''}`}
                        style={{ background: passwordStrength.level >= 1 ? passwordStrength.color : '' }}
                      />
                      <div
                        className={`login-strength-bar ${passwordStrength.level >= 2 ? 'active' : ''}`}
                        style={{ background: passwordStrength.level >= 2 ? passwordStrength.color : '' }}
                      />
                      <div
                        className={`login-strength-bar ${passwordStrength.level >= 3 ? 'active' : ''}`}
                        style={{ background: passwordStrength.level >= 3 ? passwordStrength.color : '' }}
                      />
                    </div>
                    <span style={{ color: passwordStrength.color, fontSize: '0.8rem' }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">确认密码</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="login-field-error">{fieldErrors.confirmPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => updateField('agreeTerms', e.target.checked)}
                  />
                  <span>我已阅读并同意<a href="#" onClick={(e) => e.preventDefault()}>用户协议</a></span>
                </label>
                {fieldErrors.agreeTerms && (
                  <span className="login-field-error">{fieldErrors.agreeTerms}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </button>

              {/* 切换到登录 */}
              <p className="login-switch-text">
                已有账号？{' '}
                <button
                  type="button"
                  className="login-switch-btn"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setFieldErrors({});
                  }}
                >
                  立即登录
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
