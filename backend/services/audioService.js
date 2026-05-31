/**
 * services/audioService.js - 音频生成服务模块
 *
 * 功能说明：
 * - generateSpeech: 使用 Edge TTS 将文字转换为语音（TTS）
 * - generateBackgroundMusic: 生成背景音乐（当前为 Mock 模式）
 * - mixAudioTracks: 使用 ffmpeg 混合多个音轨（语音 + 背景音乐）
 * - getAudioDuration: 使用 ffprobe 获取音频时长
 *
 * 依赖：
 * - edge-tts：微软 Edge TTS 命令行工具（用于真实语音合成）
 * - ffmpeg/ffprobe：音频处理工具（用于混音和时长获取）
 *
 * 模式说明：
 * - 真实模式：使用 edge-tts CLI 进行语音合成
 * - 降级模式：edge-tts 不可用时，使用 ffmpeg 生成静音占位文件
 * - Mock 模式：返回模拟数据，不生成实际文件
 */

const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ============ 配置常量 ============

// 音频输出目录（相对于项目根目录）
const AUDIO_DIR = path.join(__dirname, '..', 'audio');

// 是否启用 Mock 模式（当 edge-tts 和 ffmpeg 均不可用时自动启用）
let MOCK_MODE = false;

// Edge TTS 是否可用
let EDGE_TTS_AVAILABLE = false;

// ffmpeg 是否可用
let FFMPEG_AVAILABLE = false;

// ============ 语音映射表 ============

// 语音名称到 Edge TTS 语音 ID 的映射
const VOICE_MAP = {
  'male-1': 'zh-CN-YunxiNeural',       // 男声1 - 云希（年轻男性）
  'female-1': 'zh-CN-XiaoxiaoNeural',   // 女声1 - 晓晓（年轻女性）
  'male-2': 'zh-CN-YunjianNeural',      // 男声2 - 云健（成熟男性）
  'female-2': 'zh-CN-XiaoyiNeural',     // 女声2 - 晓依（成熟女性）
  'narrator': 'zh-CN-YunyangNeural',    // 旁白 - 云扬（新闻/旁白风格）
};

// 语音描述信息（用于 API 返回）
const VOICE_INFO = [
  {
    id: 'male-1',
    name: '男声1',
    description: '年轻男性声音，适合热血、青春类漫画旁白',
    gender: 'male',
    previewUrl: '/audio/preview/male-1.mp3',
  },
  {
    id: 'female-1',
    name: '女声1',
    description: '年轻女性声音，适合温柔、可爱类角色配音',
    gender: 'female',
    previewUrl: '/audio/preview/female-1.mp3',
  },
  {
    id: 'male-2',
    name: '男声2',
    description: '成熟男性声音，适合严肃、深沉类角色配音',
    gender: 'male',
    previewUrl: '/audio/preview/male-2.mp3',
  },
  {
    id: 'female-2',
    name: '女声2',
    description: '成熟女性声音，适合优雅、知性类角色配音',
    gender: 'female',
    previewUrl: '/audio/preview/female-2.mp3',
  },
  {
    id: 'narrator',
    name: '旁白',
    description: '旁白专用声音，适合故事叙述和场景描述',
    gender: 'neutral',
    previewUrl: '/audio/preview/narrator.mp3',
  },
];

// 背景音乐情绪映射（用于 Mock 模式）
const MOOD_DESCRIPTIONS = {
  'epic': '史诗/激昂',
  'calm': '平静/舒缓',
  'happy': '欢快/活泼',
  'sad': '悲伤/忧郁',
  'tense': '紧张/悬疑',
};

// ============ 工具检测 ============

/**
 * 检测 edge-tts 是否可用
 * 通过尝试执行 edge-tts --version 来判断
 */
function checkEdgeTts() {
  return new Promise((resolve) => {
    execFile('edge-tts', ['--version'], (err) => {
      if (err) {
        console.warn('[音频服务] edge-tts 不可用，语音合成将使用降级模式');
        EDGE_TTS_AVAILABLE = false;
        resolve(false);
      } else {
        console.log('[音频服务] edge-tts 已就绪');
        EDGE_TTS_AVAILABLE = true;
        resolve(true);
      }
    });
  });
}

/**
 * 检测 ffmpeg 是否可用
 * 通过尝试执行 ffmpeg -version 来判断
 */
