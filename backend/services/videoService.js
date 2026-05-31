/**
 * services/videoService.js - 视频生成服务模块
 *
 * 功能说明：
 * - 将漫画页面合成为视频文件
 * - 支持多种转场效果（淡入淡出、左滑入、右滑入、缩放、无）
 * - 支持添加背景音乐
 * - 支持自定义分辨率、帧率等参数
 * - 提供 Mock 模式用于开发和测试
 *
 * 依赖：
 * - fluent-ffmpeg：视频合成核心库
 * - uuid：生成唯一任务 ID
 */

const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// ============ 配置常量 ============

// 视频输出目录（相对于项目根目录）
const VIDEOS_DIR = path.join(__dirname, '..', 'videos');

// 分辨率映射表
const RESOLUTION_MAP = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

// 转场效果映射（ffmpeg xfade filter 参数）
const TRANSITION_MAP = {
  'fade': 'fade',
  'slide-left': 'slideleft',
  'slide-right': 'slideright',
  'zoom': 'zoomin',
  'none': 'fade', // 无转场时使用极短的 fade
};

// 转场默认持续时间（秒）
const TRANSITION_DURATION = 0.5;

// 是否启用 Mock 模式（当 ffmpeg 不可用时自动启用）
let MOCK_MODE = false;

// 尝试检测 ffmpeg 是否可用
try {
  ffmpeg.getAvailableFormats((err) => {
    if (err) {
      console.warn('[视频服务] ffmpeg 不可用，将使用 Mock 模式');
      MOCK_MODE = true;
    }
  });
} catch (e) {
  console.warn('[视频服务] ffmpeg 检测失败，将使用 Mock 模式');
  MOCK_MODE = true;
}

// ============ 内存任务存储 ============

// 使用 Map 存储所有视频生成任务的状态
const videoJobs = new Map();

// ============ 辅助函数 ============

/**
 * 确保视频输出目录存在
 * 如果目录不存在则创建
 */
function ensureVideosDir() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    console.log(`[视频服务] 创建视频输出目录: ${VIDEOS_DIR}`);
  }
}

/**
 * 清理过期的视频文件
 * 删除超过 24 小时的视频文件，释放磁盘空间
 */
function cleanupOldFiles() {
  ensureVideosDir();

  try {
    const files = fs.readdirSync(VIDEOS_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时（毫秒）

    files.forEach((file) => {
      const filePath = path.join(VIDEOS_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`[视频服务] 清理过期文件: ${file}`);
        }
      } catch (e) {
        // 忽略单个文件删除失败的错误
        console.warn(`[视频服务] 清理文件失败: ${file}`, e.message);
      }
    });
  } catch (e) {
    console.warn('[视频服务] 清理目录失败:', e.message);
  }
}

/**
 * 计算视频总时长（秒）
 * @param {Array} pages - 页面数组，每页包含 duration 字段
 * @returns {number} 总时长（秒）
 */
function calculateTotalDuration(pages) {
  return pages.reduce((sum, page) => sum + (page.duration || 3), 0);
}

// ============ 核心功能：创建视频 ============

/**
 * 从漫画页面数组创建视频
 *
 * @param {Array} pages - 页面对象数组
 *   每个页面对象需包含：
 *   - imageUrl: string  页面图片的 URL 或本地路径
 *   - duration: number  该页展示时长（秒），默认 3 秒
 *   - transition: string 转场效果（fade/slide-left/slide-right/zoom/none），默认 fade
 * @param {Object} options - 全局视频选项
 *   - resolution: string  输出分辨率（1080p/720p/480p），默认 1080p
 *   - fps: number  帧率（24/30/60），默认 24
 *   - backgroundMusic: string  背景音乐文件路径（可选）
 *   - format: string  输出格式（mp4），默认 mp4
 * @returns {Promise<Object>} 任务对象，包含 id 和 status
 */
