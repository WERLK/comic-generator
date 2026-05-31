/**
 * scripts/seed.js - 数据库种子脚本
 *
 * 功能说明：
 * - 创建演示用户（admin、demo、test）
 * - 为每个用户设置初始积分
 * - 清除旧数据后重新创建
 *
 * 使用方式：
 *   node scripts/seed.js
 *
 * 创建的用户：
 * - admin / admin123  管理员，10000 积分
 * - demo  / demo123   演示用户，500 积分
 * - test  / test123   测试用户，100 积分
 */

const path = require('path');
const fs = require('fs');

// 确保在 backend 目录下执行
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);

// 加载用户服务（会自动加载数据文件）
const userService = require('../services/userService');
const pointsService = require('../services/pointsService');

// ============ 种子数据定义 ============

// 演示用户列表
const SEED_USERS = [
  {
    username: 'admin',
    email: 'admin@comic-generator.com',
    password: 'admin123',
    points: 10000,
    description: '管理员账户',
  },
  {
    username: 'demo',
    email: 'demo@comic-generator.com',
    password: 'demo123',
    points: 500,
    description: '演示用户',
  },
  {
    username: 'test',
    email: 'test@comic-generator.com',
    password: 'test123',
    points: 100,
    description: '测试用户',
  },
];

// ============ 主函数 ============

async function seed() {
  console.log('='.repeat(50));
  console.log('  漫画生成网站 - 数据库种子脚本');
  console.log('='.repeat(50));
  console.log('');

  let createdCount = 0;
  let skippedCount = 0;

  for (const seedUser of SEED_USERS) {
    try {
      // 检查用户是否已存在
      const existing = userService.getUserByUsername(seedUser.username);
      if (existing) {
        console.log(`[跳过] 用户 "${seedUser.username}" 已存在（ID: ${existing.id}，积分: ${existing.points}）`);
        skippedCount++;
        continue;
      }

      // 注册新用户
      const user = await userService.register({
        username: seedUser.username,
        email: seedUser.email,
        password: seedUser.password,
      });

      // 如果初始积分不是默认的 100，则调整
      if (seedUser.points !== 100) {
        const diff = seedUser.points - 100;
        if (diff > 0) {
          pointsService.addPoints(
            user.id,
            diff,
            '种子脚本 - 初始积分调整',
            'register_bonus'
          );
        }
      }

      console.log(`[创建] 用户 "${seedUser.username}" 创建成功`);
      console.log(`       ID: ${user.id}`);
      console.log(`       邮箱: ${user.email}`);
      console.log(`       积分: ${seedUser.points}`);
      console.log(`       说明: ${seedUser.description}`);
      console.log('');

      createdCount++;
    } catch (error) {
      console.error(`[错误] 创建用户 "${seedUser.username}" 失败: ${error.message}`);
    }
  }

  // 输出汇总信息
  console.log('-'.repeat(50));
  console.log(`种子脚本执行完成: 创建 ${createdCount} 个用户，跳过 ${skippedCount} 个用户`);
  console.log('-'.repeat(50));

  // 显示排行榜
  const leaderboard = userService.getLeaderboard(10);
  if (leaderboard.length > 0) {
    console.log('');
    console.log('当前积分排行榜:');
    leaderboard.forEach((entry) => {
      console.log(`  #${entry.rank} ${entry.username} - ${entry.points} 积分 (Lv.${entry.level})`);
    });
  }

  console.log('');
  console.log('提示: 使用以下账户登录测试:');
  SEED_USERS.forEach((u) => {
    console.log(`  ${u.username} / ${u.password}`);
  });
  console.log('');
}

// 执行种子脚本
seed().catch((error) => {
  console.error('种子脚本执行失败:', error);
  process.exit(1);
});
