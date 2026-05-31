/**
 * routes/audio.js - 音频生成路由模块
 *
 * 功能说明：
 * - POST /generate-speech: 文字转语音（TTS）
 * - POST /generate-bgm: 生成背景音乐
 * - POST /upload-audio: 上传音频文件
 * - POST /mix-audio: 混合多个音轨
 * - GET /voices: 获取可用语音列表
 *
 * 依赖：
 * - audioService: 音频生成服务
 * - multer: 文件上传中间件
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 导入音频服务
const audioService = require('../services/audioService');

// 创建路由器实例
const router = express.Router();

// ============ 文件上传配置 ============

// 音频文件存储目录
const AUDIO_UPLOAD_DIR = path.join(__dirname, '..', 'audio');

// 确保上传目录存在
if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
  fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  // 设置文件存储目标
  destination: (req, file, cb) => {
    cb(null, AUDIO_UPLOAD_DIR);
  },
  // 设置文件名（保留原始扩展名，添加唯一前缀）
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `upload_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// 文件过滤器 - 只允许音频文件
const audioFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',       // mp3
    'audio/wav',        // wav
    'audio/ogg',        // ogg
    'audio/mp4',        // m4a
    'audio/x-m4a',      // m4a (部分浏览器)
    'audio/aac',        // aac
    'audio/flac',       // flac
    'audio/webm',       // webm
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}，仅支持音频文件`), false);
  }
};

// 创建 multer 实例
const upload = multer({
  storage: storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 最大 50MB
    files: 1,                     // 单次只允许上传一个文件
  },
});

// ============ 路由定义 ============

/**
 * POST /api/audio/generate-speech
 * 文字转语音（TTS）
 *
 * 请求体：
 * - text: string     要转换的文本内容（必填）
 * - voice: string    语音名称（male-1/female-1/male-2/female-2/narrator），默认 male-1
 * - speed: number     语速（0.5-2.0），默认 1.0
 * - pitch: number     音调（0.5-2.0），默认 1.0
 * - format: string    输出格式（mp3/wav），默认 mp3
 *
 * 返回：
 * - success: boolean   是否成功
 * - audioUrl: string   音频文件访问 URL
 * - duration: number   音频时长（秒）
 * - voice: string      使用的语音名称
 */
