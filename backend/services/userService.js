/**
 * services/userService.js - 用户管理服务模块
 *
 * 功能说明：
 * - 用户注册与登录（本地密码认证）
 * - OAuth 第三方登录（GitHub、Google）
 * - 用户信息查询与更新
 * - 密码修改
 * - 积分排行榜
 * - 用户数据持久化（JSON 文件存储）
 *
 * 数据存储：
 * - 使用内存 Map 存储用户数据
 * - 通过 users.json 文件进行持久化
 * - 密码使用 bcryptjs 进行哈希加密
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ============ 数据存储 ============

// 用户数据存储（内存 Map，key 为用户 ID）
const users = new Map();

// 积分交易记录存储（内存数组）
const transactions = [];

// 数据文件路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============ 辅助函数 ============

/**
 * 从用户对象中移除敏感字段（密码等）
 * @param {Object} user - 用户对象
 * @returns {Object} 不含密码的用户对象
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * 根据积分计算用户等级
 * 等级规则：每 500 积分升一级
 * @param {number} points - 当前积分
 * @returns {number} 用户等级
 */
function calculateLevel(points) {
  if (points < 100) return 1;
  if (points < 500) return 2;
  if (points < 1000) return 3;
  if (points < 2000) return 4;
  if (points < 5000) return 5;
  if (points < 10000) return 6;
  if (points < 20000) return 7;
  if (points < 50000) return 8;
  if (points < 100000) return 9;
  return 10;
}

// ============ 核心功能函数 ============

/**
 * 用户注册
 * 创建新用户，对密码进行哈希加密，赠送 100 注册积分
 *
 * @param {Object} params - 注册参数
 * @param {string} params.username - 用户名（3-20 字符）
 * @param {string} params.email - 邮箱地址
 * @param {string} params.password - 密码（6 位以上）
 * @returns {Object} 注册成功的用户对象（不含密码）
 * @throws {Error} 用户名或邮箱已存在时抛出错误
 */
