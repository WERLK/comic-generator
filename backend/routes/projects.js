/**
 * routes/projects.js - 项目管理路由模块
 *
 * 功能说明：
 * - 提供漫画项目的完整 CRUD 操作
 * - 支持项目内页面的增删改查
 * - 使用内存数组作为数据存储（后续可替换为数据库）
 *
 * 数据结构：
 * - project: { id, title, description, createdAt, updatedAt, pages: [] }
 * - page: { id, imageUrl, caption, order, width, height, createdAt, updatedAt }
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

// 创建路由器实例
const router = express.Router();

// ============ 内存数据存储 ============
// 使用数组模拟数据库，所有项目数据保存在内存中
// 注意：服务器重启后数据会丢失，生产环境应使用数据库
let projects = [];

// ============ 项目 CRUD 路由 ============

/**
 * GET /api/projects
 * 获取所有项目列表
 * 支持通过 query 参数进行简单的分页
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 20）
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // 计算分页偏移量
    const offset = (page - 1) * limit;
    const paginatedProjects = projects.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginatedProjects,
      total: projects.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取项目列表失败',
      error: error.message
    });
  }
});

/**
 * POST /api/projects
 * 创建新的漫画项目
 *
 * 请求体：
 * - title: 项目标题（必填）
 * - description: 项目描述（选填）
 */
router.post('/', (req, res) => {
  try {
    const { title, description } = req.body;

    // 验证必填字段
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '项目标题不能为空'
      });
    }

    // 创建新项目对象
    const newProject = {
      id: uuidv4(),                          // 生成唯一标识符
      title: title.trim(),                   // 项目标题
      description: description || '',        // 项目描述
      pages: [],                              // 页面列表（初始为空）
      createdAt: new Date().toISOString(),    // 创建时间
      updatedAt: new Date().toISOString()     // 更新时间
    };

    // 将新项目添加到存储中
    projects.push(newProject);

    // 返回创建成功的项目信息（HTTP 状态码 201 表示已创建）
    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: newProject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建项目失败',
      error: error.message
    });
  }
});

/**
 * GET /api/projects/:id
 * 根据 ID 获取单个项目详情
 *
 * 路径参数：
 * - id: 项目唯一标识符
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 在存储中查找对应项目
    const project = projects.find(p => p.id === id);

    // 项目不存在时返回 404
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取项目详情失败',
      error: error.message
    });
  }
});

/**
 * PUT /api/projects/:id
 * 更新项目信息
 *
 * 路径参数：
 * - id: 项目唯一标识符
 *
 * 请求体：
 * - title: 新的项目标题（选填）
 * - description: 新的项目描述（选填）
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // 查找项目索引
    const projectIndex = projects.findIndex(p => p.id === id);

    // 项目不存在时返回 404
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 更新项目信息（仅更新提供的字段）
    const project = projects[projectIndex];
    if (title !== undefined) {
      project.title = title.trim();
    }
    if (description !== undefined) {
      project.description = description;
    }
    project.updatedAt = new Date().toISOString();

    // 更新存储中的项目
    projects[projectIndex] = project;

    res.json({
      success: true,
      message: '项目更新成功',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新项目失败',
      error: error.message
    });
  }
});

/**
 * DELETE /api/projects/:id
 * 删除指定项目
 *
 * 路径参数：
 * - id: 项目唯一标识符
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 查找项目索引
    const projectIndex = projects.findIndex(p => p.id === id);

    // 项目不存在时返回 404
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 从存储中移除项目
    const deletedProject = projects.splice(projectIndex, 1)[0];

    res.json({
      success: true,
      message: '项目删除成功',
      data: deletedProject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除项目失败',
      error: error.message
    });
  }
});

// ============ 页面管理路由 ============

/**
 * POST /api/projects/:id/pages
 * 向指定项目添加新页面
 *
 * 路径参数：
 * - id: 项目唯一标识符
 *
 * 请求体：
 * - imageUrl: 页面图片地址（必填）
 * - caption: 页面说明文字（选填）
 * - order: 页面排序序号（选填，默认添加到末尾）
 * - width: 图片宽度（选填）
 * - height: 图片高度（选填）
 */
router.post('/:id/pages', (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, caption, order, width, height } = req.body;

    // 查找项目
    const project = projects.find(p => p.id === id);

    // 项目不存在时返回 404
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 验证必填字段
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '页面图片地址不能为空'
      });
    }

    // 创建新页面对象
    const newPage = {
      id: uuidv4(),                          // 生成唯一标识符
      imageUrl: imageUrl,                     // 页面图片地址
      caption: caption || '',                 // 页面说明文字
      order: order !== undefined ? order : project.pages.length, // 排序序号
      width: width || 800,                    // 图片宽度（默认 800px）
      height: height || 1200,                 // 图片高度（默认 1200px）
      createdAt: new Date().toISOString(),    // 创建时间
      updatedAt: new Date().toISOString()     // 更新时间
    };

    // 将新页面添加到项目的页面列表中
    project.pages.push(newPage);
    project.updatedAt = new Date().toISOString();

    res.status(201).json({
      success: true,
      message: '页面添加成功',
      data: newPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加页面失败',
      error: error.message
    });
  }
});

/**
 * PUT /api/projects/:id/pages/:pageId
 * 更新指定项目中的指定页面
 *
 * 路径参数：
 * - id: 项目唯一标识符
 * - pageId: 页面唯一标识符
 *
 * 请求体：
 * - imageUrl: 新的图片地址（选填）
 * - caption: 新的说明文字（选填）
 * - order: 新的排序序号（选填）
 * - width: 新的图片宽度（选填）
 * - height: 新的图片高度（选填）
 */
router.put('/:id/pages/:pageId', (req, res) => {
  try {
    const { id, pageId } = req.params;
    const { imageUrl, caption, order, width, height } = req.body;

    // 查找项目
    const project = projects.find(p => p.id === id);

    // 项目不存在时返回 404
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 在项目中查找目标页面
    const pageIndex = project.pages.findIndex(page => page.id === pageId);

    // 页面不存在时返回 404
    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '页面不存在'
      });
    }

    // 更新页面信息（仅更新提供的字段）
    const page = project.pages[pageIndex];
    if (imageUrl !== undefined) page.imageUrl = imageUrl;
    if (caption !== undefined) page.caption = caption;
    if (order !== undefined) page.order = order;
    if (width !== undefined) page.width = width;
    if (height !== undefined) page.height = height;
    page.updatedAt = new Date().toISOString();

    // 更新项目的修改时间
    project.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: '页面更新成功',
      data: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新页面失败',
      error: error.message
    });
  }
});

/**
 * DELETE /api/projects/:id/pages/:pageId
 * 删除指定项目中的指定页面
 *
 * 路径参数：
 * - id: 项目唯一标识符
 * - pageId: 页面唯一标识符
 */
router.delete('/:id/pages/:pageId', (req, res) => {
  try {
    const { id, pageId } = req.params;

    // 查找项目
    const project = projects.find(p => p.id === id);

    // 项目不存在时返回 404
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 查找页面索引
    const pageIndex = project.pages.findIndex(page => page.id === pageId);

    // 页面不存在时返回 404
    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '页面不存在'
      });
    }

    // 从页面列表中移除该页面
    const deletedPage = project.pages.splice(pageIndex, 1)[0];

    // 更新项目的修改时间
    project.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: '页面删除成功',
      data: deletedPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除页面失败',
      error: error.message
    });
  }
});

// 导出路由器模块
module.exports = router;
