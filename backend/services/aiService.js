/**
 * services/aiService.js - AI 漫画生成服务模块
 *
 * 功能说明：
 * - generateComicPanels: 将文字故事拆分为漫画分镜面板，并生成对应图像
 * - styleTransferImage: 对输入图片应用指定漫画风格（风格迁移）
 * - generateDialogue: 根据面板描述生成合适的对话文本
 *
 * 集成说明：
 * - 优先使用 OpenAI API 和 Stability AI API 进行真实 AI 生成
 * - 当 API 密钥未配置时，自动降级为 Mock 数据生成
 * - 所有降级行为会在控制台输出清晰的提示信息
 *
 * 环境变量：
 * - OPENAI_API_KEY: OpenAI API 密钥
 * - STABILITY_API_KEY: Stability AI API 密钥
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// ============ 配置常量 ============

// 支持的漫画风格列表
const SUPPORTED_STYLES = {
  manga: '日系漫画',
  comic: '美式漫画',
  manhwa: '韩式漫画',
  'graphic-novel': '图像小说',
};

// 支持的风格迁移类型
const SUPPORTED_TRANSFER_STYLES = {
  manga: '日系漫画',
  comic: '美式漫画',
  watercolor: '水彩画',
  sketch: '素描',
  'pixel-art': '像素艺术',
};

// Stability AI API 配置
const STABILITY_API_BASE = 'https://api.stability.ai/v1';
const STABILITY_ENGINE_ID = 'stable-diffusion-xl-1024-v1-0';

// OpenAI API 配置
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// ============ 辅助函数 ============

/**
 * 检查 API 密钥是否已配置
 * @param {string} keyName - 环境变量名称
 * @returns {boolean} 是否已配置
 */
function isApiKeyConfigured(keyName) {
  const key = process.env[keyName];
  return key && key !== 'your_key_here' && key.trim() !== '';
}

/**
 * 生成模拟的分镜面板数据
 * 当 API 密钥未配置时使用此函数生成 Mock 数据
 * @param {string} story - 原始故事文本
 * @param {string} style - 漫画风格
 * @param {number} panelCount - 面板数量
 * @returns {Array} 模拟面板数组
 */
function generateMockPanels(story, style, panelCount) {
  console.log('[AI服务] 使用 Mock 模式生成分镜面板（API 密钥未配置）');

  const panelTypes = ['wide', 'tall', 'square', 'half'];
  const mockDescriptions = [
    '场景开场：主角站在城市天际线前，风吹动头发，表情坚毅地望向远方',
    '特写镜头：主角握紧拳头，眼神中闪烁着决心与希望的光芒',
    '动作场景：主角与对手激烈交锋，画面充满动感与张力',
    '对话场景：角色们在咖啡馆内交谈，窗外是繁忙的街道',
    '回忆场景：童年时代的温馨画面，阳光透过树叶洒下斑驳光影',
    '高潮场景：主角释放全力，能量爆发照亮整个画面',
    '结尾场景：夕阳下主角独自走在归途，背影显得既孤独又坚定',
    '过渡场景：从黑夜到黎明的城市全景，象征新的开始',
  ];

  const mockDialogues = [
    '我一定会找到答案的……',
    '你说什么？！不可能！',
    '这就是我的决心，谁也无法动摇！',
    '看来事情比想象中复杂得多……',
    '还记得我们小时候的约定吗？',
    '全力——爆发！！！',
    '明天，一切都会不同吧……',
    '新的黎明即将到来……',
  ];

  const panels = [];

  for (let i = 0; i < panelCount; i++) {
    panels.push({
      panelId: uuidv4(),
      order: i,
      type: panelTypes[i % panelTypes.length],
      description: mockDescriptions[i % mockDescriptions.length],
      imageUrl: `/uploads/mock/panel_${style}_${i + 1}.png`,
      dialogue: mockDialogues[i % mockDialogues.length],
      width: 400,
      height: 300,
      createdAt: new Date().toISOString(),
    });
  }

  return panels;
}

/**
 * 生成模拟的风格迁移结果
 * @param {string} inputImagePath - 输入图片路径
 * @param {string} style - 目标风格
 * @returns {Object} 模拟处理结果
 */