function checkFfmpeg() {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (err) => {
      if (err) {
        console.warn('[音频服务] ffmpeg 不可用，音频处理功能受限');
        FFMPEG_AVAILABLE = false;
        resolve(false);
      } else {
        console.log('[音频服务] ffmpeg 已就绪');
        FFMPEG_AVAILABLE = true;
        resolve(true);
      }
    });
  });
}

/**
 * 确保音频输出目录存在
 * 如果目录不存在则创建
 */
function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    console.log(`[音频服务] 创建音频输出目录: ${AUDIO_DIR}`);
  }
}

// 初始化时检测工具可用性
(async () => {
  const hasEdgeTts = await checkEdgeTts();
  const hasFfmpeg = await checkFfmpeg();

  // 如果两个工具都不可用，启用 Mock 模式
  if (!hasEdgeTts && !hasFfmpeg) {
    console.warn('[音频服务] edge-tts 和 ffmpeg 均不可用，将使用 Mock 模式');
    MOCK_MODE = true;
  }
})();

// ============ 核心功能：语音合成 ============

/**
 * 生成语音（TTS 文字转语音）
 *
 * 支持三种模式：
 * 1. 真实模式：使用 edge-tts CLI 进行语音合成
 * 2. 降级模式：edge-tts 不可用时，使用 ffmpeg 生成静音占位文件
 * 3. Mock 模式：返回模拟数据，不生成实际文件
 *
 * @param {Object} params - 语音合成参数
 * @param {string} params.text - 要转换的文本内容
 * @param {string} params.voice - 语音名称（male-1/female-1/male-2/female-2/narrator），默认 male-1
 * @param {number} params.speed - 语速（0.5-2.0），默认 1.0
 * @param {number} params.pitch - 音调（0.5-2.0），默认 1.0
 * @param {string} params.outputFormat - 输出格式（mp3/wav），默认 mp3
 * @returns {Promise<Object>} 生成结果 { success, audioPath, audioUrl, duration, voice, isMock }
 */
async function generateSpeech(params = {}) {
  const {
    text = '',
    voice = 'male-1',
    speed = 1.0,
    pitch = 1.0,
    outputFormat = 'mp3',
  } = params;

  // 参数验证
  if (!text || text.trim() === '') {
    return {
      success: false,
      message: '文本内容不能为空',
      isMock: false,
    };
  }

  // 验证语音名称
  if (!VOICE_MAP[voice]) {
    return {
      success: false,
      message: `不支持的语音: ${voice}，可选值: ${Object.keys(VOICE_MAP).join(', ')}`,
      isMock: false,
    };
  }

  // 验证语速范围
  const clampedSpeed = Math.max(0.5, Math.min(2.0, parseFloat(speed) || 1.0));
  // 验证音调范围
  const clampedPitch = Math.max(0.5, Math.min(2.0, parseFloat(pitch) || 1.0));
  // 验证输出格式
  const format = ['mp3', 'wav'].includes(outputFormat) ? outputFormat : 'mp3';

  console.log(`[音频服务] 开始生成语音 - 语音: ${voice}, 语速: ${clampedSpeed}, 音调: ${clampedPitch}`);

  // 根据模式选择处理方式
  if (MOCK_MODE) {
    return _mockGenerateSpeech(text, voice, format);
  }

  if (EDGE_TTS_AVAILABLE) {
    try {
      return await _realGenerateSpeech(text, voice, clampedSpeed, clampedPitch, format);
    } catch (error) {
      console.error('[音频服务] edge-tts 语音合成失败，尝试降级模式:', error.message);
    }
  }

  // 降级模式：使用 ffmpeg 生成静音占位文件
  if (FFMPEG_AVAILABLE) {
    try {
      return await _fallbackGenerateSpeech(text, voice, format);
    } catch (error) {
      console.error('[音频服务] ffmpeg 降级模式也失败，使用 Mock 模式:', error.message);
    }
  }

  // 最终降级为 Mock 模式
  return _mockGenerateSpeech(text, voice, format);
}

/**
 * 真实模式：使用 edge-tts CLI 生成语音
 *
 * @param {string} text - 文本内容
 * @param {string} voice - 语音名称
 * @param {number} speed - 语速
 * @param {number} pitch - 音调
 * @param {string} format - 输出格式
 * @returns {Promise<Object>} 生成结果
 */
