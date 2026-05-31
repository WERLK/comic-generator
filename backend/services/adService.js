/**
 * services/adService.js - 广告服务模块
 *
 * 功能说明：
 * - 获取广告内容（横幅、插屏、激励视频）
 * - 验证广告观看完成情况
 * - 发放广告奖励积分
 * - 广告统计信息
 *
 * 当前实现：
 * - 使用模拟广告池（Mock），包含多种类型的中文广告内容
 * - 后续可替换为真实广告 SDK（如 Google AdMob、穿山甲等）
 *
 * 依赖：
 * - pointsService: 积分管理服务（发放广告奖励）
 */

const { v4: uuidv4 } = require('uuid');
const pointsService = require('./pointsService');

// ============ 模拟广告池 ============

/**
 * 模拟广告数据池
 * 包含多种类型的广告：游戏、工具、教育、电商等
 * 每条广告包含：标题、描述、图片、时长、奖励积分、广告主
 */
const MOCK_AD_POOL = [
  // 游戏类广告
  {
    type: 'game',
    title: '王者传说 - 全新赛季开启',
    description: '5v5公平竞技，百变英雄任你选择！新玩家登录送史诗皮肤，限时活动火热进行中。',
    imageUrl: 'https://picsum.photos/seed/game1/600/300',
    duration: 30,
    reward: 5,
    advertiser: '腾讯游戏',
  },
  {
    type: 'game',
    title: '原神 - 4.5版本更新',
    description: '全新角色登场，限定武器祈愿开启！探索提瓦特大陆，开启你的冒险之旅。',
    imageUrl: 'https://picsum.photos/seed/game2/600/300',
    duration: 30,
    reward: 5,
    advertiser: '米哈游',
  },
  {
    type: 'game',
    title: '蛋仔派对 - 欢乐闯关',
    description: '超萌蛋仔，欢乐派对！海量关卡等你挑战，和朋友一起组队闯关吧！',
    imageUrl: 'https://picsum.photos/seed/game3/600/300',
    duration: 15,
    reward: 3,
    advertiser: '网易游戏',
  },
  // 工具类广告
  {
    type: 'tool',
    title: 'WPS Office - AI智能办公',
    description: 'AI一键生成PPT，智能排版文档，云端协作更高效。新用户免费使用30天！',
    imageUrl: 'https://picsum.photos/seed/tool1/600/300',
    duration: 15,
    reward: 3,
    advertiser: '金山办公',
  },
  {
    type: 'tool',
    title: '剪映 - 专业视频剪辑',
    description: '海量模板一键套用，AI自动字幕，让每个人都能做出精美视频。',
    imageUrl: 'https://picsum.photos/seed/tool2/600/300',
    duration: 15,
    reward: 3,
    advertiser: '字节跳动',
  },
  // 教育类广告
  {
    type: 'education',
    title: '得到APP - 终身学习',
    description: '名师大咖精讲，每天听本书。涵盖商业、科技、人文等20+领域。',
    imageUrl: 'https://picsum.photos/seed/edu1/600/300',
    duration: 30,
    reward: 5,
    advertiser: '得到',
  },
  {
    type: 'education',
    title: '网易云课堂 - 编程入门',
    description: '零基础学Python，30天从小白到高手。名师授课，项目实战，就业无忧。',
    imageUrl: 'https://picsum.photos/seed/edu2/600/300',
    duration: 30,
    reward: 5,
    advertiser: '网易教育',
  },
  // 电商类广告
  {
    type: 'ecommerce',
    title: '京东 - 品质好物狂欢',
    description: '数码家电满减优惠，新品首发限时折扣。正品保障，极速配送！',
    imageUrl: 'https://picsum.photos/seed/shop1/600/300',
    duration: 15,
    reward: 3,
    advertiser: '京东',
  },
  {
    type: 'ecommerce',
    title: '淘宝 - 好货推荐',
    description: '千万好物，低价优选。今日特价专区，爆款商品低至1折起！',
    imageUrl: 'https://picsum.photos/seed/shop2/600/300',
    duration: 15,
    reward: 3,
    advertiser: '淘宝',
  },
  // 金融类广告
  {
    type: 'finance',
    title: '支付宝 - 理财新体验',
    description: '余额宝收益稳健，花呗消费更灵活。智能理财，让钱生钱更简单。',
    imageUrl: 'https://picsum.photos/seed/fin1/600/300',
    duration: 15,
    reward: 3,
    advertiser: '蚂蚁集团',
  },
  // 生活服务类广告
  {
    type: 'lifestyle',
    title: '美团外卖 - 美食到家',
    description: '新用户首单立减15元，30分钟极速送达。周边美食，一键下单！',
    imageUrl: 'https://picsum.photos/seed/life1/600/300',
    duration: 15,
    reward: 3,
    advertiser: '美团',
  },
  {
    type: 'lifestyle',
    title: '滴滴出行 - 安全出行',
    description: '打车更优惠，新用户享首单免单。专车、快车、拼车多种选择。',
    imageUrl: 'https://picsum.photos/seed/life2/600/300',
    duration: 15,
    reward: 3,
    advertiser: '滴滴',
  },
];

