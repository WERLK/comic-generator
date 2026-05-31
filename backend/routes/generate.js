/**
 * routes/generate.js - AI 漫画生成路由模块
 *
 * 功能说明：
 * - 提供文字转漫画接口：将文字故事转换为漫画分镜
 * - 提供图片转漫画接口：将上传的图片转换为漫画风格
 * - 提供风格迁移接口：对上传图片应用指定漫画风格
 *
 * 注意：当前所有接口返回模拟数据（Mock），实际 AI 功能待后续集成
 * 后续可对接 OpenAI、Stability AI 等服务实现真实的 AI 生成功能
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const upload = require('../middleware/upload');

// 创建路由器实例
const router = express.Router();

// ============ 辅助函数 ============

/**
 * 生成模拟的分镜面板数据
 * @param {number} panelCount - 面板数量
 * @returns {Array} 模拟面板数组
 */
function generateMockPanels(panelCount = 4) {
  const panelTypes = ['wide', 'tall', 'square', 'half'];
  const panels = [];

  for (let i = 0; i < panelCount; i++) {
    panels.push({
      id: uuidv4(),
      order: i,
      type: panelTypes[i % panelTypes.length],
      imageUrl: `/uploads/mock/panel_${i + 1}.png`,  // 模拟图片路径
      caption: `第 ${i + 1} 格 - 模拟对话内容`,
      dialogue: '这是一段模拟的对话文字，后续将由 AI 自动生成。',
      width: 400,
      height: 300,
      createdAt: new Date().toISOString()
    });
  }

  return panels;
}

/**
 * 生成模拟的漫画风格处理结果
 * @param {string} originalUrl - 原始图片路径
 * @param {string} style - 风格名称
 * @returns {Object} 模拟处理结果
 */
function generateMockStyledResult(originalUrl, style) {
  return {
    id: uuidv4(),
    originalImageUrl: originalUrl,
    styledImageUrl: `/uploads/mock/styled_${Date.now()}.png`,
    style: style,
    status: 'completed',
    message: `已成功应用「${style}」风格（当前为模拟结果）`,
    processingTime: '1.2s',
    createdAt: new Date().toISOString()
  };
}

// ============ 路由定义 ============

/**
 * POST /api/generate/text-to-comic
 * 文字转漫画接口
 *
 * 接收一段文字故事，将其拆分为漫画分镜面板
 * 当前返回模拟数据，后续将对接 AI 服务实现真实生成
 *
 * 请求体：
 * - story: 故事文本内容（必填）
 * - style: 漫画风格（选填，默认 'manga'）
 *   可选值: manga, comic, manhwa, graphic-novel
 * - panelCount: 面板数量（选填，默认 4）
 * - title: 漫画标题（选填）
 */
router.post('/text-to-comic', (req, res) => {
  try {
    const { story, style = 'manga', panelCount = 4, title = '未命名漫画' } = req.body;

    // 验证必填字段
    if (!story || story.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '故事文本内容不能为空'
      });
    }

    // 验证风格参数
    const validStyles = ['manga', 'comic', 'manhwa', 'graphic-novel'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        message: `不支持的漫画风格，可选值: ${validStyles.join(', ')}`
      });
    }

    // 验证面板数量
    if (panelCount < 1 || panelCount > 20) {
      return res.status(400).json({
        success: false,
        message: '面板数量应在 1-20 之间'
      });
    }

    console.log(`[文字转漫画] 收到请求 - 风格: ${style}, 面板数: ${panelCount}, 文本长度: ${story.length}`);

    // 生成模拟的分镜结果
    const result = {
      id: uuidv4(),
      title: title,
      style: style,
      originalStory: story,
      panels: generateMockPanels(panelCount),
      status: 'completed',
      message: '漫画分镜生成完成（当前为模拟数据，AI 集成后返回真实生成结果）',
      metadata: {
        totalPanels: panelCount,
        estimatedReadTime: `${Math.ceil(panelCount * 0.5)} 分钟`,
        createdAt: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      message: '漫画分镜生成成功',
      data: result
    });
  } catch (error) {
    console.error('[文字转漫画] 处理失败:', error);
    res.status(500).json({
      success: false,
      message: '文字转漫画处理失败',
      error: error.message
    });
  }
});