async function createVideoFromPages(pages, options = {}) {
  // 确保输出目录存在并清理旧文件
  ensureVideosDir();
  cleanupOldFiles();

  // 生成唯一任务 ID
  const jobId = uuidv4();

  // 解析分辨率设置
  const resolution = RESOLUTION_MAP[options.resolution || '1080p'] || RESOLUTION_MAP['1080p'];
  const fps = options.fps || 24;
  const format = options.format || 'mp4';

  // 构建输出文件路径
  const outputPath = path.join(VIDEOS_DIR, `video_${jobId}.${format}`);

  // 初始化任务对象
  const job = {
    id: jobId,
    status: 'pending',       // 初始状态：等待中
    progress: 0,             // 进度百分比
    totalPages: pages.length, // 总页数
    processedPages: 0,        // 已处理页数
    options: {
      resolution: options.resolution || '1080p',
      fps,
      format,
      backgroundMusic: !!options.backgroundMusic,
    },
    estimatedDuration: `${calculateTotalDuration(pages)} 秒`,
    outputPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 将任务存入内存
  videoJobs.set(jobId, job);

  // 根据模式选择处理方式
  if (MOCK_MODE) {
    // Mock 模式：模拟视频生成过程
    _mockVideoGeneration(jobId, pages);
  } else {
    // 真实模式：使用 ffmpeg 生成视频
    _realVideoGeneration(jobId, pages, options, outputPath, resolution, fps, format);
  }

  return job;
}

/**
 * 真实视频生成（使用 fluent-ffmpeg）
 *
 * @param {string} jobId - 任务 ID
 * @param {Array} pages - 页面数组
 * @param {Object} options - 视频选项
 * @param {string} outputPath - 输出文件路径
 * @param {Object} resolution - 分辨率对象 {width, height}
 * @param {number} fps - 帧率
 * @param {string} format - 输出格式
 */
function _realVideoGeneration(jobId, pages, options, outputPath, resolution, fps, format) {
  const job = videoJobs.get(jobId);
  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  try {
    // 创建 ffmpeg 命令
    let command = ffmpeg();

    // 为每个页面添加输入
    pages.forEach((page, index) => {
      // 判断是 URL 还是本地路径
      const inputPath = page.imageUrl.startsWith('http')
        ? page.imageUrl
        : path.resolve(page.imageUrl);

      command = command.addInput(inputPath);
    });

    // 如果有背景音乐，添加音频输入
    if (options.backgroundMusic) {
      command = command.addInput(options.backgroundMusic);
    }

    // 构建复杂滤镜链
    // 每个输入先缩放到目标分辨率，然后添加转场效果
    const filters = [];
    const totalDuration = calculateTotalDuration(pages);

    // 为每个页面设置持续时间并缩放
    pages.forEach((page, index) => {
      const duration = page.duration || 3;
      // 缩放到目标分辨率
      filters.push(`[${index}:v]scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}]`);
    });

    // 添加转场效果（xfade 滤镜）
    if (pages.length > 1) {
      let prevLabel = 'v0';
      for (let i = 1; i < pages.length; i++) {
        const transitionType = TRANSITION_MAP[pages[i].transition || 'fade'] || 'fade';
        // 计算转场偏移时间（前一页结束前 0.5 秒开始转场）
        const offset = pages.slice(0, i).reduce((sum, p) => sum + (p.duration || 3), 0) - TRANSITION_DURATION;
        const outLabel = i === pages.length - 1 ? 'vout' : `v${i}_t`;

        filters.push(`[${prevLabel}][v${i}]xfade=transition=${transitionType}:duration=${TRANSITION_DURATION}:offset=${offset}[${outLabel}]`);
        prevLabel = outLabel;
      }
    } else {
      // 只有一页时直接标记为输出
      filters.push('[v0]copy[vout]');
    }

    // 应用滤镜
    command = command.complexFilter(filters);

    // 设置输出参数
    command = command
      .outputOptions([
        `-r ${fps}`,                    // 设置帧率
        `-c:v libx264`,                 // 视频编码器
        `-preset medium`,               // 编码预设（平衡速度和质量）
        `-crf 23`,                      // 质量参数
        `-pix_fmt yuv420p`,             // 像素格式（兼容性最佳）
      ])
      .output(outputPath);

    // 如果有背景音乐，混合音频
    if (options.backgroundMusic) {
      command = command.outputOptions([
        '-map [vout]',
        `-map ${pages.length}:a`,       // 背景音乐音频流
        '-c:a aac',                     // 音频编码器
        '-b:a 128k',                    // 音频比特率
        '-shortest',                    // 以较短的流为准
      ]);
    }

    // 监听进度事件
    command.on('progress', (progress) => {
      const job = videoJobs.get(jobId);
      if (job) {
        // 根据 ffmpeg 的 timemark 估算进度
        const currentTime = _parseTimeToSeconds(progress.timemark);
        const estimatedProgress = Math.min(95, Math.round((currentTime / totalDuration) * 100));
        job.progress = estimatedProgress;
        job.updatedAt = new Date().toISOString();
      }
    });

    // 监听完成事件
    command.on('end', () => {
      const job = videoJobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date().toISOString();
        job.videoUrl = `/videos/video_${jobId}.${format}`;

        // 获取文件大小
        try {
          const stats = fs.statSync(outputPath);
          job.fileSize = `${(stats.size / (1024 * 1024)).toFixed(1)}MB`;
        } catch (e) {
          job.fileSize = '未知';
        }

        job.updatedAt = new Date().toISOString();
        console.log(`[视频服务] 任务 ${jobId} 已完成，输出: ${outputPath}`);
      }
    });

    // 监听错误事件
    command.on('error', (err) => {
      const job = videoJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = err.message;
        job.updatedAt = new Date().toISOString();
        console.error(`[视频服务] 任务 ${jobId} 失败:`, err.message);
      }
    });

    // 开始执行
    command.run();
  } catch (err) {
    const job = videoJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = err.message;
      job.updatedAt = new Date().toISOString();
    }
    console.error(`[视频服务] 任务 ${jobId} 初始化失败:`, err.message);
  }
}

