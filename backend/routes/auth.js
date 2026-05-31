/**
 * routes/auth.js - 用户认证路由模块
 *
 * 功能说明：
 * - POST /register: 用户注册
 * - POST /login: 用户登录（支持用户名或邮箱）
 * - POST /oauth/github: GitHub OAuth 登录（Mock 实现）
 * - POST /oauth/google: Google OAuth 登录（Mock 实现）
 * - GET /me: 获取当前用户信息（需认证）
 * - PUT /profile: 更新用户资料（需认证）
 * - PUT /password: 修改密码（需认证）
 * - POST /refresh: 刷新 Token（需认证）
 *
 * 依赖：
 * - userService: 用户管理服务
 * - pointsService: 积分管理服务
 * - auth 中间件: JWT 认证
 */

const express = require('express');
const userService = require('../services/userService');
const pointsService = require('../services/pointsService');
const { authenticate, generateToken } = require('../middleware/auth');

// 创建路由器实例
const router = express.Router();

// ============ 路由定义 ============

/**
 * POST /api/auth/register
 * 用户注册
 *
 * 请求体：
 * - username: string  用户名（3-20 字符，必填）
 * - email: string    邮箱地址（必填）
 * - password: string 密码（6 位以上，必填）
 *
 * 返回：
 * - user: 用户信息（不含密码）
 * - token: JWT 令牌
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段：用户名、邮箱、密码',
      });
    }

    // 调用用户服务进行注册
    const user = await userService.register({ username, email, password });

    // 生成 JWT Token
    const token = generateToken(user);

    console.log(`[认证路由] 用户注册成功: ${user.username}`);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('[认证路由] 注册失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 * 支持用户名登录和邮箱登录
 *
 * 请求体：
 * - username: string 用户名（与 email 二选一）
 * - email: string   邮箱地址（与 username 二选一）
 * - password: string 密码（必填）
 *
 * 返回：
 * - user: 用户信息（不含密码）
 * - token: JWT 令牌
 */
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入密码',
      });
    }

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名或邮箱',
      });
    }

    let user;

    // 根据提供的字段选择登录方式
    if (email) {
      // 邮箱登录
      user = await userService.loginByEmail({ email, password });
    } else {
      // 用户名登录
      user = await userService.login({ username, password });
    }

    // 生成 JWT Token
    const token = generateToken(user);

    console.log(`[认证路由] 用户登录成功: ${user.username}`);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('[认证路由] 登录失败:', error.message);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/oauth/github
 * GitHub OAuth 登录（Mock 实现）
 *
 * 当前为模拟实现，直接根据 code 生成 Mock 用户
 * 后续需替换为真实的 GitHub OAuth 流程：
 * 1. 用 code 换取 access_token
 * 2. 用 access_token 获取 GitHub 用户信息
 * 3. 查找或创建本地用户
 *
 * 请求体：
 * - code: string GitHub OAuth 授权码
 *
 * 返回：
 * - user: 用户信息
 * - token: JWT 令牌
 * - isNew: boolean 是否为新用户
 */
