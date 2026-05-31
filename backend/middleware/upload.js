/**
 * middleware/upload.js - Multer 文件上传中间件配置
 *
 * 功能说明：
 * - 配置 Multer 中间件用于处理 multipart/form-data 类型的文件上传
 * - 设置文件存储位置为 uploads/ 目录
 * - 配置文件大小限制和文件类型过滤
 * - 自定义文件命名策略，避免文件名冲突
 *
 * 使用方式：
 * - 单文件上传: upload.single('fieldName')
 * - 多文件上传: upload.array('fieldName', maxCount)
 * - 多字段文件上传: upload.fields([{ name: 'field1', maxCount: 1 }, ...])
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// ============ 确保上传目录存在 ============
const uploadDir = path.join(__dirname, '..', 'uploads');

// 如果 uploads 目录不存在则创建
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  // 同时创建子目录用于分类存储
  fs.mkdirSync(path.join(uploadDir, 'mock'), { recursive: true });
}

// ============ 存储引擎配置 ============

// 使用磁盘存储引擎，将上传的文件保存到本地磁盘
const storage = multer.diskStorage({
  /**
   * 设置文件存储目标目录
   * @param {Object} req - Express 请求对象
   * @param {Object} file - 上传的文件对象
   * @param {Function} cb - 回调函数
   */
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  /**
   * 自定义文件命名策略
   * 使用 UUID 生成唯一文件名，避免同名文件覆盖
   * 保留原始文件扩展名以确保文件类型正确
   *
   * @param {Object} req - Express 请求对象
   * @param {Object} file - 上传的文件对象
   * @param {Function} cb - 回调函数
   */
  filename: (req, file, cb) => {
    // 生成唯一文件名: UUID + 原始扩展名
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// ============ 文件过滤器 ============

/**
 * 文件类型过滤函数
 * 仅允许上传图片文件（jpg、jpeg、png、gif、webp 格式）
 * 拒绝其他类型的文件上传
 */
const fileFilter = (req, file, cb) => {
  // 定义允许的文件 MIME 类型
  const allowedMimeTypes = [
    'image/jpeg',   // JPEG 图片
    'image/jpg',    // JPG 图片
    'image/png',    // PNG 图片
    'image/gif',    // GIF 图片
    'image/webp'    // WebP 图片
  ];

  // 定义允许的文件扩展名
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // 获取文件扩展名（转为小写进行比较）
  const ext = path.extname(file.originalname).toLowerCase();

  // 检查 MIME 类型和扩展名是否都在允许列表中
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    // 接受文件
    cb(null, true);
  } else {
    // 拒绝文件，并返回错误信息
    cb(new Error(`不支持的文件类型: ${file.mimetype}，仅允许上传图片文件（jpg、png、gif、webp）`), false);
  }
};

// ============ Multer 实例配置 ============

// 创建 Multer 实例，整合存储引擎、文件过滤器和大小限制
const upload = multer({
  storage: storage,              // 使用自定义的磁盘存储引擎
  fileFilter: fileFilter,        // 使用自定义的文件类型过滤器
  limits: {
    fileSize: 10 * 1024 * 1024,  // 单个文件大小限制: 10MB
    files: 10                     // 单次请求最多上传 10 个文件
  }
});

// ============ 导出 ============

// 导出配置好的 Multer 实例
module.exports = upload;