function generateMockStyleTransfer(inputImagePath, style) {
  console.log(`[AI服务] 使用 Mock 模式进行风格迁移（API 密钥未配置）`);

  return {
    success: true,
    originalPath: inputImagePath,
    outputPath: `/uploads/mock/styled_${style}_${Date.now()}.png`,
    style: style,
    message: `已应用「${SUPPORTED_TRANSFER_STYLES[style] || style}」风格（当前为模拟结果）`,
    processingTime: '1.2s',
    isMock: true,
  };
}

/**
 * 生成模拟的对话文本
 * @param {string} panelDescription - 面板描述
 * @returns {string} 模拟对话
 */
function generateMockDialogue(panelDescription) {
  console.log('[AI服务] 使用 Mock 模式生成对话文本（API 密钥未配置）');

  const mockDialogues = [
    '这就是命运的选择……',
    '我不会再退缩了！',
    '你终于明白了呢。',
    '一切都还来得及！',
    '让我们一起面对吧。',
    '真相往往比想象更残酷……',
    '但是，我不会放弃！',
    '这就是我的回答！',
  ];

  return mockDialogues[Math.floor(Math.random() * mockDialogues.length)];
}

// ============ OpenAI API 调用函数 ============

/**
 * 调用 OpenAI Chat Completion API
 * @param {string} prompt - 提示文本
 * @param {number} maxTokens - 最大 token 数
 * @returns {Promise<string>} API 返回的文本内容
 */
async function callOpenAI(prompt, maxTokens = 2000) {
  const apiKey = process.env.OPENAI_API_KEY;

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的漫画编剧助手，擅长将故事拆分为漫画分镜，并为每个分镜生成生动的画面描述和对话。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API 调用失败 (${response.status}): ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用 OpenAI API 将故事文本拆分为分镜面板描述
 * @param {string} story - 故事文本
 * @param {string} style - 漫画风格
 * @param {number} panelCount - 面板数量
 * @returns {Promise<Array>} 面板描述数组
 */
async function generatePanelDescriptionsFromAI(story, style, panelCount) {
  const styleName = SUPPORTED_STYLES[style] || style;

  const prompt = `请将以下故事拆分为 ${panelCount} 个漫画分镜面板，风格为「${styleName}」。

要求：
1. 每个面板包含详细的画面描述（用于 AI 图像生成）
2. 每个面板包含合适的角色对话或旁白
3. 画面描述要具体，包含场景、人物动作、表情、光影、构图等细节
4. 对话要自然、符合角色性格

请严格按以下 JSON 格式返回，不要包含其他文字：
[
  {
    "description": "详细的画面描述，包含场景、人物、动作、光影、构图等",
    "dialogue": "角色对话或旁白文本"
  }
]

故事内容：
${story}`;

  const result = await callOpenAI(prompt, 3000);

  // 尝试解析 JSON 结果
  try {
    // 提取 JSON 数组部分（处理可能的 markdown 代码块包裹）
    let jsonStr = result.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const panels = JSON.parse(jsonStr);

    if (!Array.isArray(panels) || panels.length === 0) {
      throw new Error('AI 返回的面板数据格式不正确');
    }

    return panels.slice(0, panelCount);
  } catch (parseError) {
    console.error('[AI服务] 解析 AI 返回的面板描述失败:', parseError.message);
    console.error('[AI服务] 原始返回内容:', result);
    throw new Error('AI 返回的面板描述格式解析失败，请重试');
  }
}

// ============ Stability AI 调用函数 ============

/**
 * 调用 Stability AI 文生图 API
 * @param {string} textPrompt - 图像生成提示词
 * @param {string} style - 漫画风格（用于优化提示词）
 * @returns {Promise<string>} 生成的图片保存路径
 */
async function generateImageFromStabilityAI(textPrompt, style) {
  const apiKey = process.env.STABILITY_API_KEY;
  const styleName = SUPPORTED_STYLES[style] || style;

  // 根据风格优化提示词
  const enhancedPrompt = `${textPrompt}, ${styleName} style, high quality, detailed, professional comic illustration`;

  const formData = new FormData();
  formData.append('prompt', enhancedPrompt);
  formData.append('output_format', 'png');
  formData.append('width', '512');
  formData.append('height', '768');
  formData.append('steps', '30');
  formData.append('cfg_scale', '7');

  const response = await fetch(
    `${STABILITY_API_BASE}/generation/${STABILITY_ENGINE_ID}/text-to-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Stability AI API 调用失败 (${response.status}): ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.artifacts || data.artifacts.length === 0) {
    throw new Error('Stability AI 未返回生成的图像');
  }

  // 保存生成的图片
  const imageBuffer = Buffer.from(data.artifacts[0].base64, 'base64');
  const filename = `generated_${uuidv4()}.png`;
  const outputPath = path.join(process.cwd(), 'uploads', 'generated', filename);

  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, imageBuffer);

  return `/uploads/generated/${filename}`;
}

/**
 * 调用 Stability AI 图生图 API（风格迁移）
 * @param {string} inputImagePath - 输入图片的绝对路径
 * @param {string} style - 目标风格
 * @param {number} intensity - 风格强度 (0-1)
 * @returns {Promise<Object>} 风格迁移结果
 */
async function styleTransferFromStabilityAI(inputImagePath, style, intensity = 0.8) {
  const apiKey = process.env.STABILITY_API_KEY;
  const styleName = SUPPORTED_TRANSFER_STYLES[style] || style;

  // 读取输入图片并转为 base64
  if (!fs.existsSync(inputImagePath)) {
    throw new Error(`输入图片文件不存在: ${inputImagePath}`);
  }

  const imageBuffer = fs.readFileSync(inputImagePath);
  const imageBase64 = imageBuffer.toString('base64');

  const formData = new FormData();
  formData.append('init_image', imageBase64);
  formData.append(
    'image_strength',
    String(Math.max(0, Math.min(1, 1 - intensity)))
  );
  formData.append(
    'prompt',
    `${styleName} style illustration, high quality, detailed artwork`
  );
  formData.append('output_format', 'png');
  formData.append('steps', '30');
  formData.append('cfg_scale', '7');

  const response = await fetch(
    `${STABILITY_API_BASE}/generation/${STABILITY_ENGINE_ID}/image-to-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Stability AI 风格迁移 API 调用失败 (${response.status}): ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.artifacts || data.artifacts.length === 0) {
    throw new Error('Stability AI 未返回风格迁移后的图像');
  }

  // 保存风格迁移后的图片
  const outputBuffer = Buffer.from(data.artifacts[0].base64, 'base64');
  const filename = `styled_${style}_${uuidv4()}.png`;
  const outputPath = path.join(process.cwd(), 'uploads', 'styled', filename);

  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, outputBuffer);

  return {
    success: true,
    originalPath: inputImagePath,
    outputPath: `/uploads/styled/${filename}`,
    style: style,
    message: `已成功应用「${styleName}」风格`,
    processingTime: '3.5s',
    isMock: false,
  };
}

