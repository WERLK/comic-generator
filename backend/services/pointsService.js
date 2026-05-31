/**
 * services/pointsService.js - 积分管理服务模块
 *
 * 功能说明：
 * - 积分增加与扣减
 * - 交易记录管理
 * - 每日签到奖励
 * - 积分余额查询
 * - 交易历史分页查询
 * - 积分统计信息
 *
 * 依赖：
 * - userService: 用户管理服务（更新用户积分、存储交易记录）
 */

const userService = require('./userService');

// ============ 每日签到追踪 ============

// 记录用户每日签到状态（内存存储，key: userId_date）
const dailyBonusClaims = new Map();

/**
 * 获取今日日期字符串（YYYY-MM-DD 格式）
 * @returns {string} 今日日期
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// ============ 核心功能函数 ============

/**
 * 增加用户积分
 * 向指定用户添加积分，并创建交易记录
 *
 * @param {string} userId - 用户 ID
 * @param {number} amount - 增加的积分数量（必须为正数）
 * @param {string} reason - 积分变动原因描述
 * @param {string} category - 积分类别
 *   可选值: ad_watch | ai_generate | unlock_feature | export | daily_bonus | register_bonus
 * @param {string} relatedId - 关联 ID（可选，如项目 ID）
 * @returns {number} 变动后的新余额
 * @throws {Error} 用户不存在或金额无效时抛出异常
 */
function addPoints(userId, amount, reason, category, relatedId = null) {
  // 参数验证
  if (!userId) {
    throw new Error('用户 ID 不能为空');
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('积分数量必须为正数');
  }

  if (!reason || typeof reason !== 'string') {
    throw new Error('请提供积分变动原因');
  }

  // 获取用户当前信息
  const user = userService.getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 更新用户积分
  const newBalance = user.points + amount;
  userService.updateUserPoints(userId, newBalance);

  // 创建交易记录
  userService.addTransaction({
    userId,
    type: 'earn',
    amount,
    reason,
    category: category || 'other',
    createdAt: new Date().toISOString(),
    relatedId,
  });

  // 持久化
  userService.saveToFile();

  console.log(`[积分服务] 用户 ${user.username} 积分 +${amount}，余额: ${newBalance}（${reason}）`);

  return newBalance;
}

/**
 * 扣减用户积分
 * 从指定用户扣减积分，先检查余额是否充足
 *
 * @param {string} userId - 用户 ID
 * @param {number} amount - 扣减的积分数量（必须为正数）
 * @param {string} reason - 积分变动原因描述
 * @param {string} category - 积分类别
 * @param {string} relatedId - 关联 ID（可选）
 * @returns {number} 变动后的新余额
 * @throws {Error} 用户不存在、余额不足或金额无效时抛出异常
 */
function deductPoints(userId, amount, reason, category, relatedId = null) {
  // 参数验证
  if (!userId) {
    throw new Error('用户 ID 不能为空');
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('积分数量必须为正数');
  }

  if (!reason || typeof reason !== 'string') {
    throw new Error('请提供积分变动原因');
  }

  // 获取用户当前信息
  const user = userService.getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查余额是否充足
  if (user.points < amount) {
    throw new Error(`积分不足，当前余额: ${user.points}，需要: ${amount}`);
  }

  // 更新用户积分
  const newBalance = user.points - amount;
  userService.updateUserPoints(userId, newBalance);

  // 创建交易记录
  userService.addTransaction({
    userId,
    type: 'spend',
    amount,
    reason,
    category: category || 'other',
    createdAt: new Date().toISOString(),
    relatedId,
  });

  // 持久化
  userService.saveToFile();

  console.log(`[积分服务] 用户 ${user.username} 积分 -${amount}，余额: ${newBalance}（${reason}）`);

  return newBalance;
}

/**
 * 获取用户当前积分余额
 *
 * @param {string} userId - 用户 ID
 * @returns {number} 当前积分余额
 * @throws {Error} 用户不存在时抛出异常
 */
function getBalance(userId) {
  const user = userService.getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  return user.points;
}

/**
 * 获取交易历史记录（分页查询）
 * 支持按类型和类别筛选
 *
 * @param {string} userId - 用户 ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码（默认 1）
 * @param {number} options.limit - 每页数量（默认 20）
 * @param {string} options.type - 筛选类型：earn/spend（可选）
 * @param {string} options.category - 筛选类别（可选）
 * @returns {Object} 分页结果 { records, total, page, limit, totalPages }
 */