function _realGenerateSpeech(text, voice, speed, pitch, format) {
  return new Promise((resolve, reject) => {
    ensureAudioDir();

    // 生成唯一文件名
    const filename = `speech_${voice}_${uuidv4()}.${format}`;
    const outputPath = path.join(AUDIO_DIR, filename);

    // 获取 Edge TTS 语音 ID
    const voiceId = VOICE_MAP[voice];

    // Edge TTS 语速参数：+20% 表示 1.2 倍速，-20% 表示 0.8 倍速
    const rateStr = speed === 1.0 ? '+0%' : `${speed > 1 ? '+' : ''}${Math.round((speed - 1) * 100)}%`;
    // Edge TTS 音调参数
    const pitchStr = pitch === 1.0 ? '+0Hz' : `${pitch > 1 ? '+' : ''}${Math.round((pitch - 1) * 50)}Hz`;

    // 构建 edge-tts 命令参数
    const args = [
      '--voice', voiceId,
      '--text', text,
      '--rate', rateStr,
      '--pitch', pitchStr,
      '--write-media', outputPath,
    ];

    console.log(`[音频服务] 执行 edge-tts 命令: edge-tts ${args.join(' ')}`);

    execFile('edge-tts', args, async (error, stdout, stderr) => {
      if (error) {
        console.error('[音频服务] edge-tts 执行失败:', error.message);
        return reject(new Error(`edge-tts 执行失败: ${error.message}`));
      }

      // 检查输出文件是否生成成功
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('edge-tts 未生成输出文件'));
      }

      try {
        // 获取音频时长
        const duration = await getAudioDuration(outputPath);

        console.log(`[音频服务] 语音生成成功: ${filename}, 时长: ${duration}s`);

        resolve({
          success: true,
          audioPath: outputPath,
          audioUrl: `/audio/${filename}`,
          duration: duration,
          voice: voice,
          isMock: false,
        });
      } catch (durationError) {
        // 即使获取时长失败，文件已生成，仍然返回成功
        console.warn('[音频服务] 获取音频时长失败:', durationError.message);
        resolve({
          success: true,
          audioPath: outputPath,
          audioUrl: `/audio/${filename}`,
          duration: 0,
          voice: voice,
          isMock: false,
        });
      }
    });
  });
}

/**
 * 降级模式：使用 ffmpeg 生成静音占位音频文件
 * 当 edge-tts 不可用时使用此方法
 *
 * @param {string} text - 文本内容（用于计算时长）
 * @param {string} voice - 语音名称
 * @param {string} format - 输出格式
 * @returns {Promise<Object>} 生成结果
 */
function _fallbackGenerateSpeech(text, voice, format) {
  return new Promise((resolve, reject) => {
    ensureAudioDir();

    // 根据文本长度估算时长（中文约每秒 4 个字）
    const estimatedDuration = Math.max(1, Math.ceil(text.length / 4));

    // 生成唯一文件名
    const filename = `speech_${voice}_${uuidv4()}.${format}`;
    const outputPath = path.join(AUDIO_DIR, filename);

    // 使用 ffmpeg 生成指定时长的静音音频
    const args = [
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=mono',
      '-t', String(estimatedDuration),
      '-c:a', format === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-q:a', '2',
      '-y', // 覆盖已存在的文件
      outputPath,
    ];

    console.log(`[音频服务] 降级模式 - 生成静音占位音频: ${estimatedDuration}s`);

    execFile('ffmpeg', args, async (error) => {
      if (error) {
        console.error('[音频服务] ffmpeg 生成静音音频失败:', error.message);
        return reject(new Error(`ffmpeg 执行失败: ${error.message}`));
      }

      console.log(`[音频服务] 静音占位音频已生成: ${filename}（降级模式，非真实语音）`);

      resolve({
        success: true,
        audioPath: outputPath,
        audioUrl: `/audio/${filename}`,
        duration: estimatedDuration,
        voice: voice,
        isMock: false,
        isPlaceholder: true, // 标记为占位文件
        message: 'edge-tts 不可用，已生成静音占位音频',
      });
    });
  });
}

/**
 * Mock 模式：返回模拟的语音生成结果
 * 不生成实际音频文件
 *
 * @param {string} text - 文本内容
 * @param {string} voice - 语音名称
 * @param {string} format - 输出格式
 * @returns {Object} 模拟结果
 */
function _mockGenerateSpeech(text, voice, format) {
  console.log(`[音频服务] Mock 模式 - 模拟语音生成`);

  // 根据文本长度估算时长
  const estimatedDuration = Math.max(1, Math.ceil(text.length / 4));

  return {
    success: true,
    audioPath: null,
    audioUrl: `/audio/mock/speech_${voice}_${Date.now()}.${format}`,
    duration: estimatedDuration,
    voice: voice,
    isMock: true,
    message: '当前为模拟数据，配置 edge-tts 后可生成真实语音',
  };
}