// ============ 核心导出函数 ============

/**
 * 生成漫画分镜面板
 *
 * 工作流程：
 * 1. 使用 OpenAI API 将故事文本拆分为面板描述和对话
 * 2. 使用 Stability AI API 为每个面板生成对应图像
 * 3. 如果 API 密钥未配置，则降级为 Mock 数据
 *
 * @param {Object} options - 生成参数
 * @param {string} options.story - 故事文本内容
 * @param {string} options.style - 漫画风格 (manga/comic/manhwa)
 * @param {number} options.panelCount - 面板数量 (1-20)
 * @returns {Promise<Array>} 面板数组，每项包含 { panelId, description, imageUrl, dialogue }
 */
async function generateComicPanels({ story, style = 'manga', panelCount = 4 }) {
  console.log(`[AI服务] 开始生成漫画分镜 - 风格: ${style}, 面板数: ${panelCount}`);

  // 参数验证
  if (!story || story.trim() === '') {
    throw new Error('故事文本内容不能为空');
  }

  const validStyles = Object.keys(SUPPORTED_STYLES);
  if (!validStyles.includes(style)) {
    throw new Error(`不支持的漫画风格: ${style}，可选值: ${validStyles.join(', ')}`);
  }

  if (panelCount < 1 || panelCount > 20) {
    throw new Error('面板数量应在 1-20 之间');
  }

  const hasOpenAI = isApiKeyConfigured('OPENAI_API_KEY');
  const hasStability = isApiKeyConfigured('STABILITY_API_KEY');

  // 判断使用哪种模式
  if (hasOpenAI && hasStability) {
    // 完整 AI 模式：使用 OpenAI 生成描述 + Stability AI 生成图像
    console.log('[AI服务] 使用完整 AI 模式（OpenAI + Stability AI）');

    try {
      // 第一步：使用 OpenAI 生成面板描述
      console.log('[AI服务] 正在调用 OpenAI 生成分镜描述...');
      const panelDescriptions = await generatePanelDescriptionsFromAI(
        story,
        style,
        panelCount
      );

      // 第二步：使用 Stability AI 为每个面板生成图像
      console.log('[AI服务] 正在调用 Stability AI 生成面板图像...');
      const panels = [];

      for (let i = 0; i < panelDescriptions.length; i++) {
        const desc = panelDescriptions[i];
        console.log(`[AI服务] 正在生成第 ${i + 1}/${panelDescriptions.length} 个面板图像...`);

        let imageUrl;
        try {
          imageUrl = await generateImageFromStabilityAI(desc.description, style);
        } catch (imgError) {
          console.warn(
            `[AI服务] 第 ${i + 1} 个面板图像生成失败，使用占位图: ${imgError.message}`
          );
          imageUrl = `/uploads/mock/panel_${style}_${i + 1}.png`;
        }

        panels.push({
          panelId: uuidv4(),
          order: i,
          description: desc.description,
          imageUrl: imageUrl,
          dialogue: desc.dialogue || '',
          width: 512,
          height: 768,
          createdAt: new Date().toISOString(),
        });
      }

      console.log(`[AI服务] 漫画分镜生成完成，共 ${panels.length} 个面板`);
      return panels;
    } catch (error) {
      console.error('[AI服务] AI 生成过程中出错，降级为 Mock 模式:', error.message);
      return generateMockPanels(story, style, panelCount);
    }
  } else if (hasOpenAI) {
    // 半 AI 模式：仅使用 OpenAI 生成描述，图像使用占位图
    console.log('[AI服务] 使用半 AI 模式（OpenAI 描述 + 占位图像）');
    console.log('[AI服务] 提示: 配置 STABILITY_API_KEY 可启用 AI 图像生成');

    try {
      const panelDescriptions = await generatePanelDescriptionsFromAI(
        story,
        style,
        panelCount
      );

      const panels = panelDescriptions.map((desc, i) => ({
        panelId: uuidv4(),
        order: i,
        description: desc.description,
        imageUrl: `/uploads/mock/panel_${style}_${i + 1}.png`,
        dialogue: desc.dialogue || '',
        width: 512,
        height: 768,
        createdAt: new Date().toISOString(),
      }));

      console.log(`[AI服务] 漫画分镜生成完成（半 AI 模式），共 ${panels.length} 个面板`);
      return panels;
    } catch (error) {
      console.error('[AI服务] OpenAI 调用失败，降级为 Mock 模式:', error.message);
      return generateMockPanels(story, style, panelCount);
    }
  } else {
    // Mock 模式：API 密钥均未配置
    console.log('[AI服务] OpenAI API 密钥未配置，使用 Mock 模式');
    console.log('[AI服务] 提示: 在 .env 文件中配置 OPENAI_API_KEY 可启用 AI 生成功能');
    return generateMockPanels(story, style, panelCount);
  }
}