// ============ 广告奖励追踪 ============

// 防止重复领取奖励的追踪 Map（key: adId_userId，value: 过期时间戳）
const rewardClaims = new Map();

// 每个广告奖励的冷却时间（5 分钟内不能重复领取同一广告的奖励）
const REWARD_COOLDOWN_MS = 5 * 60 * 1000;

// 用户广告统计（内存存储，key: userId）
const userAdStats = new Map();

/**
 * 获取或初始化用户广告统计
 * @param {string} userId - 用户 ID
 * @returns {Object} 用户广告统计对象
 */
function getOrCreateAdStats(userId) {
  if (!userAdStats.has(userId)) {
    userAdStats.set(userId, {
      totalWatched: 0,          // 总观看次数
      totalPointsEarned: 0,      // 通过广告获得的总积分
      todayWatched: 0,          // 今日观看次数
      todayPointsEarned: 0,      // 今日通过广告获得的积分
      lastWatchDate: getTodayStr(), // 最后观看日期
    });
  }

  const stats = userAdStats.get(userId);

  // 如果日期变了，重置今日统计
  const today = getTodayStr();
  if (stats.lastWatchDate !== today) {
    stats.todayWatched = 0;
    stats.todayPointsEarned = 0;
    stats.lastWatchDate = today;
  }

  return stats;
}

/**
 * 获取今日日期字符串（YYYY-MM-DD 格式）
 * @returns {string} 今日日期
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// ============ 核心功能函数 ============

/**
 * 获取广告内容
 * 根据广告位类型返回合适的广告
 *
 * @param {string} userId - 用户 ID（可选，用于个性化推荐）
 * @param {string} placement - 广告位类型
 *   可选值: banner（横幅广告）| interstitial（插屏广告）| rewarded（激励视频广告）
 * @returns {Object} 广告对象
 *   { adId, type, title, description, imageUrl, duration, reward, advertiser }
 */
function getAd(userId, placement) {
  // 验证广告位类型
  const validPlacements = ['banner', 'interstitial', 'rewarded'];
  if (!placement || !validPlacements.includes(placement)) {
    throw new Error(`无效的广告位类型: ${placement}，可选值: ${validPlacements.join(', ')}`);
  }

  // 根据广告位类型筛选合适的广告
  let candidates = [...MOCK_AD_POOL];

  // 激励视频广告：优先选择时长较长、奖励较高的广告
  if (placement === 'rewarded') {
    candidates = candidates.filter((ad) => ad.duration >= 15);
    candidates.sort((a, b) => b.reward - a.reward);
  }

  // 随机选择一条广告（避免连续展示相同广告）
  const selectedAd = candidates[Math.floor(Math.random() * candidates.length)];

  // 生成广告实例 ID（每次获取都生成新的，用于追踪观看）
  const adId = uuidv4();

  console.log(`[广告服务] 返回广告: ${selectedAd.title} (广告位: ${placement}, 奖励: ${selectedAd.reward}积分)`);

  return {
    adId,
    type: selectedAd.type,
    placement,
    title: selectedAd.title,
    description: selectedAd.description,
    imageUrl: selectedAd.imageUrl,
    duration: selectedAd.duration,
    reward: selectedAd.reward,
    advertiser: selectedAd.advertiser,
  };
}

