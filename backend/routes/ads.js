/**
 * routes/ads.js - 广告路由模块
 *
 * 功能说明：
 * - GET /fetch: 获取广告内容（可选认证）
 * - POST /verify: 验证广告观看并发放奖励（需认证）
 * - GET /stats: 获取用户广告统计（需认证）
 *
 * 依赖：
 * - adService: 广告服务
 * - auth 中间件: JWT 认证（可选）
 */

const express = require('express');
const adService = require('../services/adService');
const { authenticate, optionalAuth } = require('../middleware/auth');

// 创建路由器实例
const router = express.Router();

// ============ 路由定义 ============

/**
 * GET /api/ads/fetch
 * 获取广告内容
 * 可选认证（已登录用户可获取个性化广告）
 *
 * 查询参数：
 * - placement: string 广告位类型（必填）
 *   可选值: banner（横幅）| interstitial（插屏）| rewarded（激励视频）
 *
 * 返回：
 * - adId: string     广告实例 ID
 * - type: string     广告类型
 * - placement: string 广告位类型
 * - title: string    广告标题
 * - description: string 广告描述
 * - imageUrl: string 广告图片 URL
 * - duration: number 观看时长要求（秒）
 * - reward: number   奖励积分数量
 * - advertiser: string 广告主
 */
router.get('/fetch', optionalAuth, (req, res) => {
  try {
    const { placement } = req.query;
    const userId = req.user ? req.user.id : null;

    // 验证必填参数
    if (!placement) {
      return res.status(400).json({
        success: false,
        message: '请指定广告位类型（placement 参数）',
        validPlacements: ['banner', 'interstitial', 'rewarded'],
      });
    }

    // 获取广告
    const ad = adService.getAd(userId, placement);

    res.json({
      success: true,
      data: ad,
    });
  } catch (error) {
    console.error('[广告路由] 获取广告失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ads/verify
 * 验证广告观看并发放奖励
 * 需要认证（Bearer Token）
 *
 * 请求体：
 * - adId: string         广告实例 ID（必填）
 * - watchDuration: number 实际观看时长（秒，必填）
 * - requiredDuration: number 要求的观看时长（秒，可选，默认 15）
 * - rewardPoints: number  奖励积分数量（可选，默认 5）
 *
 * 返回：
 * - success: boolean 是否成功
 * - pointsEarned: number 获得的积分数量
 * - newBalance: number 新的积分余额
 * - message: string 提示信息
 */
router.post('/verify', authenticate, (req, res) => {
  try {
    const { adId, watchDuration, requiredDuration, rewardPoints } = req.body;

    // 验证必填字段
    if (!adId) {
      return res.status(400).json({
        success: false,
        message: '请提供广告 ID（adId）',
      });
    }

    if (!watchDuration || typeof watchDuration !== 'number' || watchDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的观看时长（watchDuration，正数）',
      });
    }

    const userId = req.user.id;

    // 验证广告观看并发放奖励
    let result;
    if (requiredDuration && rewardPoints) {
      // 使用前端传递的详细广告信息进行验证
      result = adService.verifyAdWatchWithDetails(
        adId,
        userId,
        watchDuration,
        requiredDuration,
        rewardPoints
      );
    } else {
      // 使用默认参数验证
      result = adService.verifyAdWatch(adId, userId, watchDuration);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[广告路由] 验证广告观看失败:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ads/stats
 * 获取用户广告统计信息
 * 需要认证（Bearer Token）
 *
 * 返回：
 * - totalWatched: number 总观看广告次数
 * - totalPointsEarned: number 通过广告获得的总积分
 * - todayWatched: number 今日观看次数
 * - todayPointsEarned: number 今日通过广告获得的积分
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // 获取广告统计
    const stats = adService.getAdStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[广告路由] 获取广告统计失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取广告统计失败',
      error: error.message,
    });
  }
});

// 导出路由器模块
module.exports = router;