async function register({ username, email, password }) {
  // 输入验证
  if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 20) {
    throw new Error('用户名长度应在 3-20 个字符之间');
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('请输入有效的邮箱地址');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('密码长度至少 6 个字符');
  }

  const trimmedUsername = username.trim().toLowerCase();
  const trimmedEmail = email.trim().toLowerCase();

  // 检查用户名是否已存在
  for (const [, existingUser] of users) {
    if (existingUser.username === trimmedUsername) {
      throw new Error('该用户名已被注册');
    }
    if (existingUser.email === trimmedEmail) {
      throw new Error('该邮箱已被注册');
    }
  }

  // 对密码进行哈希加密（salt 轮次为 10）
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户对象
  const now = new Date().toISOString();
  const user = {
    id: uuidv4(),
    username: trimmedUsername,
    email: trimmedEmail,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${trimmedUsername}`,
    points: 100, // 注册赠送 100 积分
    level: 1,
    createdAt: now,
    lastLoginAt: now,
    oauthProviders: [],
    preferences: {
      theme: 'dark',
      language: 'zh-CN',
    },
  };

  // 存入内存
  users.set(user.id, user);

  // 创建注册积分交易记录
  transactions.push({
    id: uuidv4(),
    userId: user.id,
    type: 'earn',
    amount: 100,
    reason: '注册赠送积分',
    category: 'register_bonus',
    createdAt: now,
    relatedId: null,
  });

  // 持久化到文件
  saveToFile();

  console.log(`[用户服务] 新用户注册成功: ${user.username} (ID: ${user.id})`);

  // 返回不含密码的用户对象
  return sanitizeUser(user);
}

/**
 * 用户名密码登录
 * 验证用户名和密码，更新最后登录时间
 *
 * @param {Object} params - 登录参数
 * @param {string} params.username - 用户名
 * @param {string} params.password - 密码
 * @returns {Object} 登录成功的用户对象（不含密码）
 * @throws {Error} 用户名或密码错误时抛出异常
 */
async function login({ username, password }) {
  if (!username || !password) {
    throw new Error('请输入用户名和密码');
  }

  // 查找用户
  let foundUser = null;
  const trimmedUsername = username.trim().toLowerCase();
  for (const [, user] of users) {
    if (user.username === trimmedUsername) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    throw new Error('用户名或密码错误');
  }

  // 验证密码
  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (!isMatch) {
    throw new Error('用户名或密码错误');
  }

  // 更新最后登录时间
  foundUser.lastLoginAt = new Date().toISOString();
  saveToFile();

  console.log(`[用户服务] 用户登录成功: ${foundUser.username} (ID: ${foundUser.id})`);

  return sanitizeUser(foundUser);
}

/**
 * 邮箱密码登录
 * 使用邮箱和密码进行登录验证
 *
 * @param {Object} params - 登录参数
 * @param {string} params.email - 邮箱地址
 * @param {string} params.password - 密码
 * @returns {Object} 登录成功的用户对象（不含密码）
 * @throws {Error} 邮箱或密码错误时抛出异常
 */
async function loginByEmail({ email, password }) {
  if (!email || !password) {
    throw new Error('请输入邮箱和密码');
  }

  // 查找用户
  let foundUser = null;
  const trimmedEmail = email.trim().toLowerCase();
  for (const [, user] of users) {
    if (user.email === trimmedEmail) {
      foundUser = user;
      break;
    }
  }

  if (!foundUser) {
    throw new Error('邮箱或密码错误');
  }

  // 验证密码
  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (!isMatch) {
    throw new Error('邮箱或密码错误');
  }

  // 更新最后登录时间
  foundUser.lastLoginAt = new Date().toISOString();
  saveToFile();

  console.log(`[用户服务] 用户邮箱登录成功: ${foundUser.username} (ID: ${foundUser.id})`);

  return sanitizeUser(foundUser);
}

/**
 * OAuth 第三方登录
 * 通过第三方 OAuth 提供商登录，如果用户不存在则自动创建
 *
 * @param {Object} params - OAuth 登录参数
 * @param {string} params.provider - 提供商名称（github/google）
 * @param {string} params.providerId - 提供商用户 ID
 * @param {string} params.email - 用户邮箱
 * @param {string} params.name - 用户显示名称
 * @param {string} params.avatar - 用户头像 URL
 * @returns {Object} { user, isNew } - 用户对象和是否为新用户
 */
async function oauthLogin({ provider, providerId, email, name, avatar }) {
  // 验证参数
  if (!provider || !providerId) {
    throw new Error('缺少 OAuth 提供商信息');
  }

  const validProviders = ['github', 'google'];
  if (!validProviders.includes(provider)) {
    throw new Error(`不支持的 OAuth 提供商: ${provider}，可选值: ${validProviders.join(', ')}`);
  }

  // 查找是否已有绑定该 OAuth 的用户
  let foundUser = null;
  for (const [, user] of users) {
    if (user.oauthProviders) {
      const match = user.oauthProviders.find(
        (p) => p.provider === provider && p.providerId === String(providerId)
      );
      if (match) {
        foundUser = user;
        break;
      }
    }
  }

  // 如果找到已绑定的用户，直接登录
  if (foundUser) {
    foundUser.lastLoginAt = new Date().toISOString();
    saveToFile();
    console.log(`[用户服务] OAuth 登录成功（已有用户）: ${foundUser.username} (ID: ${foundUser.id})`);
    return { user: sanitizeUser(foundUser), isNew: false };
  }

  // 检查邮箱是否已被注册
  if (email) {
    const trimmedEmail = email.trim().toLowerCase();
    for (const [, user] of users) {
      if (user.email === trimmedEmail) {
        // 将 OAuth 绑定到已有账户
        user.oauthProviders.push({
          provider,
          providerId: String(providerId),
        });
        if (avatar) user.avatar = avatar;
        user.lastLoginAt = new Date().toISOString();
        saveToFile();
        console.log(`[用户服务] OAuth 绑定到已有账户: ${user.username} (ID: ${user.id})`);
        return { user: sanitizeUser(user), isNew: false };
      }
    }
  }

  // 创建新用户
  const now = new Date().toISOString();
  const username = (name || `${provider}_user_${providerId}`).replace(/\s+/g, '_').toLowerCase();
  const uniqueUsername = await generateUniqueUsername(username);

  const newUser = {
    id: uuidv4(),
    username: uniqueUsername,
    email: email ? email.trim().toLowerCase() : `${uniqueUsername}@oauth.local`,
    password: await bcrypt.hash(uuidv4(), 10), // OAuth 用户生成随机密码
    avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uniqueUsername}`,
    points: 100, // 注册赠送 100 积分
    level: 1,
    createdAt: now,
    lastLoginAt: now,
    oauthProviders: [
      {
        provider,
        providerId: String(providerId),
      },
    ],
    preferences: {
      theme: 'dark',
      language: 'zh-CN',
    },
  };

  users.set(newUser.id, newUser);

  // 创建注册积分交易记录
  transactions.push({
    id: uuidv4(),
    userId: newUser.id,
    type: 'earn',
    amount: 100,
    reason: '注册赠送积分（OAuth）',
    category: 'register_bonus',
    createdAt: now,
    relatedId: null,
  });

  saveToFile();

  console.log(`[用户服务] OAuth 新用户创建成功: ${newUser.username} (ID: ${newUser.id})`);

  return { user: sanitizeUser(newUser), isNew: true };
}

