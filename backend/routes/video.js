/**
 * routes/video.js - 视频生成路由模块
 *
 * 功能说明：
 * - POST /create: 创建视频生成任务（集成 videoService）
 * - GET /status/:jobId: 查询视频生成任务状态
 * - GET /download/:jobId: 下载已完成的视频文件
 * - POST /add-narration: 为漫画页面添加旁白语音
 *
 * 重要变更：
 * - 移除原有的 Mock 实现，改为调用 videoService 进行实际视频生成
 * - 集成 audioService 提供语音合成功能
 * - 支持每页独立的语音旁白（audioUrl）
 * - 支持背景音乐文件上传
 *
 * 依赖：
 * - videoService: 视频生成服务（处理实际视频合成）
 * - audioService: 音频生成服务（处理语音合成）
 * - multer: 文件上传中间件（处理背景音乐上传）
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 导入视频生成服务
const videoService = require('../services/videoService');

// 导入音频生成服务
const audioService = require('../services/audioService');

// 创建路由器实例
const router = express.Router();

// ============ 文件上传配置 ============

// 视频相关文件存储目录
const VIDEOS_DIR = path.join(__dirname, '..', 'videos');

// 确保视频目录存在
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// 配置 multer 存储（用于背景音乐上传）
const bgmStorage = multer.diskStorage({
  // 设置文件存储目标
  destination: (req, file, cb) => {
    const audioDir = path.join(__dirname, '..', 'audio');
    // 确保音频目录存在
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    cb(null, audioDir);
  },
  // 设置文件名
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const { v4: uuidv4 } = require('uuid');
    const uniqueName = `bgm_upload_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// 背景音乐文件过滤器
const bgmFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',       // mp3
    'audio/wav',        // wav
    'audio/ogg',        // ogg
    'audio/mp4',        // m4a
    'audio/x-m4a',      // m4a
    'audio/aac',        // aac
    'audio/flac',       // flac
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的背景音乐文件类型: ${file.mimetype}`), false);
  }
};

// 创建 multer 实例（用于背景音乐上传）
const uploadBgm = multer({
  storage: bgmStorage,
  fileFilter: bgmFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 最大 100MB
    files: 1,
  },
});

// ============ 路由定义 ============

/**
 * POST /api/video/create
 * 创建视频生成任务
 *
 * 接收漫画页面数组，调用 videoService 创建视频合成任务
 *
 * 请求体：
 * - pages: 页面数组（必填）
 *   每个页面需包含:
 *   - imageUrl: string     页面图片的 URL 或本地路径（必填）
 *   - caption: string      页面文字说明（选填）
 *   - duration: number     该页展示时长秒数（选填，默认 3）
 *   - transition: string  转场效果（选填，默认 fade）
 *   - audioUrl: string     该页的旁白语音 URL（选填，用于逐页配音）
 * - options: 视频生成选项（选填）
 *   - format: string           输出格式（默认 'mp4'）
 *   - resolution: string       分辨率（默认 '1080p'）
 *   - fps: number              帧率（默认 24）
 *   - durationPerPage: number  每页展示时长秒数（默认 3）
 *   - transition: string      默认转场效果（默认 'fade'）
 *   - backgroundMusic: string 背景音乐文件路径字符串（选填）
 *
 * 文件上传：
 * - backgroundMusicFile: 背景音乐文件（选填，multipart/form-data）
 */