/**
 * POST /api/generate/image-to-comic
 * 图片转漫画接口
 *
 * 接收上传的图片文件，将其转换为漫画风格
 * 使用 multer 中间件处理文件上传
 *
 * 请求参数（multipart/form-data）：
 * - image: 图片文件（必填，支持 jpg/png/webp 格式）
 * - style: 漫画风格（选填，默认 'manga'）
 */
router.post('/image-to-comic', upload.single('image'), (req, res) => {
  try {
    // 检查是否上传了文件
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    const { style = 'manga' } = req.body;
    const file = req.file;

    console.log(`[图片转漫画] 收到上传 - 文件名: ${file.originalname}, 大小: ${file.size} bytes, 风格: ${style}`);

    // 构建上传文件的访问 URL
    const imageUrl = `/uploads/${file.filename}`;

    // 生成模拟的漫画风格处理结果
    const result = {
      id: uuidv4(),
      originalImage: {
        filename: file.originalname,
        url: imageUrl,
        size: file.size,
        mimetype: file.mimetype
      },
      comicImage: {
        url: `/uploads/mock/comic_${Date.now()}.png`,  // 模拟处理后的图片路径
        width: 800,
        height: 1200
      },
      style: style,
      status: 'completed',
      message: '图片已成功转换为漫画风格（当前为模拟数据，AI 集成后返回真实处理结果）',
      processingDetails: {
        edgeEnhancement: true,       // 边缘增强
        colorQuantization: true,     // 色彩量化
        halftoneEffect: style === 'comic', // 半调效果（仅漫画风格）
        createdAt: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      message: '图片转漫画处理成功',
      data: result
    });
  } catch (error) {
    console.error('[图片转漫画] 处理失败:', error);
    res.status(500).json({
      success: false,
      message: '图片转漫画处理失败',
      error: error.message
    });
  }
});

/**
 * POST /api/generate/style-transfer
 * 风格迁移接口
 *
 * 接收上传的图片文件和风格参数，对图片应用指定的漫画风格
 *
 * 请求参数（multipart/form-data）：
 * - image: 图片文件（必填，支持 jpg/png/webp 格式）
 * - style: 目标风格（必填）
 *   可选值: manga, comic, watercolor, sketch, pixel-art, pop-art
 * - intensity: 风格强度（选填，0-1 之间，默认 0.8）
 */
router.post('/style-transfer', upload.single('image'), (req, res) => {
  try {
    // 检查是否上传了文件
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
    }

    const { style, intensity = 0.8 } = req.body;

    // 验证必填的风格参数
    if (!style) {
      return res.status(400).json({
        success: false,
        message: '请指定目标风格'
      });
    }

    // 验证风格参数
    const validStyles = ['manga', 'comic', 'watercolor', 'sketch', 'pixel-art', 'pop-art'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        message: `不支持的风格类型，可选值: ${validStyles.join(', ')}`
      });
    }

    // 验证强度参数
    const intensityNum = parseFloat(intensity);
    if (isNaN(intensityNum) || intensityNum < 0 || intensityNum > 1) {
      return res.status(400).json({
        success: false,
        message: '风格强度应在 0-1 之间'
      });
    }

    const file = req.file;
    const imageUrl = `/uploads/${file.filename}`;

    console.log(`[风格迁移] 收到请求 - 文件名: ${file.originalname}, 风格: ${style}, 强度: ${intensityNum}`);

    // 生成模拟的风格迁移结果
    const result = generateMockStyledResult(imageUrl, style);
    result.intensity = intensityNum;
    result.sourceImage = {
      filename: file.originalname,
      url: imageUrl,
      size: file.size,
      mimetype: file.mimetype
    };

    res.json({
      success: true,
      message: `风格迁移处理成功 - 已应用「${style}」风格`,
      data: result
    });
  } catch (error) {
    console.error('[风格迁移] 处理失败:', error);
    res.status(500).json({
      success: false,
      message: '风格迁移处理失败',
      error: error.message
    });
  }
});

// 导出路由器模块
module.exports = router;