/**
 * 图片风格迁移
 *
 * 将输入图片转换为指定的漫画/艺术风格
 * 使用 Stability AI 的图生图 API，未配置时降级为 Mock
 *
 * @param {Object} options - 风格迁移参数
 * @param {string} options.inputImagePath - 输入图片的绝对路径
 * @param {string} options.style - 目标风格 (manga/comic/watercolor/sketch/pixel-art)
 * @param {number} options.intensity - 风格强度 (0-1, 默认 0.8)
 * @returns {Promise<Object>} 迁移结果 { success, originalPath, outputPath, style, message, isMock }
 */
async function styleTransferImage({
  inputImagePath,
  style,
  intensity = 0.8,
}) {
  console.log(`[AI服务] 开始风格迁移 - 风格: ${style}, 强度: ${intensity}`);

  // 参数验证
  if (!inputImagePath) {
    throw new Error('输入图片路径不能为空');
  }

  const validStyles = Object.keys(SUPPORTED_TRANSFER_STYLES);
  if (!validStyles.includes(style)) {
    throw new Error(`不支持的风格类型: ${style}，可选值: ${validStyles.join(', ')}`);
  }

  const intensityNum = parseFloat(intensity);
  if (isNaN(intensityNum) || intensityNum < 0 || intensityNum > 1) {
    throw new Error('风格强度应在 0-1 之间');
  }

  // 检查 API 密钥
  if (isApiKeyConfigured('STABILITY_API_KEY')) {
    console.log('[AI服务] 使用 Stability AI 进行风格迁移');
    try {
      const result = await styleTransferFromStabilityAI(
        inputImagePath,
        style,
        intensityNum
      );
      console.log('[AI服务] 风格迁移完成');
      return result;
    } catch (error) {
      console.error('[AI服务] Stability AI 调用失败，降级为 Mock 模式:', error.message);
      return generateMockStyleTransfer(inputImagePath, style);
    }
  } else {
    console.log('[AI服务] Stability AI API 密钥未配置，使用 Mock 模式');
    console.log('[AI服务] 提示: 在 .env 文件中配置 STABILITY_API_KEY 可启用 AI 风格迁移');
    return generateMockStyleTransfer(inputImagePath, style);
  }
}