function getTransactionHistory(userId, { page = 1, limit = 20, type, category } = {}) {
  // 参数验证
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

  // 获取用户所有交易记录
  let records = userService.getTransactions(userId);

  // 按时间倒序排列（最新的在前）
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 按类型筛选
  if (type && (type === 'earn' || type === 'spend')) {
    records = records.filter((r) => r.type === type);
  }

  // 按类别筛选
  if (category) {
    records = records.filter((r) => r.category === category);
  }

  // 计算分页
  const total = records.length;
  const totalPages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedRecords = records.slice(startIndex, startIndex + limitNum);

  return {
    records: paginatedRecords,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
}

/**
 * 领取每日签到奖励
 * 每天可领取一次，奖励 10 积分
 *
 * @param {string} userId - 用户 ID
 * @returns {Object} { claimed, amount, message }
 *   - claimed: boolean 是否成功领取
 *   - amount: number 领取的积分数量
 *   - message: string 提示信息
 */
function getDailyBonus(userId) {
  if (!userId) {
    throw new Error('用户 ID 不能为空');
  }

  const today = getTodayStr();
  const claimKey = `${userId}_${today}`;

  // 检查今天是否已领取
  if (dailyBonusClaims.has(claimKey)) {
    return {
      claimed: false,
      amount: 0,
      message: '今天已经领取过每日奖励了，明天再来吧！',
    };
  }

  // 发放每日奖励（10 积分）
  const bonusAmount = 10;
  const newBalance = addPoints(
    userId,
    bonusAmount,
    '每日签到奖励',
    'daily_bonus'
  );

  // 记录领取状态
  dailyBonusClaims.set(claimKey, {
    claimedAt: new Date().toISOString(),
    amount: bonusAmount,
  });

  // 清理过期的签到记录（保留最近 2 天的记录）
  cleanExpiredDailyClaims();

  return {
    claimed: true,
    amount: bonusAmount,
    newBalance,
    message: `签到成功！获得 ${bonusAmount} 积分`,
  };
}

/**
 * 清理过期的每日签到记录
 * 仅保留最近 2 天的记录，防止内存泄漏
 */
function cleanExpiredDailyClaims() {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  for (const [key] of dailyBonusClaims) {
    // key 格式: userId_YYYY-MM-DD
    const dateStr = key.split('_').pop();
    if (dateStr < twoDaysAgoStr) {
      dailyBonusClaims.delete(key);
    }
  }
}

/**
 * 检查余额并扣减积分（一步完成）
 * 用于消费场景：先检查余额是否足够，足够则直接扣减
 *
 * @param {string} userId - 用户 ID
 * @param {number} cost - 消耗的积分数量
 * @param {string} reason - 消费原因
 * @param {string} category - 积分类别
 * @param {string} relatedId - 关联 ID（可选）
 * @returns {Object} { success, newBalance, error }
 *   - success: boolean 是否扣减成功
 *   - newBalance: number 扣减后的余额（成功时）
 *   - error: string 错误信息（失败时）
 */
function checkAndDeduct(userId, cost, reason, category, relatedId = null) {
  try {
    // 获取当前余额
    const balance = getBalance(userId);

    // 检查余额是否充足
    if (balance < cost) {
      return {
        success: false,
        newBalance: balance,
        error: `积分不足，当前余额: ${balance}，需要: ${cost}`,
      };
    }

    // 执行扣减
    const newBalance = deductPoints(userId, cost, reason, category, relatedId);

    return {
      success: true,
      newBalance,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error.message,
    };
  }
}

/**
 * 获取积分统计信息
 * 包含总获得、总消费、当前余额等数据
 *
 * @param {string} userId - 用户 ID
 * @returns {Object} 积分统计 { totalEarned, totalSpent, currentBalance, transactionCount }
 * @throws {Error} 用户不存在时抛出异常
 */
function getStats(userId) {
  const user = userService.getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 获取所有交易记录
  const txRecords = userService.getTransactions(userId);

  // 计算总获得和总消费
  let totalEarned = 0;
  let totalSpent = 0;

  for (const record of txRecords) {
    if (record.type === 'earn') {
      totalEarned += record.amount;
    } else if (record.type === 'spend') {
      totalSpent += record.amount;
    }
  }

  return {
    totalEarned,        // 累计获得积分
    totalSpent,        // 累计消费积分
    currentBalance: user.points, // 当前余额
    transactionCount: txRecords.length, // 交易记录总数
  };
}

// ============ 模块导出 ============

module.exports = {
  // 积分操作
  addPoints,
  deductPoints,
  getBalance,

  // 交易记录
  getTransactionHistory,

  // 每日签到
  getDailyBonus,

  // 消费检查
  checkAndDeduct,

  // 统计信息
  getStats,
};