// ============ 核心功能：背景音乐生成 ============

/**
 * 生成背景音乐
 *
 * 当前为 Mock 模式，未来将集成音乐生成 API
 *
 * @param {Object} params - 背景音乐参数
 * @param {string} params.mood - 情绪风格（epic/calm/happy/sad/tense），默认 calm
 * @param {number} params.duration - 时长（秒），默认 30
 * @param {string} params.genre - 音乐类型（orchestral/electronic/piano/ambient），默认 ambient
 * @returns {Promise<Object>} 生成结果 { success, audioPath, audioUrl, duration, mood, isMock }
 */
async function generateBackgroundMusic(params = {}) {
  const {
    mood = 'calm',
    duration = 30,
    genre = 'ambient',
  } = params;

  // 参数验证
  const validMoods = Object.keys(MOOD_DESCRIPTIONS);
  if (!validMoods.includes(mood)) {
    return {
      success: false,
      message: `不支持的情绪风格: ${mood}，可选值: ${validMoods.join(', ')}`,
      isMock: false,
    };
  }

  const validGenres = ['orchestral', 'electronic', 'piano', 'ambient'];
  if (!validGenres.includes(genre)) {
    return {
      success: false,
      message: `不支持的音乐类型: ${genre}，可选值: ${validGenres.join(', ')}`,
      isMock: false,
    };
  }

  const clampedDuration = Math.max(5, Math.min(300, parseInt(duration) || 30));

  console.log(`[音频服务] 开始生成背景音乐 - 情绪: ${mood}, 类型: ${genre}, 时长: ${clampedDuration}s`);

  // 当前为 Mock 模式（未来将集成音乐生成 API）
  if (MOCK_MODE) {
    return _mockGenerateBackgroundMusic(mood, genre, clampedDuration);
  }

  // 尝试使用 ffmpeg 生成简单的背景音乐占位
  if (FFMPEG_AVAILABLE) {
    try {
      return await _fallbackGenerateBackgroundMusic(mood, genre, clampedDuration);
    } catch (error) {
      console.error('[音频服务] ffmpeg 生成背景音乐失败:', error.message);
    }
  }

  return _mockGenerateBackgroundMusic(mood, genre, clampedDuration);
}

/**
 * 降级模式：使用 ffmpeg 生成简单的背景音乐占位
 * 生成白噪声或正弦波作为占位音频
 *
 * @param {string} mood - 情绪风格
 * @param {string} genre - 音乐类型
 * @param {number} duration - 时长
 * @returns {Promise<Object>} 生成结果
 */
function _fallbackGenerateBackgroundMusic(mood, genre, duration) {
  return new Promise((resolve, reject) => {
    ensureAudioDir();

    const filename = `bgm_${mood}_${genre}_${uuidv4()}.mp3`;
    const outputPath = path.join(AUDIO_DIR, filename);

    // 根据情绪选择不同的频率（模拟不同风格）
    const moodFrequency = {
      'epic': 220,    // 低沉有力
      'calm': 440,    // 平缓舒适
      'happy': 523,   // 明亮欢快
      'sad': 330,     // 低沉忧郁
      'tense': 196,   // 紧张低频
    };

    const freq = moodFrequency[mood] || 440;

    // 使用 ffmpeg 生成正弦波音频作为占位
    const args = [
      '-f', 'lavfi',
      '-i', `sine=frequency=${freq}:duration=${duration}`,
      '-c:a', 'libmp3lame',
      '-q:a', '2',
      '-af', 'volume=0.3', // 降低音量，作为背景音乐
      '-y',
      outputPath,
    ];

    console.log(`[音频服务] 降级模式 - 生成背景音乐占位: ${mood}/${genre}`);

    execFile('ffmpeg', args, (error) => {
      if (error) {
        console.error('[音频服务] ffmpeg 生成背景音乐失败:', error.message);
        return reject(new Error(`ffmpeg 执行失败: ${error.message}`));
      }

      console.log(`[音频服务] 背景音乐占位已生成: ${filename}`);

      resolve({
        success: true,
        audioPath: outputPath,
        audioUrl: `/audio/${filename}`,
        duration: duration,
        mood: mood,
        isMock: false,
        isPlaceholder: true,
        message: '当前为占位音频，集成音乐生成 API 后将生成真实背景音乐',
      });
    });
  });
}

