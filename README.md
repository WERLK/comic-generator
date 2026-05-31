# 🎨 漫剧生成器 - AI Comic Generator

一个基于 AI 的漫剧生成网站，支持文字转漫画、图片转漫画、漫画编辑器、音频配音和视频漫剧生成。**全面适配手机、平板、桌面多端访问。**

## ✨ 功能特性

### 📝 文字转漫画
- 输入故事文本，AI 自动拆分场景
- 支持多种漫画风格：日漫、美漫、韩漫
- 自动生成分镜画面和对话

### 🖼️ 图片转漫画
- 上传照片/图片，一键转换为漫画风格
- 支持多种风格：漫画、水彩、素描、像素风
- 前后对比预览

### ✏️ 漫画编辑器
- 可视化画布编辑器
- 对话气泡（对话/思考/呐喊/旁白）
- 文字、形状、图片元素
- 图层管理、撤销/重做
- 键盘快捷键 + **触屏手势支持**

### 🎙️ 音频生成（新增）
- **TTS 语音合成**：5 种中文语音（男声×2、女声×2、旁白）
- **AI 背景音乐**：支持史诗/平静/欢快/悲伤/紧张等多种情绪
- **音频混合**：语音 + 背景音乐智能混音，语音优先自动降音
- **逐页配音**：为每个漫画页面单独配置旁白/对话
- 支持 Edge TTS 真实语音合成，未安装时自动降级

### 🎬 视频漫剧
- 漫画页面转动态视频
- 多种转场效果（淡入淡出、滑入、缩放）
- 自定义分辨率（1080p/720p/480p）和帧率（24/30/60fps）
- **配音自动嵌入视频**
- 背景音乐混入

### 📱 多端适配（新增）
- **手机端**：汉堡菜单导航、触屏拖拽编辑、自适应布局
- **平板端**：优化的双栏/三栏布局切换
- **桌面端**：完整功能体验
- 安全区域适配（刘海屏）、防止 iOS 输入缩放

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + React Router v6 |
| 后端 | Node.js + Express |
| AI 图像 | Stability AI API / OpenAI API |
| AI 语音 | Edge TTS（降级：FFmpeg） |
| 视频合成 | FFmpeg (fluent-ffmpeg) |
| 文件上传 | Multer |
| 图标 | Lucide React |

## 📁 项目结构

```
comic-generator/
├── backend/
│   ├── server.js              # Express 主服务
│   ├── package.json
│   ├── .env.example           # 环境变量配置示例
│   ├── middleware/
│   │   └── upload.js          # 文件上传中间件
│   ├── routes/
│   │   ├── projects.js        # 项目 CRUD 路由
│   │   ├── generate.js        # AI 生成路由
│   │   ├── audio.js           # 🆕 音频生成/上传路由
│   │   └── video.js           # 视频生成路由（已集成 audioService）
│   ├── services/
│   │   ├── aiService.js       # AI 服务（图像生成/对话生成）
│   │   ├── audioService.js    # 🆕 TTS 语音合成 + 音频混合服务
│   │   └── videoService.js    # 视频合成服务（含音频混音）
│   ├── uploads/               # 上传文件目录
│   ├── audio/                 # 🆕 音频文件输出目录
│   └── videos/                # 视频输出目录
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx           # React 入口
│       ├── App.jsx            # 路由配置（Layout 嵌套）
│       ├── App.css            # 全局样式（含响应式媒体查询）
│       ├── components/
│       │   └── Layout.jsx     # 🆕 全局布局（含响应式导航栏）
│       ├── api/
│       │   └── index.js       # API 客户端（含音频接口）
│       └── pages/
│           ├── HomePage.jsx       # 首页
│           ├── CreatePage.jsx     # 文字转漫画
│           ├── ImageToComicPage.jsx # 图片转漫画
│           ├── EditorPage.jsx     # 漫画编辑器（含触屏支持）
│           ├── VideoPage.jsx      # 视频漫剧（含音频配置）
│           └── ProjectsPage.jsx   # 项目列表
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9
- FFmpeg（音频/视频合成，推荐安装）
- edge-tts（可选，用于真实 TTS 语音合成：`pip install edge-tts`）

### 安装步骤

```bash
# 1. 进入项目目录
cd comic-generator

# 2. 安装后端依赖
cd backend && npm install

# 3. 安装前端依赖
cd ../frontend && npm install

# 4. 配置环境变量
cd ../backend
cp .env.example .env
# 编辑 .env 填入你的 API Key
```

### 启动服务

```bash
# 启动后端（端口 3001）
cd backend
npm run dev

# 启动前端（端口 5173）
cd frontend
npm run dev
```

访问 http://localhost:5173 即可使用。

### AI 功能配置

编辑 `backend/.env` 文件：

```env
# 端口
PORT=3001

# OpenAI API Key（用于故事拆分和对话生成）
OPENAI_API_KEY=sk-your-key-here

# Stability AI API Key（用于图像生成）
STABILITY_API_KEY=sk-your-key-here
```

### TTS 语音配置（可选）

安装 edge-tts 获得真实中文语音：
```bash
pip install edge-tts
```

> 💡 **提示**：未配置 API Key 时系统自动使用 Mock 模式；未安装 edge-tts 时音频服务自动降级为 FFmpeg 占位模式。

## 🎯 使用流程

1. **创建项目** → 在首页点击"开始创作"
2. **生成漫画** → 输入故事文本或上传图片，选择风格，点击生成
3. **编辑完善** → 在编辑器中添加对话气泡、调整布局（支持触屏操作）
4. **配置音频** → 为每页添加配音，选择语音类型，生成背景音乐
5. **导出视频** → 设置转场效果，生成含配音的动态漫剧视频

## 🔧 编辑器快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+S | 保存 |
| Delete | 删除选中元素 |
| Escape | 取消选中/编辑 |

## 📡 API 接口

### 项目管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |

### AI 生成
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/generate/text-to-comic | 文字转漫画 |
| POST | /api/generate/image-to-comic | 图片转漫画 |
| POST | /api/generate/style-transfer | 风格迁移 |

### 🆕 音频
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/audio/generate-speech | 文字转语音（TTS） |
| POST | /api/audio/generate-bgm | AI 生成背景音乐 |
| POST | /api/audio/upload-audio | 上传音频文件 |
| POST | /api/audio/mix-audio | 混合多个音轨 |
| GET | /api/audio/voices | 获取可用语音列表 |

### 视频
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/video/create | 创建视频任务（支持音频） |
| POST | /api/video/add-narration | 🆕 为页面添加旁白配音 |
| GET | /api/video/status/:jobId | 查询视频状态 |
| GET | /api/video/download/:jobId | 下载视频 |

## 📄 License

MIT