router.post('/generate-speech', async (req, res) => {
  try {
    const { text, voice, speed, pitch, format } = req.body;

    // 验证必填字段
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文本内容不能为空',
      });
    }

    // 文本长度限制（防止过长的文本导致处理超时）
    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: '文本内容过长，最大支持 5000 个字符',
      });
    }

    console.log(`[音频路由] 生成语音 - 文本长度: ${text.length}, 语音: ${voice || 'male-1'}`);

    // 调用音频服务生成语音
    const result = await audioService.generateSpeech({
      text: text.trim(),
      voice,
      speed,
      pitch,
      outputFormat: format,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      voice: result.voice,
      isMock: result.isMock || false,
    });
  } catch (error) {
    console.error('[音频路由] 语音生成失败:', error);
    res.status(500).json({
      success: false,
      message: '语音生成失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/audio/generate-bgm
 * 生成背景音乐
 *
 * 请求体：
 * - mood: string     情绪风格（epic/calm/happy/sad/tense），默认 calm
 * - duration: number  时长（秒），默认 30
 * - genre: string    音乐类型（orchestral/electronic/piano/ambient），默认 ambient
 *
 * 返回：
 * - success: boolean   是否成功
 * - audioUrl: string   音频文件访问 URL
 * - duration: number   音频时长（秒）
 * - mood: string       情绪风格
 */
router.post('/generate-bgm', async (req, res) => {
  try {
    const { mood, duration, genre } = req.body;

    console.log(`[音频路由] 生成背景音乐 - 情绪: ${mood || 'calm'}, 类型: ${genre || 'ambient'}`);

    // 调用音频服务生成背景音乐
    const result = await audioService.generateBackgroundMusic({
      mood,
      duration,
      genre,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      mood: result.mood,
      isMock: result.isMock || false,
    });
  } catch (error) {
    console.error('[音频路由] 背景音乐生成失败:', error);
    res.status(500).json({
      success: false,
      message: '背景音乐生成失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/audio/upload-audio
 * 上传音频文件
 *
 * 请求：
 * - multipart/form-data 格式
 * - file 字段：音频文件（必填，仅接受 audio/* 类型）
 *
 * 返回：
 * - success: boolean     是否成功
 * - audioUrl: string     音频文件访问 URL
 * - originalName: string 原始文件名
 * - size: number         文件大小（字节）
 */
router.post('/upload-audio', (req, res) => {
  // 使用 multer 处理文件上传
  upload.single('file')(req, res, (err) => {
    if (err) {
      // 处理 multer 错误
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: '上传文件大小超出限制（最大 50MB）',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: '未找到文件字段，请使用 "file" 字段上传音频',
        });
      }
      // 其他上传错误
      console.error('[音频路由] 文件上传失败:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message || '文件上传失败',
      });
    }

    try {
      // 检查是否上传了文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传一个音频文件',
        });
      }

      const file = req.file;

      console.log(`[音频路由] 音频文件上传成功: ${file.originalname}, 大小: ${(file.size / 1024).toFixed(1)}KB`);

      res.json({
        success: true,
        audioUrl: `/audio/${file.filename}`,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error) {
      console.error('[音频路由] 处理上传文件失败:', error);
      res.status(500).json({
        success: false,
        message: '处理上传文件失败',
        error: error.message,
      });
    }
  });
});

/**
 * POST /api/audio/mix-audio
 * 混合多个音轨（语音 + 背景音乐）
 *
 * 请求体：
 * - speechIds: string[]   语音文件路径数组（必填）
 * - bgmId: string         背景音乐文件路径（选填）
 * - duckVolume: number    背景音乐降低音量比例（0-1），默认 0.15
 *
 * 返回：
 * - success: boolean   是否成功
 * - audioUrl: string   混合后的音频文件访问 URL
 * - duration: number   音频时长（秒）
 */
router.post('/mix-audio', async (req, res) => {
  try {
    const { speechIds, bgmId, duckVolume } = req.body;

    // 验证必填字段
    if (!speechIds || !Array.isArray(speechIds) || speechIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个语音文件路径',
      });
    }

    // 将相对 URL 转换为绝对文件路径
    const speechFiles = speechIds.map((url) => {
      // 如果是完整 URL 路径，转换为文件系统路径
      if (url.startsWith('/audio/')) {
        return path.join(__dirname, '..', url);
      }
      // 如果已经是绝对路径，直接使用
      return url;
    });

    // 背景音乐路径转换
    let bgmPath = null;
    if (bgmId) {
      if (bgmId.startsWith('/audio/')) {
        bgmPath = path.join(__dirname, '..', bgmId);
      } else {
        bgmPath = bgmId;
      }
    }

    console.log(`[音频路由] 开始混音 - 语音文件数: ${speechFiles.length}, 背景音乐: ${bgmPath ? '有' : '无'}`);

    // 调用音频服务进行混音
    const result = await audioService.mixAudioTracks({
      speechFiles,
      backgroundMusicPath: bgmPath,
      outputFormat: 'mp3',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      isMock: result.isMock || false,
    });
  } catch (error) {
    console.error('[音频路由] 音频混音失败:', error);
    res.status(500).json({
      success: false,
      message: '音频混音失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/audio/voices
 * 获取可用语音列表
 *
 * 返回所有可用的语音选项及其描述信息
 *
 * 返回：
 * - voices: Array<{ id, name, description, gender, previewUrl }>
 */
router.get('/voices', (req, res) => {
  try {
    const voices = audioService.VOICE_INFO;

    res.json({
      success: true,
      voices: voices,
      // 额外返回服务状态信息
      serviceInfo: {
        edgeTtsAvailable: audioService.isEdgeTtsAvailable(),
        ffmpegAvailable: audioService.isFfmpegAvailable(),
        mockMode: audioService.isMockMode(),
      },
    });
  } catch (error) {
    console.error('[音频路由] 获取语音列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取语音列表失败',
      error: error.message,
    });
  }
});

// 导出路由器模块
module.exports = router;