/**
 * Mock 模式：返回模拟的背景音乐结果
 *
 * @param {string} mood - 情绪风格
 * @param {string} genre - 音乐类型
 * @param {number} duration - 时长
 * @returns {Object} 模拟结果
 */
function _mockGenerateBackgroundMusic(mood, genre, duration) {
  console.log(`[音频服务] Mock 模式 - 模拟背景音乐生成`);

  return {
    success: true,
    audioPath: null,
    audioUrl: `/audio/mock/bgm_${mood}_${genre}_${Date.now()}.mp3`,
    duration: duration,
    mood: mood,
    genre: genre,
    isMock: true,
    message: '当前为模拟数据，集成音乐生成 API 后可生成真实背景音乐',
  };
}

// ============ 核心功能：音频混音 ============

/**
 * 混合多个音轨（语音 + 背景音乐）
 *
 * 使用 ffmpeg 将多个语音文件与背景音乐混合
 * 背景音乐在语音播放时会自动降低音量（ducking 效果）
 *
 * @param {Object} params - 混音参数
 * @param {string[]} params.speechFiles - 语音文件路径数组
 * @param {string} params.backgroundMusicPath - 背景音乐文件路径（可选）
 * @param {string} params.outputFormat - 输出格式（mp3/wav），默认 mp3
 * @returns {Promise<Object>} 混音结果 { success, outputPath, audioUrl, duration }
 */
async function mixAudioTracks(params = {}) {
  const {
    speechFiles = [],
    backgroundMusicPath = null,
    outputFormat = 'mp3',
  } = params;

  // 参数验证
  if (!speechFiles || speechFiles.length === 0) {
    return {
      success: false,
      message: '请提供至少一个语音文件路径',
    };
  }

  // 验证所有语音文件是否存在
  const missingFiles = speechFiles.filter(f => !fs.existsSync(f));
  if (missingFiles.length > 0) {
    return {
      success: false,
      message: `${missingFiles.length} 个语音文件不存在`,
      missingFiles: missingFiles,
    };
  }

  // 验证背景音乐文件
  if (backgroundMusicPath && !fs.existsSync(backgroundMusicPath)) {
    console.warn(`[音频服务] 背景音乐文件不存在: ${backgroundMusicPath}，将跳过背景音乐`);
  }

  console.log(`[音频服务] 开始混音 - 语音文件数: ${speechFiles.length}, 背景音乐: ${backgroundMusicPath ? '有' : '无'}`);

  if (MOCK_MODE || !FFMPEG_AVAILABLE) {
    return _mockMixAudioTracks(speechFiles, backgroundMusicPath, outputFormat);
  }

  try {
    return await _realMixAudioTracks(speechFiles, backgroundMusicPath, outputFormat);
  } catch (error) {
    console.error('[音频服务] 混音失败:', error.message);
    return {
      success: false,
      message: `音频混音失败: ${error.message}`,
    };
  }
}

/**
 * 真实模式：使用 ffmpeg 混合多个音轨
 *
 * @param {string[]} speechFiles - 语音文件路径数组
 * @param {string} backgroundMusicPath - 背景音乐文件路径
 * @param {string} outputFormat - 输出格式
 * @returns {Promise<Object>} 混音结果
 */