/**
 * 生成对话文本
 *
 * 根据面板描述生成合适的角色对话或旁白
 * 使用 OpenAI API，未配置时降级为 Mock
 *
 * @param {Object} options - 对话生成参数
 * @param {string} options.panelDescription - 面板的画面描述
 * @param {string} options.context - 上下文信息（可选，如故事背景）
 * @param {string} options.dialogueType - 对话类型 (speech/thought/narration)
 * @returns {Promise<string>} 生成的对话文本
 */
async function generateDialogue({
  panelDescription,
  context = '',
  dialogueType = 'speech',
}) {
  console.log(`[AI服务] 开始生成对话 - 类型: ${dialogueType}`);

  // 参数验证
  if (!panelDescription || panelDescription.trim() === '') {
    throw new Error('面板描述不能为空');
  }

  const validTypes = ['speech', 'thought', 'narration'];
  if (!validTypes.includes(dialogueType)) {
    throw new Error(`不支持的对话类型: ${dialogueType}，可选值: ${validTypes.join(', ')}`);
  }

  // 检查 API 密钥
  if (isApiKeyConfigured('OPENAI_API_KEY')) {
    console.log('[AI服务] 使用 OpenAI 生成对话文本');

    const typeLabels = {
      speech: '角色对话（口语）',
      thought: '内心独白（思考）',
      narration: '旁白叙述',
    };

    const prompt = `基于以下漫画面板的画面描述，生成一句简短合适的${typeLabels[dialogueType]}。

要求：
- 内容简洁有力，适合漫画分镜
- 字数控制在 30 字以内
- 符合画面场景和氛围
- ${dialogueType === 'thought' ? '使用括号或特殊格式表示内心独白' : ''}
- ${dialogueType === 'narration' ? '使用旁白语气，描述场景或角色状态' : ''}
- 只返回对话文本本身，不要包含引号或其他格式

画面描述：${panelDescription}
${context ? `故事背景：${context}` : ''}`;

    try {
      const dialogue = await callOpenAI(prompt, 200);
      // 清理返回文本
      const cleaned = dialogue
        .replace(/^["'""'「」『』]/, '')
        .replace(/["'""'」』]$/, '')
        .trim();
      console.log('[AI服务] 对话生成完成:', cleaned);
      return cleaned;
    } catch (error) {
      console.error('[AI服务] OpenAI 对话生成失败，降级为 Mock:', error.message);
      return generateMockDialogue(panelDescription);
    }
  } else {
    console.log('[AI服务] OpenAI API 密钥未配置，使用 Mock 模式生成对话');
    console.log('[AI服务] 提示: 在 .env 文件中配置 OPENAI_API_KEY 可启用 AI 对话生成');
    return generateMockDialogue(panelDescription);
  }
}

// ============ 模块导出 ============

module.exports = {
  // 核心功能函数
  generateComicPanels,
  styleTransferImage,
  generateDialogue,

  // 配置常量（供外部引用）
  SUPPORTED_STYLES,
  SUPPORTED_TRANSFER_STYLES,

  // 工具函数（供测试或外部使用）
  isApiKeyConfigured,
  generateMockPanels,
  generateMockDialogue,
};