/**
 * Mock 模式视频生成
 * 使用 setTimeout 模拟视频创建过程，逐步更新进度
 *
 * @param {string} jobId - 任务 ID
 * @param {Array} pages - 页面数组
 */
function _mockVideoGeneration(jobId, pages) {
  const job = videoJobs.get(jobId);
  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  let processedPages = 0;
  const totalPages = pages.length;

  // 模拟逐页处理的进度更新
  // 每页处理间隔 800ms，模拟真实处理时间
  const interval = setInterval(() => {
    const currentJob = videoJobs.get(jobId);

    // 任务可能已被取消或不存在
    if (!currentJob || currentJob.status === 'cancelled') {
      clearInterval(interval);
      return;
    }

    processedPages++;
    currentJob.processedPages = processedPages;
    // 进度计算：前 90% 按页数分配，最后 10% 用于最终合成
    currentJob.progress = Math.round((processedPages / totalPages) * 90);
    currentJob.updatedAt = new Date().toISOString();

    // 所有页面处理完成
    if (processedPages >= totalPages) {
      // 模拟最终合成阶段
      currentJob.progress = 95;
      currentJob.updatedAt = new Date().toISOString();

      setTimeout(() => {
        const finalJob = videoJobs.get(jobId);
        if (!finalJob || finalJob.status === 'cancelled') return;

        // 创建一个简单的占位输出文件
        try {
          ensureVideosDir();
          const placeholderPath = path.join(VIDEOS_DIR, `video_${jobId}.mp4`);
          // 写入一个最小的占位文件（实际不是有效视频，仅用于标记完成）
          fs.writeFileSync(placeholderPath, Buffer.alloc(0));
          finalJob.videoUrl = `/videos/video_${jobId}.mp4`;
          finalJob.fileSize = `${(totalPages * 2.5).toFixed(1)}MB`; // 模拟文件大小
        } catch (e) {
          console.warn('[视频服务] Mock 模式创建占位文件失败:', e.message);
        }

        finalJob.status = 'completed';
        finalJob.progress = 100;
        finalJob.completedAt = new Date().toISOString();
        finalJob.updatedAt = new Date().toISOString();
        clearInterval(interval);
        console.log(`[视频服务] Mock 任务 ${jobId} 已完成`);
      }, 1000);
    }
  }, 800); // 每 800ms 处理一页（模拟）
}