function _realMixAudioTracks(speechFiles, backgroundMusicPath, outputFormat) {
  return new Promise((resolve, reject) => {
    ensureAudioDir();

    const filename = `mixed_${uuidv4()}.${outputFormat}`;
    const outputPath = path.join(AUDIO_DIR, filename);

    // 构建 ffmpeg 命令
    // 策略：先将所有语音文件拼接，再与背景音乐混合（带 ducking 效果）
    const args = [];

    // 添加所有语音文件作为输入
    speechFiles.forEach((file) => {
      args.push('-i', file);
    });

    // 如果有背景音乐，添加为最后一个输入
    const hasBgm = backgroundMusicPath && fs.existsSync(backgroundMusicPath);
    if (hasBgm) {
      args.push('-i', backgroundMusicPath);
    }

    // 构建滤镜链
    const filterParts = [];
    const bgmIndex = speechFiles.length; // 背景音乐在输入中的索引

    if (speechFiles.length === 1) {
      // 只有一个语音文件
      if (hasBgm) {
        // 语音 + 背景音乐混合，背景音乐 ducking
        filterParts.push(
          `[0:a]volume=1.0[voice]`,
          `[${bgmIndex}:a]volume=0.15,afade=t=in:d=2[bgm]`,
          `[voice][bgm]amix=inputs=2:duration=longest:dropout_transition=3[aout]`
        );
      } else {
        // 只有语音，直接复制
        filterParts.push('[0:a]acopy[aout]');
      }
    } else {
      // 多个语音文件：先拼接再混合
      // 使用 concat 滤镜拼接所有语音
      const concatInputs = speechFiles.map((_, i) => `[${i}:a]`).join('');
      filterParts.push(`${concatInputs}concat=n=${speechFiles.length}:v=0:a=1[voice]`);

      if (hasBgm) {
        // 语音 + 背景音乐混合
        filterParts.push(
          `[voice]volume=1.0[voice_out]`,
          `[${bgmIndex}:a]volume=0.15,afade=t=in:d=2[bgm]`,
          `[voice_out][bgm]amix=inputs=2:duration=longest:dropout_transition=3[aout]`
        );
      } else {
        filterParts.push('[voice]acopy[aout]');
      }
    }

    // 添加滤镜参数
    args.push('-filter_complex', filterParts.join(';'));

    // 输出参数
    args.push(
      '-map', '[aout]',
      '-c:a', outputFormat === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-q:a', '2',
      '-y',
      outputPath
    );

    console.log(`[音频服务] 执行 ffmpeg 混音命令`);

    execFile('ffmpeg', args, async (error) => {
      if (error) {
        console.error('[音频服务] ffmpeg 混音执行失败:', error.message);
        return reject(new Error(`ffmpeg 混音失败: ${error.message}`));
      }

      try {
        const duration = await getAudioDuration(outputPath);
        console.log(`[音频服务] 混音完成: ${filename}, 时长: ${duration}s`);

        resolve({
          success: true,
          outputPath: outputPath,
          audioUrl: `/audio/${filename}`,
          duration: duration,
        });
      } catch (durationError) {
        console.warn('[音频服务] 获取混音时长失败:', durationError.message);
        resolve({
          success: true,
          outputPath: outputPath,
          audioUrl: `/audio/${filename}`,
          duration: 0,
        });
      }
    });
  });
}

/**
 * Mock 模式：返回模拟的混音结果
 *
 * @param {string[]} speechFiles - 语音文件路径数组
 * @param {string} backgroundMusicPath - 背景音乐文件路径
 * @param {string} outputFormat - 输出格式
 * @returns {Object} 模拟结果
 */
function _mockMixAudioTracks(speechFiles, backgroundMusicPath, outputFormat) {
  console.log(`[音频服务] Mock 模式 - 模拟音频混音`);

  // 估算总时长
  let estimatedDuration = speechFiles.length * 5; // 每个语音约 5 秒

  return {
    success: true,
    outputPath: null,
    audioUrl: `/audio/mock/mixed_${Date.now()}.${outputFormat}`,
    duration: estimatedDuration,
    isMock: true,
    message: '当前为模拟数据，配置 ffmpeg 后可进行真实音频混音',
  };
}

// ============ 核心功能：获取音频时长 ============

/**
 * 使用 ffprobe 获取音频文件时长
 *
 * @param {string} filePath - 音频文件的绝对路径
 * @returns {Promise<number>} 音频时长（秒），获取失败返回 0
 */
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn('[音频服务] 获取时长失败: 文件不存在');
      return resolve(0);
    }

    // 使用 ffprobe 获取音频时长
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    execFile('ffprobe', args, (error, stdout) => {
      if (error) {
        console.warn('[音频服务] ffprobe 获取时长失败:', error.message);
        return resolve(0);
      }

      // 解析时长字符串
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration) || duration < 0) {
        console.warn('[音频服务] 无法解析时长:', stdout);
        return resolve(0);
      }

      // 四舍五入到两位小数
      resolve(Math.round(duration * 100) / 100);
    });
  });
}

// ============ 模块导出 ============

module.exports = {
  // 核心功能
  generateSpeech,
  generateBackgroundMusic,
  mixAudioTracks,
  getAudioDuration,

  // 配置常量（供外部引用）
  VOICE_MAP,
  VOICE_INFO,
  MOOD_DESCRIPTIONS,

  // 工具函数（供测试或外部使用）
  setMockMode: (enabled) => { MOCK_MODE = !!enabled; },
  isMockMode: () => MOCK_MODE,
  isEdgeTtsAvailable: () => EDGE_TTS_AVAILABLE,
  isFfmpegAvailable: () => FFMPEG_AVAILABLE,
};
