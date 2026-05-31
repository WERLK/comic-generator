/**
 * routes/points.js - 积分管理路由模块
 *
 * 功能说明：
 * - GET /balance: 获取当前积分余额和统计信息
 * - GET /history: 获取交易历史记录（分页查询）
 * - POST /daily-bonus: 领取每日签到奖励
 * - GET /leaderboard: 获取积分排行榜（无需认证）
 * - GET /stats: 获取详细积分统计
 *
 * 依赖：
 * - pointsService: 积分管理服务
 * - userService: 用户管理服务
 * - auth 中间件: JWT 认证
 */

const express = require('express');
const pointsService = require('../services/pointsService');
const userService = require('../services/userService');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 创建路由器实例
const router = express.Router();

// ============ 路由定义 ============

/**
 * GET /api/points/balance
 * 获取当前积分余额和统计信息
 * 需要认证（Bearer Token）
 *
 * 返回：
 * - balance: 当前积分余额
 * - stats: 积分统计（总获得、总消费、交易次数）
 */
router.get('/balance', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // 获取积分余额
    const balance = pointsService.getBalance(userId);

    // 获取积分统计
    const stats = pointsService.getStats(userId);

    res.json({
      success: true,
      data: {
        balance,
        stats,
      },
    });
  } catch (error) {
    console.error('[积分路由] 获取余额失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取积分余额失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/points/history
 * 获取交易历史记录（分页查询）
 * 需要认证（Bearer Token）
 *
 * 查询参数：
 * - page: number     页码（默认 1）
 * - limit: number   每页数量（默认 20，最大 100）
 * - type: string     筛选类型：earn（收入）/ spend（消费）（可选）
 * - category: string 筛选类别（可选）
 *
 * 返回：
 * - records: 交易记录数组
 * - total: 总记录数
 * - page: 当前页码
 * - limit: 每页数量
 * - totalPages: 总页数
 */
router.get('/history', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, type, category } = req.query;

    // 获取分页交易历史
    const result = pointsService.getTransactionHistory(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      category,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[积分路由] 获取交易历史失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取交易历史失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/points/daily-bonus
 * 领取每日签到奖励
 * 需要认证（Bearer Token）
 * 每天只能领取一次，奖励 10 积分
 *
 * 返回：
 * - claimed: boolean 是否成功领取
 * - amount: number 领取的积分数量
 * - newBalance: number 领取后的余额（成功时）
 * - message: string 提示信息
 */
router.post('/daily-bonus', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // 领取每日奖励
    const result = pointsService.getDailyBonus(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[积分路由] 领取每日奖励失败:', error.message);
    res.status(500).json({
      success: false,
      message: '领取每日奖励失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/points/leaderboard
 * 获取积分排行榜
 * 无需认证（公开接口）
 *
 * 查询参数：
 * - limit: number 返回数量（默认 10）
 *
 * 返回：
 * - leaderboard: 排行榜数组
 *   [{ rank, userId, username, avatar, points, level }]
 */
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // 获取排行榜数据
    const leaderboard = userService.getLeaderboard(limit);

    res.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
      },
    });
  } catch (error) {
    console.error('[积分路由] 获取排行榜失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取排行榜失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/points/stats
 * 获取详细积分统计
 * 需要认证（Bearer Token）
 *
 * 返回：
 * - totalEarned: 累计获得积分
 * - totalSpent: 累计消费积分
 * - currentBalance: 当前余额
 * - transactionCount: 交易记录总数
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // 获取积分统计
    const stats = pointsService.getStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[积分路由] 获取积分统计失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取积分统计失败',
      error: error.message,
    });
  }
});

// 导出路由器模块
module.exports = router;