/**
 * 解析 ffmpeg timemark 字符串为秒数
 * timemark 格式示例: "00:01:23.45"
 *
 * @param {string} timemark - ffmpeg 时间标记
 * @returns {number} 秒数
 */
function _parseTimeToSeconds(timemark) {
  if (!timemark) return 0;
  const parts = timemark.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

// ============ 核心功能：查询任务状态 ============

/**
 * 获取视频生成任务的状态
 *
 * @param {string} jobId - 任务唯一标识符
 * @returns {Object|null} 任务状态对象，包含以下字段：
 *   - id: string          任务 ID
 *   - status: string      当前状态（pending/processing/completed/failed）
 *   - progress: number    进度百分比（0-100）
 *   - totalPages: number  总页数
 *   - processedPages: number 已处理页数
 *   - options: Object     视频生成选项
 *   - estimatedDuration: string 预计时长
 *   - videoUrl: string    视频文件 URL（仅完成时）
 *   - fileSize: string    文件大小（仅完成时）
 *   - error: string      错误信息（仅失败时）
 *   - createdAt: string   创建时间
 *   - updatedAt: string   更新时间
 *   如果任务不存在则返回 null
 */
function getJobStatus(jobId) {
  const job = videoJobs.get(jobId);

  if (!job) {
    return null;
  }

  // 返回任务状态的副本，避免外部直接修改内部数据
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    totalPages: job.totalPages,
    processedPages: job.processedPages,
    options: { ...job.options },
    estimatedDuration: job.estimatedDuration,
    videoUrl: job.videoUrl || null,
    fileSize: job.fileSize || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt || null,
  };
}

/**
 * 获取所有任务列表（用于管理）
 * @returns {Array} 任务列表
 */
function getAllJobs() {
  const jobs = [];
  videoJobs.forEach((job) => {
    jobs.push(getJobStatus(job.id));
  });
  return jobs;
}

/**
 * 删除指定任务
 * 同时删除关联的视频文件
 *
 * @param {string} jobId - 任务 ID
 * @returns {boolean} 是否删除成功
 */
function deleteJob(jobId) {
  const job = videoJobs.get(jobId);
  if (!job) return false;

  // 尝试删除视频文件
  if (job.outputPath && fs.existsSync(job.outputPath)) {
    try {
      fs.unlinkSync(job.outputPath);
      console.log(`[视频服务] 删除视频文件: ${job.outputPath}`);
    } catch (e) {
      console.warn(`[视频服务] 删除视频文件失败:`, e.message);
    }
  }

  videoJobs.delete(jobId);
  return true;
}

/**
 * 设置 Mock 模式开关
 * @param {boolean} enabled - 是否启用 Mock 模式
 */
function setMockMode(enabled) {
  MOCK_MODE = !!enabled;
  console.log(`[视频服务] Mock 模式: ${MOCK_MODE ? '开启' : '关闭'}`);
}

/**
 * 获取当前是否为 Mock 模式
 * @returns {boolean}
 */
function isMockMode() {
  return MOCK_MODE;
}

// ============ 导出模块 ============

module.exports = {
  createVideoFromPages,
  getJobStatus,
  getAllJobs,
  deleteJob,
  setMockMode,
  isMockMode,
  RESOLUTION_MAP,
  TRANSITION_MAP,
};