router.post('/oauth/github', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 GitHub OAuth 授权码',
      });
    }

    console.log(`[认证路由] GitHub OAuth 登录请求，code: ${code.slice(0, 8)}...`);

    // Mock 实现：根据 code 生成模拟的 GitHub 用户信息
    // 实际项目中应调用 GitHub API: https://api.github.com/user
    const mockGithubUser = {
      providerId: `github_${code.slice(0, 12)}`,
      email: null, // GitHub 用户可能不公开邮箱
      name: `github_user_${code.slice(0, 6)}`,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${code}`,
    };

    // 调用 OAuth 登录
    const { user, isNew } = await userService.oauthLogin(mockGithubUser);

    // 生成 JWT Token
    const token = generateToken(user);

    console.log(`[认证路由] GitHub OAuth 登录成功: ${user.username} (新用户: ${isNew})`);

    res.json({
      success: true,
      message: isNew ? 'GitHub 注册成功' : 'GitHub 登录成功',
      data: {
        user,
        token,
        isNew,
      },
    });
  } catch (error) {
    console.error('[认证路由] GitHub OAuth 登录失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/oauth/google
 * Google OAuth 登录（Mock 实现）
 *
 * 当前为模拟实现，直接根据 code 生成 Mock 用户
 * 后续需替换为真实的 Google OAuth 流程：
 * 1. 用 code 换取 access_token
 * 2. 用 access_token 获取 Google 用户信息
 * 3. 查找或创建本地用户
 *
 * 请求体：
 * - code: string Google OAuth 授权码
 *
 * 返回：
 * - user: 用户信息
 * - token: JWT 令牌
 * - isNew: boolean 是否为新用户
 */
router.post('/oauth/google', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 Google OAuth 授权码',
      });
    }

    console.log(`[认证路由] Google OAuth 登录请求，code: ${code.slice(0, 8)}...`);

    // Mock 实现：根据 code 生成模拟的 Google 用户信息
    // 实际项目中应调用 Google API: https://www.googleapis.com/oauth2/v2/userinfo
    const mockGoogleUser = {
      providerId: `google_${code.slice(0, 12)}`,
      email: `user_${code.slice(0, 6)}@gmail.com`,
      name: `google_user_${code.slice(0, 6)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}`,
    };

    // 调用 OAuth 登录
    const { user, isNew } = await userService.oauthLogin(mockGoogleUser);

    // 生成 JWT Token
    const token = generateToken(user);

    console.log(`[认证路由] Google OAuth 登录成功: ${user.username} (新用户: ${isNew})`);

    res.json({
      success: true,
      message: isNew ? 'Google 注册成功' : 'Google 登录成功',
      data: {
        user,
        token,
        isNew,
      },
    });
  } catch (error) {
    console.error('[认证路由] Google OAuth 登录失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 * 需要认证（Bearer Token）
 *
 * 返回：
 * - user: 用户信息（不含密码）
 * - pointsBalance: 当前积分余额
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const user = req.user;

    // 获取积分余额
    const pointsBalance = pointsService.getBalance(user.id);

    res.json({
      success: true,
      data: {
        user,
        pointsBalance,
      },
    });
  } catch (error) {
    console.error('[认证路由] 获取用户信息失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message,
    });
  }
});

/**
 * PUT /api/auth/profile
 * 更新用户资料
 * 需要认证（Bearer Token）
 *
 * 请求体（均为可选）：
 * - username: string 新用户名
 * - avatar: string   新头像 URL
 * - preferences: object 偏好设置 { theme, language }
 *
 * 返回：
 * - user: 更新后的用户信息
 */
router.put('/profile', authenticate, (req, res) => {
  try {
    const { username, avatar, preferences } = req.body;

    // 构建更新对象（只包含提供的字段）
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;
    if (preferences !== undefined) updates.preferences = preferences;

    // 检查是否有要更新的字段
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个要更新的字段',
      });
    }

    // 更新用户资料
    const updatedUser = userService.updateUser(req.user.id, updates);

    console.log(`[认证路由] 用户资料已更新: ${updatedUser.username}`);

    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('[认证路由] 更新资料失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/password
 * 修改密码
 * 需要认证（Bearer Token）
 *
 * 请求体：
 * - oldPassword: string 旧密码（必填）
 * - newPassword: string 新密码（6 位以上，必填）
 *
 * 返回：
 * - user: 更新后的用户信息
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入旧密码和新密码',
      });
    }

    // 调用用户服务修改密码
    const updatedUser = await userService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );

    console.log(`[认证路由] 用户密码已修改: ${updatedUser.username}`);

    res.json({
      success: true,
      message: '密码修改成功',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('[认证路由] 修改密码失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/refresh
 * 刷新 Token
 * 需要认证（Bearer Token）
 * 验证当前 Token 有效性后，生成新的 Token
 *
 * 返回：
 * - token: 新的 JWT 令牌
 */
router.post('/refresh', authenticate, (req, res) => {
  try {
    // 生成新的 Token
    const newToken = generateToken(req.user);

    console.log(`[认证路由] Token 已刷新: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    console.error('[认证路由] Token 刷新失败:', error.message);
    res.status(500).json({
      success: false,
      message: 'Token 刷新失败',
      error: error.message,
    });
  }
});

// 导出路由器模块
module.exports = router;
