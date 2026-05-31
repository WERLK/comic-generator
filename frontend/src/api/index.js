import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || '请求失败，请稍后重试';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

/**
 * 获取项目列表
 * @returns {Promise} 项目列表
 */
export async function getProjects() {
  return api.get('/projects');
}

/**
 * 创建新项目
 * @param {Object} data - 项目数据
 * @param {string} data.title - 项目标题
 * @param {string} data.type - 项目类型 (text-to-comic | image-to-comic)
 * @returns {Promise} 创建的项目
 */
export async function createProject(data) {
  return api.post('/projects', data);
}

/**
 * 文字转漫画生成
 * @param {Object} data - 生成参数
 * @param {string} data.story - 故事文本
 * @param {string} data.style - 画风 (manga | comic | manhwa)
 * @param {number} data.panelCount - 分镜数量
 * @returns {Promise} 生成的漫画数据
 */
export async function generateTextToComic(data) {
  return api.post('/generate/text-to-comic', data);
}

/**
 * 图片转漫画生成
 * @param {Object} data - 生成参数
 * @param {FormData} data.image - 图片文件 (FormData)
 * @param {string} data.style - 画风 (manga | comic | watercolor | sketch)
 * @returns {Promise} 转换后的图片数据
 */
export async function generateImageToComic(data) {
  return api.post('/generate/image-to-comic', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 创建视频
 * @param {Object} data - 视频参数
 * @param {string} data.projectId - 项目 ID
 * @param {string} data.transition - 转场效果
 * @param {number} data.duration - 每页持续时间（秒）
 * @returns {Promise} 视频任务信息
 */
export async function createVideo(data) {
  return api.post('/video/create', data);
}

/**
 * 获取视频生成状态
 * @param {string} taskId - 视频任务 ID
 * @returns {Promise} 视频状态信息
 */
export async function getVideoStatus(taskId) {
  return api.get(`/video/status/${taskId}`);
}

// ===== 音频相关 =====

/**
 * 生成语音
 * @param {Object} data - 语音生成参数
 * @param {string} data.text - 要转换的文本
 * @param {string} data.voice - 音色 ID
 * @param {number} data.speed - 语速 (0.5-2.0)
 * @returns {Promise} 生成的语音数据
 */
export const generateSpeech = (data) => api.post('/audio/generate-speech', data);

/**
 * 生成背景音乐
 * @param {Object} data - BGM 生成参数
 * @param {string} data.mood - 情绪 (史诗, 平静, 欢快, 悲伤, 紧张)
 * @param {string} data.genre - 风格 (管弦乐, 电子, 钢琴, 氛围)
 * @param {number} data.duration - 时长（秒）
 * @returns {Promise} 生成的 BGM 数据
 */
export const generateBGM = (data) => api.post('/audio/generate-bgm', data);

/**
 * 上传音频文件
 * @param {FormData} formData - 包含音频文件的 FormData
 * @returns {Promise} 上传结果
 */
export const uploadAudio = (formData) => api.post('/audio/upload-audio', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

/**
 * 混合音频（语音 + BGM）
 * @param {Object} data - 混合参数
 * @param {string} data.speechUrl - 语音文件 URL
 * @param {string} data.bgmUrl - BGM 文件 URL
 * @param {number} data.bgmVolume - BGM 音量 (0-100)
 * @param {number} data.speechVolume - 语音音量 (0-100)
 * @param {boolean} data.duckBgm - 是否在语音播放时降低 BGM
 * @returns {Promise} 混合后的音频数据
 */
export const mixAudio = (data) => api.post('/audio/mix-audio', data);

/**
 * 获取可用的音色列表
 * @returns {Promise} 音色列表
 */
export const getVoices = () => api.get('/audio/voices');

/**
 * 为视频添加旁白/配音
 * @param {Object} data - 旁白参数
 * @param {string} data.videoId - 视频 ID
 * @param {Array} data.narrations - 旁白数据数组
 * @returns {Promise} 处理结果
 */
export const addNarration = (data) => api.post('/video/add-narration', data);

// ===== 认证相关 =====

/**
 * 用户注册
 * @param {Object} data - 注册数据
 * @param {string} data.username - 用户名
 * @param {string} data.email - 邮箱
 * @param {string} data.password - 密码
 * @returns {Promise} 注册结果
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * 用户登录
 * @param {Object} data - 登录数据
 * @param {string} data.username - 用户名或邮箱
 * @param {string} data.password - 密码
 * @returns {Promise} 登录结果（含 token）
 */
export const login = (data) => api.post('/auth/login', data);

/**
 * GitHub OAuth 登录
 * @param {string} code - GitHub OAuth 授权码
 * @returns {Promise} 登录结果
 */
export const oauthGithub = (code) => api.post('/auth/oauth/github', { code });

/**
 * Google OAuth 登录
 * @param {string} code - Google OAuth 授权码
 * @returns {Promise} 登录结果
 */
export const oauthGoogle = (code) => api.post('/auth/oauth/google', { code });

/**
 * 获取当前用户信息
 * @returns {Promise} 用户信息
 */
export const getMe = () => api.get('/auth/me');

/**
 * 更新用户资料
 * @param {Object} data - 用户资料
 * @returns {Promise} 更新结果
 */
export const updateProfile = (data) => api.put('/auth/profile', data);

/**
 * 修改密码
 * @param {Object} data - 密码数据
 * @param {string} data.oldPassword - 旧密码
 * @param {string} data.newPassword - 新密码
 * @returns {Promise} 修改结果
 */
export const changePassword = (data) => api.put('/auth/password', data);

// ===== 积分相关 =====

/**
 * 获取积分余额
 * @returns {Promise} 积分余额信息
 */
export const getPointsBalance = () => api.get('/points/balance');

/**
 * 获取积分历史记录
 * @param {Object} params - 查询参数
 * @param {string} params.type - 类型 (income|expense|all)
 * @param {string} params.category - 分类
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @returns {Promise} 积分历史列表
 */
export const getPointsHistory = (params) => api.get('/points/history', { params });

/**
 * 领取每日签到奖励
 * @returns {Promise} 签到结果
 */
export const claimDailyBonus = () => api.post('/points/daily-bonus');

/**
 * 获取排行榜
 * @param {number} limit - 排行榜数量限制
 * @returns {Promise} 排行榜数据
 */
export const getLeaderboard = (limit) => api.get('/points/leaderboard', { params: { limit } });

/**
 * 获取积分统计
 * @returns {Promise} 积分统计数据
 */
export const getPointsStats = () => api.get('/points/stats');

// ===== 广告相关 =====

/**
 * 获取广告
 * @param {string} placement - 广告位置
 * @returns {Promise} 广告数据
 */
export const fetchAd = (placement) => api.get('/ads/fetch', { params: { placement } });

/**
 * 验证广告观看完成
 * @param {Object} data - 验证数据
 * @param {string} data.adId - 广告 ID
 * @param {string} data.placement - 广告位置
 * @returns {Promise} 验证结果（含奖励积分）
 */
export const verifyAd = (data) => api.post('/ads/verify', data);

/**
 * 获取广告统计
 * @returns {Promise} 广告统计数据
 */
export const getAdStats = () => api.get('/ads/stats');

export default api;