/**
 * 验证广告观看并发放奖励
 * 检查用户是否观看了足够时长的广告，验证通过后发放积分奖励
 *
 * @param {string} adId - 广告实例 ID
 * @param {string} userId - 用户 ID
 * @param {number} watchDuration - 实际观看时长（秒）
 * @returns {Object} { success, pointsEarned, newBalance, message }
 * @throws {Error} 参数缺失或验证失败时抛出异常
 */
function verifyAdWatch(adId, userId, watchDuration) {
  // 参数验证
  if (!adId) {
    throw new Error('广告 ID 不能为空');
  }

  if (!userId) {
    throw new Error('用户 ID 不能为空');
  }

  if (!watchDuration || typeof watchDuration !== 'number' || watchDuration <= 0) {
    throw new Error('请提供有效的观看时长');
  }

  // 查找广告信息（根据 adId 查找，这里简化处理：从广告池中匹配）
  // 注意：当前 Mock 实现中，我们通过 rewardClaims 来追踪广告信息
  // 实际项目中应该有广告记录存储

  // 检查是否重复领取奖励
  const claimKey = `${adId}_${userId}`;
  const now = Date.now();

  if (rewardClaims.has(claimKey)) {
    const claimInfo = rewardClaims.get(claimKey);
    if (now < claimInfo.expiresAt) {
      return {
        success: false,
        pointsEarned: 0,
        newBalance: pointsService.getBalance(userId),
        message: '该广告奖励已领取，请勿重复领取',
      };
    }
    // 过期了，允许重新领取
    rewardClaims.delete(claimKey);
  }

  // 根据广告位类型确定所需观看时长和奖励
  // 这里简化处理：假设所有广告至少需要观看 15 秒
  const requiredDuration = 15;
  const rewardPoints = 5; // 默认奖励积分

  // 验证观看时长是否足够
  if (watchDuration < requiredDuration) {
    return {
      success: false,
      pointsEarned: 0,
      newBalance: pointsService.getBalance(userId),
      message: `观看时长不足，请观看至少 ${requiredDuration} 秒`,
    };
  }

  // 发放积分奖励
  const newBalance = pointsService.addPoints(
    userId,
    rewardPoints,
    `观看广告奖励（广告ID: ${adId.slice(0, 8)}）`,
    'ad_watch',
    adId
  );

  // 记录奖励领取（防止重复）
  rewardClaims.set(claimKey, {
    adId,
    userId,
    claimedAt: now,
    expiresAt: now + REWARD_COOLDOWN_MS,
    pointsEarned: rewardPoints,
  });

  // 更新用户广告统计
  const stats = getOrCreateAdStats(userId);
  stats.totalWatched++;
  stats.totalPointsEarned += rewardPoints;
  stats.todayWatched++;
  stats.todayPointsEarned += rewardPoints;

  // 清理过期的奖励记录（防止内存泄漏）
  cleanExpiredRewardClaims();

  console.log(`[广告服务] 广告观看验证通过: 用户 ${userId} 获得 ${rewardPoints} 积分`);

  return {
    success: true,
    pointsEarned: rewardPoints,
    newBalance,
    message: `观看完成！获得 ${rewardPoints} 积分奖励`,
  };
}