router.post('/create', (req, res) => {
  // 先处理文件上传，再处理 JSON 数据
  uploadBgm.single('backgroundMusicFile')(req, res, async (err) => {
    try {
      // 处理文件上传错误
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: '背景音乐文件大小超出限制（最大 100MB）',
          });
        }
        // 文件类型错误等
        console.warn('[视频路由] 背景音乐上传警告:', err.message);
        // 非关键错误，继续处理
      }

      const { pages, options = {} } = req.body;

      // 验证必填字段
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供至少一个漫画页面',
        });
      }

      // 验证每个页面是否包含必要的图片地址
      const invalidPages = pages.filter(p => !p.imageUrl);
      if (invalidPages.length > 0) {
        return res.status(400).json({
          success: false,
          message: `${invalidPages.length} 个页面缺少 imageUrl 字段`,
        });
      }

      // 处理背景音乐来源
      // 优先使用上传的文件，其次使用请求体中指定的路径
      let bgmPath = null;
      if (req.file) {
        // 通过文件上传接收的背景音乐
        bgmPath = req.file.path;
        console.log(`[视频路由] 使用上传的背景音乐: ${req.file.originalname}`);
      } else if (options.backgroundMusic && typeof options.backgroundMusic === 'string') {
        // 使用请求体中指定的背景音乐路径
        bgmPath = options.backgroundMusic;
        console.log(`[视频路由] 使用指定的背景音乐路径: ${bgmPath}`);
      }

      console.log(`[视频路由] 创建视频任务 - 页面数: ${pages.length}, 背景音乐: ${bgmPath ? '有' : '无'}`);

      // 构建视频生成选项
      const videoOptions = {
        format: options.format || 'mp4',
        resolution: options.resolution || '1080p',
        fps: options.fps || 24,
        durationPerPage: options.durationPerPage || 3,
        transition: options.transition || 'fade',
        backgroundMusic: bgmPath, // 传递背景音乐文件路径（字符串）
      };

      // 调用 videoService 创建视频任务
      const job = await videoService.createVideoFromPages(pages, videoOptions);

      res.status(202).json({
        success: true,
        message: '视频生成任务已创建，正在处理中',
        data: {
          jobId: job.id,
          status: job.status,
          estimatedDuration: job.estimatedDuration,
          checkStatusUrl: `/api/video/status/${job.id}`,
          isMockMode: videoService.isMockMode(),
        },
      });
    } catch (error) {
      console.error('[视频路由] 创建视频任务失败:', error);
      res.status(500).json({
        success: false,
        message: '创建视频生成任务失败',
        error: error.message,
      });
    }
  });
});

