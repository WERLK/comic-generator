/**
 * server.js - 漫画生成网站后端主服务文件
 *
 * 功能说明：
 * - 初始化 Express 应用
 * - 配置 CORS 跨域支持
 * - 配置 JSON 请求体解析
 * - 配置静态文件服务（用于访问上传的文件）
 * - 挂载各业务路由模块
 * - 启动 HTTP 服务器
 */

// 加载环境变量配置文件
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// 创建 Express 应用实例
const app = express();

// ============ 中间件配置 ============

// 启用 CORS 跨域支持，允许所有来源访问（开发阶段配置）
app.use(cors());

// 解析 JSON 格式的请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 配置静态文件服务 - 将 uploads 目录映射为可访问的静态资源路径
// 这样前端可以通过 /uploads/xxx.png 的方式访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 配置音频文件静态服务 - 将 audio 目录映射为可访问的静态资源路径
// 这样前端可以通过 /audio/xxx.mp3 的方式访问生成的音频文件
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// 配置视频文件静态服务 - 将 videos 目录映射为可访问的静态资源路径
// 这样前端可以通过 /videos/xxx.mp4 的方式访问生成的视频文件
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// ============ 路由挂载 ============

// 项目管理路由 - 负责漫画项目的增删改查及页面管理
const projectsRouter = require('./routes/projects');
app.use('/api/projects', projectsRouter);

// AI 生成路由 - 负责文字转漫画、图片转漫画、风格迁移等功能
const generateRouter = require('./routes/generate');
app.use('/api/generate', generateRouter);

// 视频生成路由 - 负责将漫画页面合成为视频
const videoRouter = require('./routes/video');
app.use('/api/video', videoRouter);

// 音频生成路由 - 负责语音合成、背景音乐生成、音频混音等功能
const audioRouter = require('./routes/audio');
app.use('/api/audio', audioRouter);

// 用户认证路由 - 负责注册、登录、OAuth、个人资料管理
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// 积分管理路由 - 负责积分余额、交易历史、每日签到、排行榜
const pointsRouter = require('./routes/points');
app.use('/api/points', pointsRouter);

// 广告路由 - 负责广告获取、观看验证、广告统计
const adsRouter = require('./routes/ads');
app.use('/api/ads', adsRouter);

// ============ 根路由 ============

// 健康检查接口，用于确认服务是否正常运行
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '漫画生成网站后端服务正在运行',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============ 404 处理 ============

// 捕获所有未匹配的路由，返回 404 错误
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `请求的路径 ${req.originalUrl} 不存在`
  });
});

// ============ 错误处理中间件 ============

// 全局错误处理中间件，捕获所有未处理的异常
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);

  // Multer 文件上传大小超限错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '上传文件大小超出限制'
    });
  }

  // Multer 文件数量超限错误
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: '上传文件数量超出限制'
    });
  }

  // Multer 未提供文件的错误
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: '未预期的文件字段名称'
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ 启动服务器 ============

// 从环境变量获取端口号，默认使用 3001
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`  漫画生成网站后端服务已启动`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  上传目录: ${path.join(__dirname, 'uploads')}`);
  console.log('='.repeat(50));
});

// 导出 app 实例，便于测试时使用
module.exports = app;
