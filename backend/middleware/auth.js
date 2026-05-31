/**
 * middleware/auth.js - 认证与授权中间件
 *
 * 功能说明：
 * - JWT Token 验证（authenticate）
 * - 可选认证（optionalAuth，不强制要求 Token）
 * - 积分余额检查（requirePoints）
 * - Token 生成（generateToken）
 *
 * 依赖：
 * - jsonwebtoken: JWT 令牌生成与验证
 * - userService: 用户管理服务（查询用户信息）
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

// ============ 配置常量 ============

// JWT 密钥（从环境变量读取，默认使用开发密钥）
const JWT_SECRET = process.env.JWT_SECRET || 'comic-generator-secret-key';

// Token 有效期（7 天）
const TOKEN_EXPIRES_IN = '7d';

// ============ Token 生成 ============

/**
 * 生成 JWT Token
 * 将用户基本信息编码到 Token 中
 *
 * @param {Object} user - 用户对象
 * @param {string} user.id - 用户 ID
 * @param {string} user.username - 用户名
 * @param {string} user.email - 邮箱
 * @returns {string} JWT Token 字符串
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

// ============ 认证中间件 ============

/**
 * 强制认证中间件
 * 验证请求中的 JWT Token，将用户信息挂载到 req.user
 * 如果 Token 无效或缺失，返回 401 错误
 *
 * 使用方式：
 *   router.get('/protected', authenticate, (req, res) => { ... });
 */
function authenticate(req, res, next) {
  try {
    // 从 Authorization 头部提取 Token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌，请先登录',
      });
    }

    // 解析 Bearer Token 格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误，正确格式: Bearer <token>',
      });
    }

    const token = parts[1];

    // 验证 Token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '认证令牌已过期，请重新登录',
        });
      }
      return res.status(401).json({
        success: false,
        message: '认证令牌无效',
      });
    }

    // 根据 Token 中的 userId 查询用户
    const user = userService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在，请重新注册',
      });
    }

    // 将用户信息挂载到请求对象
    req.user = user;

    // 继续执行后续中间件/路由
    next();
  } catch (error) {
    console.error('[认证中间件] 认证过程出错:', error.message);
    return res.status(401).json({
      success: false,
      message: '认证失败',
      error: error.message,
    });
  }
}

/**
 * 可选认证中间件
 * 与 authenticate 相同的逻辑，但如果未提供 Token 不会返回错误
 * 适用于同时支持登录和未登录用户的接口
 *
 * 使用方式：
 *   router.get('/content', optionalAuth, (req, res) => { ... });
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = userService.getUserById(decoded.userId);
          if (user) {
            req.user = user;
          }
        } catch (jwtError) {
          // Token 无效，静默忽略（可选认证不强制要求有效 Token）
          console.warn('[认证中间件] 可选认证 Token 无效:', jwtError.message);
        }
      }
    }

    // 无论是否有有效 Token，都继续执行
    next();
  } catch (error) {
    console.error('[认证中间件] 可选认证过程出错:', error.message);
    // 出错时也继续执行（可选认证不应阻断请求）
    next();
  }
}

/**
 * 积分余额检查中间件工厂
 * 返回一个中间件函数，检查当前用户是否有足够的积分
 * 必须在 authenticate 中间件之后使用
 *
 * @param {number} cost - 需要的积分数量
 * @returns {Function} Express 中间件函数
 *
 * 使用方式：
 *   router.post('/generate', authenticate, requirePoints(10), (req, res) => { ... });
 */
function requirePoints(cost) {
  if (!cost || typeof cost !== 'number' || cost <= 0) {
    throw new Error('requirePoints 参数必须为正数');
  }

  return (req, res, next) => {
    try {
      // 检查 req.user 是否存在（确保在 authenticate 之后使用）
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '请先登录',
        });
      }

      // 检查积分余额
      if (req.user.points < cost) {
        return res.status(402).json({
          success: false,
          message: `积分不足，当前余额: ${req.user.points}，需要: ${cost}`,
          currentBalance: req.user.points,
          requiredPoints: cost,
        });
      }

      // 积分充足，继续执行
      next();
    } catch (error) {
      console.error('[认证中间件] 积分检查出错:', error.message);
      return res.status(500).json({
        success: false,
        message: '积分检查失败',
        error: error.message,
      });
    }
  };
}

// ============ 模块导出 ============

module.exports = {
  // 中间件
  authenticate,
  optionalAuth,
  requirePoints,

  // Token 生成
  generateToken,

  // 配置常量（供测试使用）
  JWT_SECRET,
  TOKEN_EXPIRES_IN,
};