/**
 * 使用指定广告信息验证观看并发放奖励
 * 用于前端传递广告详情进行精确验证
 *
 * @param {string} adId - 广告实例 ID
 * @param {string} userId - 用户 ID
 * @param {number} watchDuration - 实际观看时长（秒）
 * @param {number} requiredDuration - 要求的观看时长（秒）
 * @param {number} rewardPoints - 奖励积分数量
 * @returns {Object} { success, pointsEarned, newBalance, message }
 */
function verifyAdWatchWithDetails(adId, userId, watchDuration, requiredDuration, rewardPoints) {
  // 参数验证
  if (!adId || !userId) {
    throw new Error('广告 ID 和用户 ID 不能为空');
  }

  // 检查是否重复领取
  const claimKey = `${adId}_${userId}`;
  const now = Date.now();

  if (rewardClaims.has(claimKey)) {
    const claimInfo = rewardClaims.get(claimKey);
    if (now < claimInfo.expiresAt) {
      return {
        success: false,
        pointsEarned: 0,
        newBalance: pointsService.getBalance(userId),
        message: '该广告奖励已领取，请勿重复领取',
      };
    }
    rewardClaims.delete(claimKey);
  }

  // 验证观看时长
  if (watchDuration < requiredDuration) {
    return {
      success: false,
      pointsEarned: 0,
      newBalance: pointsService.getBalance(userId),
      message: `观看时长不足，请观看至少 ${requiredDuration} 秒`,
    };
  }

  // 发放积分奖励
  const newBalance = pointsService.addPoints(
    userId,
    rewardPoints,
    `观看广告奖励（广告ID: ${adId.slice(0, 8)}）`,
    'ad_watch',
    adId
  );

  // 记录奖励领取
  rewardClaims.set(claimKey, {
    adId,
    userId,
    claimedAt: now,
    expiresAt: now + REWARD_COOLDOWN_MS,
    pointsEarned: rewardPoints,
  });

  // 更新用户广告统计
  const stats = getOrCreateAdStats(userId);
  stats.totalWatched++;
  stats.totalPointsEarned += rewardPoints;
  stats.todayWatched++;
  stats.todayPointsEarned += rewardPoints;

  // 清理过期记录
  cleanExpiredRewardClaims();

  console.log(`[广告服务] 广告观看验证通过: 用户 ${userId} 获得 ${rewardPoints} 积分`);

  return {
    success: true,
    pointsEarned: rewardPoints,
    newBalance,
    message: `观看完成！获得 ${rewardPoints} 积分奖励`,
  };
}

/**
 * 获取用户广告统计信息
 *
 * @param {string} userId - 用户 ID
 * @returns {Object} 广告统计 { totalWatched, totalPointsEarned, todayWatched, todayPointsEarned }
 */
function getAdStats(userId) {
  if (!userId) {
    throw new Error('用户 ID 不能为空');
  }

  const stats = getOrCreateAdStats(userId);

  return {
    totalWatched: stats.totalWatched,           // 总观看广告次数
    totalPointsEarned: stats.totalPointsEarned, // 通过广告获得的总积分
    todayWatched: stats.todayWatched,           // 今日观看次数
    todayPointsEarned: stats.todayPointsEarned, // 今日通过广告获得的积分
  };
}

/**
 * 清理过期的奖励领取记录
 * 移除超过冷却时间的记录，防止内存泄漏
 */
function cleanExpiredRewardClaims() {
  const now = Date.now();
  for (const [key, value] of rewardClaims) {
    if (now >= value.expiresAt) {
      rewardClaims.delete(key);
    }
  }
}

// ============ 模块导出 ============

module.exports = {
  // 广告获取
  getAd,

  // 广告验证与奖励
  verifyAdWatch,
  verifyAdWatchWithDetails,

  // 统计信息
  getAdStats,

  // 配置常量（供外部引用）
  MOCK_AD_POOL,
  REWARD_COOLDOWN_MS,
};