/**
 * GET /api/video/status/:jobId
 * 查询视频生成任务状态
 *
 * 路径参数：
 * - jobId: 任务唯一标识符
 *
 * 返回任务当前状态、进度百分比、已处理页数等信息
 * 通过 videoService.getJobStatus() 获取
 */
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;

    // 调用 videoService 查询任务状态
    const status = videoService.getJobStatus(jobId);

    // 任务不存在时返回 404
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '视频生成任务不存在',
      });
    }

    // 构建响应数据
    const response = {
      success: true,
      data: {
        id: status.id,
        status: status.status,
        progress: status.progress,
        totalPages: status.totalPages,
        processedPages: status.processedPages,
        options: status.options,
        estimatedDuration: status.estimatedDuration,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
      },
    };

    // 如果任务已完成，附加视频下载信息
    if (status.status === 'completed') {
      response.data.videoUrl = status.videoUrl;
      response.data.fileSize = status.fileSize;
      response.data.completedAt = status.completedAt;
      response.data.downloadUrl = `/api/video/download/${status.id}`;
    }

    // 如果任务失败，附加错误信息
    if (status.status === 'failed') {
      response.data.error = status.error;
    }

    res.json(response);
  } catch (error) {
    console.error('[视频路由] 查询状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询任务状态失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/video/download/:jobId
 * 下载已完成的视频文件
 *
 * 路径参数：
 * - jobId: 任务唯一标识符
 *
 * 仅当任务状态为 'completed' 时允许下载
 * 从 videos/ 目录读取实际视频文件并返回
 */
router.get('/download/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;

    // 调用 videoService 查询任务状态
    const status = videoService.getJobStatus(jobId);

    // 任务不存在时返回 404
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '视频生成任务不存在',
      });
    }

    // 任务未完成时返回错误
    if (status.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `视频尚未生成完成，当前状态: ${status.status}，进度: ${status.progress}%`,
      });
    }

    // 检查视频文件是否存在
    if (!status.videoUrl) {
      return res.status(404).json({
        success: false,
        message: '视频文件路径不存在',
      });
    }

    // 将 URL 路径转换为文件系统路径
    const videoFilePath = path.join(__dirname, '..', status.videoUrl);

    if (!fs.existsSync(videoFilePath)) {
      return res.status(404).json({
        success: false,
        message: '视频文件不存在于服务器上',
      });
    }

    // 获取文件信息
    const stats = fs.statSync(videoFilePath);
    const filename = path.basename(videoFilePath);

    console.log(`[视频路由] 下载视频: ${filename}, 大小: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`);

    // 设置响应头并发送文件
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // 使用流式传输发送文件
    const fileStream = fs.createReadStream(videoFilePath);
    fileStream.pipe(res);

    // 处理流错误
    fileStream.on('error', (streamError) => {
      console.error('[视频路由] 文件流传输错误:', streamError.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '视频文件传输失败',
          error: streamError.message,
        });
      }
    });
  } catch (error) {
    console.error('[视频路由] 下载失败:', error);
    res.status(500).json({
      success: false,
      message: '视频下载失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/video/add-narration
 * 为漫画页面添加旁白语音
 *
 * 接收页面数组，为每个页面生成语音旁白
 * 使用 audioService.generateSpeech 进行语音合成
 *
 * 请求体：
 * - pages: 页面数组（必填）
 *   每个页面需包含:
 *   - imageUrl: string  页面图片 URL（用于标识页面）
 *   - text: string     旁白文本内容（必填）
 *   - voice: string    语音名称（选填，默认 narrator）
 */
router.post('/add-narration', async (req, res) => {
  try {
    const { pages } = req.body;

    // 验证必填字段
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个页面',
      });
    }

    // 验证每个页面是否包含旁白文本
    const pagesWithoutText = pages.filter(p => !p.text || p.text.trim() === '');
    if (pagesWithoutText.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${pagesWithoutText.length} 个页面缺少旁白文本（text 字段）`,
      });
    }

    console.log(`[视频路由] 开始生成旁白语音 - 页面数: ${pages.length}`);

    // 为每个页面生成语音
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const voice = page.voice || 'narrator'; // 默认使用旁白语音

      console.log(`[视频路由] 正在为第 ${i + 1}/${pages.length} 个页面生成语音...`);

      try {
        const result = await audioService.generateSpeech({
          text: page.text.trim(),
          voice: voice,
          speed: 1.0,
          pitch: 1.0,
          outputFormat: 'mp3',
        });

        results.push({
          imageUrl: page.imageUrl,
          text: page.text,
          voice: voice,
          audioUrl: result.audioUrl,
          duration: result.duration,
          success: result.success,
          isMock: result.isMock || false,
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`[视频路由] 第 ${i + 1} 个页面语音生成失败:`, error.message);
        results.push({
          imageUrl: page.imageUrl,
          text: page.text,
          voice: voice,
          audioUrl: null,
          duration: 0,
          success: false,
          error: error.message,
        });
        failCount++;
      }
    }

    console.log(`[视频路由] 旁白语音生成完成 - 成功: ${successCount}, 失败: ${failCount}`);

    res.json({
      success: true,
      message: `旁白语音生成完成（成功 ${successCount} 个，失败 ${failCount} 个）`,
      data: {
        pages: results,
        total: pages.length,
        successCount: successCount,
        failCount: failCount,
      },
    });
  } catch (error) {
    console.error('[视频路由] 旁白语音生成失败:', error);
    res.status(500).json({
      success: false,
      message: '旁白语音生成失败',
      error: error.message,
    });
  }
});

// 导出路由器模块
module.exports = router;