/**
 * 生成唯一的用户名（避免重复）
 * @param {string} baseUsername - 基础用户名
 * @returns {Promise<string>} 唯一的用户名
 */
async function generateUniqueUsername(baseUsername) {
  let username = baseUsername.slice(0, 20);
  let counter = 1;

  // 检查用户名是否已存在
  const exists = () => {
    for (const [, user] of users) {
      if (user.username === username) return true;
    }
    return false;
  };

  while (exists()) {
    const suffix = `_${counter}`;
    username = baseUsername.slice(0, 20 - suffix.length) + suffix;
    counter++;
  }

  return username;
}

/**
 * 根据用户 ID 获取用户信息（不含密码）
 *
 * @param {string} id - 用户 ID
 * @returns {Object|null} 用户对象（不含密码），不存在返回 null
 */
function getUserById(id) {
  const user = users.get(id);
  return user ? sanitizeUser(user) : null;
}

/**
 * 根据用户名获取用户信息
 *
 * @param {string} username - 用户名
 * @returns {Object|null} 用户对象（不含密码），不存在返回 null
 */
function getUserByUsername(username) {
  const trimmedUsername = username.trim().toLowerCase();
  for (const [, user] of users) {
    if (user.username === trimmedUsername) {
      return sanitizeUser(user);
    }
  }
  return null;
}

/**
 * 更新用户信息
 *
 * @param {string} id - 用户 ID
 * @param {Object} updates - 要更新的字段
 * @param {string} updates.username - 新用户名（可选）
 * @param {string} updates.avatar - 新头像 URL（可选）
 * @param {Object} updates.preferences - 偏好设置（可选）
 * @returns {Object} 更新后的用户对象（不含密码）
 * @throws {Error} 用户不存在或用户名冲突时抛出异常
 */
function updateUser(id, updates) {
  const user = users.get(id);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 更新用户名（需检查唯一性）
  if (updates.username !== undefined) {
    const trimmedUsername = updates.username.trim().toLowerCase();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      throw new Error('用户名长度应在 3-20 个字符之间');
    }
    if (trimmedUsername !== user.username) {
      for (const [uid, existingUser] of users) {
        if (uid !== id && existingUser.username === trimmedUsername) {
          throw new Error('该用户名已被使用');
        }
      }
      user.username = trimmedUsername;
    }
  }

  // 更新头像
  if (updates.avatar !== undefined) {
    user.avatar = updates.avatar;
  }

  // 更新偏好设置（深度合并）
  if (updates.preferences !== undefined) {
    user.preferences = {
      ...user.preferences,
      ...updates.preferences,
    };
  }

  // 更新等级（根据积分重新计算）
  user.level = calculateLevel(user.points);

  saveToFile();

  console.log(`[用户服务] 用户信息已更新: ${user.username} (ID: ${user.id})`);

  return sanitizeUser(user);
}

/**
 * 修改密码
 * 验证旧密码后设置新密码
 *
 * @param {string} id - 用户 ID
 * @param {string} oldPassword - 旧密码
 * @param {string} newPassword - 新密码（6 位以上）
 * @returns {Object} 更新后的用户对象（不含密码）
 * @throws {Error} 旧密码错误或新密码不符合要求时抛出异常
 */
async function changePassword(id, oldPassword, newPassword) {
  const user = users.get(id);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证旧密码
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error('旧密码错误');
  }

  // 验证新密码
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new Error('新密码长度至少 6 个字符');
  }

  // 哈希新密码并保存
  user.password = await bcrypt.hash(newPassword, 10);
  saveToFile();

  console.log(`[用户服务] 用户密码已修改: ${user.username} (ID: ${user.id})`);

  return sanitizeUser(user);
}

/**
 * 获取所有用户列表
 * 用于管理后台或排行榜展示
 *
 * @returns {Array} 用户对象数组（不含密码）
 */
function getAllUsers() {
  const userList = [];
  for (const [, user] of users) {
    userList.push(sanitizeUser(user));
  }
  return userList;
}

/**
 * 获取积分排行榜
 * 按积分从高到低排序，返回前 N 名用户
 *
 * @param {number} limit - 返回数量限制（默认 10）
 * @returns {Array} 排行榜数组 [{ rank, username, avatar, points, level }]
 */
function getLeaderboard(limit = 10) {
  // 将所有用户转为数组并按积分降序排序
  const sortedUsers = Array.from(users.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);

  // 构建排行榜数据
  return sortedUsers.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    points: user.points,
    level: user.level,
  }));
}

/**
 * 获取积分交易记录（内部使用，供 pointsService 调用）
 *
 * @param {string} userId - 用户 ID
 * @returns {Array} 该用户的交易记录数组
 */
function getTransactions(userId) {
  return transactions.filter((t) => t.userId === userId);
}

/**
 * 添加积分交易记录（内部使用，供 pointsService 调用）
 *
 * @param {Object} record - 交易记录
 * @returns {Object} 创建的交易记录
 */
function addTransaction(record) {
  const transaction = {
    id: uuidv4(),
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };
  transactions.push(transaction);
  return transaction;
}

/**
 * 直接更新用户积分（内部使用，供 pointsService 调用）
 *
 * @param {string} userId - 用户 ID
 * @param {number} newPoints - 新的积分值
 * @returns {Object} 更新后的用户对象
 */
function updateUserPoints(userId, newPoints) {
  const user = users.get(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  user.points = Math.max(0, newPoints); // 积分不能为负数
  user.level = calculateLevel(user.points);
  return user;
}

// ============ 数据持久化 ============

/**
 * 将数据保存到 JSON 文件
 * 包含用户数据和交易记录
 */
function saveToFile() {
  try {
    // 序列化用户数据（Map 转数组）
    const usersData = Array.from(users.entries()).map(([id, user]) => ({
      ...user,
      id,
    }));

    // 写入用户数据
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');

    // 写入交易记录
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
  } catch (error) {
    console.error('[用户服务] 数据保存失败:', error.message);
  }
}

/**
 * 从 JSON 文件加载数据
 * 在服务启动时调用，恢复内存中的用户数据和交易记录
 */
function loadFromFile() {
  try {
    // 加载用户数据
    if (fs.existsSync(USERS_FILE)) {
      const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      users.clear();
      for (const userData of usersData) {
        users.set(userData.id, userData);
      }
      console.log(`[用户服务] 已加载 ${users.size} 个用户数据`);
    }

    // 加载交易记录
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      const txData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf-8'));
      transactions.length = 0; // 清空现有记录
      transactions.push(...txData);
      console.log(`[用户服务] 已加载 ${transactions.length} 条交易记录`);
    }
  } catch (error) {
    console.error('[用户服务] 数据加载失败:', error.message);
  }
}

// ============ 初始化 ============

// 启动时自动加载数据
loadFromFile();

// ============ 模块导出 ============

module.exports = {
  // 用户管理
  register,
  login,
  loginByEmail,
  oauthLogin,
  getUserById,
  getUserByUsername,
  updateUser,
  changePassword,
  getAllUsers,
  getLeaderboard,

  // 积分相关（供 pointsService 调用）
  getTransactions,
  addTransaction,
  updateUserPoints,

  // 数据持久化
  saveToFile,
  loadFromFile,

  // 工具函数
  sanitizeUser,
  calculateLevel,
};
