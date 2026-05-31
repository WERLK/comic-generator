import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Type,
  MessageSquare,
  Square,
  Circle,
  Sparkles,
  Layers,
  Plus,
  ArrowLeft,
  Move,
  Pencil,
  Eraser,
  ImagePlus,
  Trash2,
  Eye,
  Grid3X3,
  ChevronUp,
  ChevronDown,
  GripVertical,
  MousePointer,
  Copy,
  X,
  Check,
  Maximize2,
  Image,
  BookOpen,
} from 'lucide-react';

// ============ 初始状态与常量 ============

// 生成唯一 ID
const genId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// 创建默认页面
const createDefaultPage = (index) => ({
  id: genId(),
  label: `第 ${index + 1} 页`,
  elements: [],
});

// 初始编辑器状态
const initialState = {
  // 项目信息
  projectName: '未命名项目',
  // 页面列表
  pages: [createDefaultPage(0)],
  // 当前选中页面索引
  activePageIndex: 0,
  // 当前选中元素 ID
  selectedElementId: null,
  // 当前工具
  activeTool: 'select',
  // 缩放级别
  zoom: 1,
  // 是否显示网格
  showGrid: false,
  // 是否吸附到网格
  snapToGrid: false,
  // 撤销/重做历史
  history: [],
  historyIndex: -1,
  // 正在编辑文本的元素 ID
  editingTextId: null,
  // 是否显示预览
  showPreview: false,
};

// ============ Reducer 定义 ============

// Action 类型常量
const ACTIONS = {
  SET_PROJECT_NAME: 'SET_PROJECT_NAME',
  ADD_PAGE: 'ADD_PAGE',
  DELETE_PAGE: 'DELETE_PAGE',
  REORDER_PAGE: 'REORDER_PAGE',
  SET_ACTIVE_PAGE: 'SET_ACTIVE_PAGE',
  ADD_ELEMENT: 'ADD_ELEMENT',
  UPDATE_ELEMENT: 'UPDATE_ELEMENT',
  DELETE_ELEMENT: 'DELETE_ELEMENT',
  SELECT_ELEMENT: 'SELECT_ELEMENT',
  SET_TOOL: 'SET_TOOL',
  SET_ZOOM: 'SET_ZOOM',
  TOGGLE_GRID: 'TOGGLE_GRID',
  TOGGLE_SNAP: 'TOGGLE_SNAP',
  SET_EDITING_TEXT: 'SET_EDITING_TEXT',
  MOVE_ELEMENT: 'MOVE_ELEMENT',
  BRING_FORWARD: 'BRING_FORWARD',
  SEND_BACKWARD: 'SEND_BACKWARD',
  DUPLICATE_ELEMENT: 'DUPLICATE_ELEMENT',
  SET_SHOW_PREVIEW: 'SET_SHOW_PREVIEW',
  PUSH_HISTORY: 'PUSH_HISTORY',
  UNDO: 'UNDO',
  REDO: 'REDO',
  LOAD_STATE: 'LOAD_STATE',
};

// 深拷贝辅助函数
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// 编辑器 Reducer
function editorReducer(state, action) {
  // 获取当前页面的辅助函数
  const getCurrentPage = (s) => s.pages[s.activePageIndex];
  const updateCurrentPage = (s, updater) => {
    const newPages = [...s.pages];
    newPages[s.activePageIndex] = updater(newPages[s.activePageIndex]);
    return { ...s, pages: newPages };
  };

  switch (action.type) {
    case ACTIONS.SET_PROJECT_NAME:
      return { ...state, projectName: action.payload };

    case ACTIONS.ADD_PAGE: {
      const newPage = createDefaultPage(state.pages.length);
      return {
        ...state,
        pages: [...state.pages, newPage],
        activePageIndex: state.pages.length,
        selectedElementId: null,
      };
    }

    case ACTIONS.DELETE_PAGE: {
      if (state.pages.length <= 1) return state;
      const newPages = state.pages.filter((_, i) => i !== action.payload);
      const newActiveIndex = Math.min(state.activePageIndex, newPages.length - 1);
      return {
        ...state,
        pages: newPages,
        activePageIndex: newActiveIndex,
        selectedElementId: null,
      };
    }

    case ACTIONS.REORDER_PAGE: {
      const { fromIndex, toIndex } = action.payload;
      const newPages = [...state.pages];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      return { ...state, pages: newPages };
    }

    case ACTIONS.SET_ACTIVE_PAGE:
      return {
        ...state,
        activePageIndex: action.payload,
        selectedElementId: null,
        editingTextId: null,
      };

    case ACTIONS.ADD_ELEMENT: {
      const newElement = action.payload;
      return updateCurrentPage(state, (page) => ({
        ...page,
        elements: [...page.elements, newElement],
      }));
    }

    case ACTIONS.UPDATE_ELEMENT: {
      const { elementId, updates } = action.payload;
      return updateCurrentPage(state, (page) => ({
        ...page,
        elements: page.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      }));
    }

    case ACTIONS.DELETE_ELEMENT: {
      return updateCurrentPage(state, (page) => ({
        ...page,
        elements: page.elements.filter((el) => el.id !== action.payload),
      }));
    }

    case ACTIONS.SELECT_ELEMENT:
      return { ...state, selectedElementId: action.payload };

    case ACTIONS.SET_TOOL:
      return { ...state, activeTool: action.payload, editingTextId: null };

    case ACTIONS.SET_ZOOM: {
      const newZoom = Math.max(0.25, Math.min(3, action.payload));
      return { ...state, zoom: newZoom };
    }

    case ACTIONS.TOGGLE_GRID:
      return { ...state, showGrid: !state.showGrid };

    case ACTIONS.TOGGLE_SNAP:
      return { ...state, snapToGrid: !state.snapToGrid };

    case ACTIONS.SET_EDITING_TEXT:
      return { ...state, editingTextId: action.payload };

    case ACTIONS.MOVE_ELEMENT: {
      const { elementId, x, y } = action.payload;
      return updateCurrentPage(state, (page) => ({
        ...page,
        elements: page.elements.map((el) =>
          el.id === elementId ? { ...el, x, y } : el
        ),
      }));
    }

    case ACTIONS.BRING_FORWARD: {
      const elId = action.payload;
      return updateCurrentPage(state, (page) => {
        const idx = page.elements.findIndex((el) => el.id === elId);
        if (idx < 0 || idx >= page.elements.length - 1) return page;
        const newElements = [...page.elements];
        [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        return { ...page, elements: newElements };
      });
    }

    case ACTIONS.SEND_BACKWARD: {
      const elId = action.payload;
      return updateCurrentPage(state, (page) => {
        const idx = page.elements.findIndex((el) => el.id === elId);
        if (idx <= 0) return page;
        const newElements = [...page.elements];
        [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        return { ...page, elements: newElements };
      });
    }

    case ACTIONS.DUPLICATE_ELEMENT: {
      const elId = action.payload;
      return updateCurrentPage(state, (page) => {
        const element = page.elements.find((el) => el.id === elId);
        if (!element) return page;
        const newEl = { ...deepClone(element), id: genId(), x: element.x + 20, y: element.y + 20 };
        return { ...page, elements: [...page.elements, newEl] };
      });
    }

    case ACTIONS.SET_SHOW_PREVIEW:
      return { ...state, showPreview: action.payload };

    case ACTIONS.PUSH_HISTORY: {
      const snapshot = {
        pages: deepClone(state.pages),
        activePageIndex: state.activePageIndex,
        projectName: state.projectName,
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      // 限制历史记录数量
      if (newHistory.length > 50) newHistory.shift();
      return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    case ACTIONS.UNDO: {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        pages: deepClone(snapshot.pages),
        activePageIndex: snapshot.activePageIndex,
        projectName: snapshot.projectName,
        historyIndex: newIndex,
        selectedElementId: null,
        editingTextId: null,
      };
    }

    case ACTIONS.REDO: {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        pages: deepClone(snapshot.pages),
        activePageIndex: snapshot.activePageIndex,
        projectName: snapshot.projectName,
        historyIndex: newIndex,
        selectedElementId: null,
        editingTextId: null,
      };
    }

    case ACTIONS.LOAD_STATE:
      return { ...action.payload, history: [], historyIndex: -1 };

    default:
      return state;
  }
}

// ============ 子组件 ============

/** 顶部工具栏 */
function TopBar({ state, dispatch }) {
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return (
    <div className="editor-topbar">
      <div className="editor-topbar-left">
        <Link to="/projects" style={{ color: 'var(--text-secondary)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </Link>
        <input
          type="text"
          value={state.projectName}
          onChange={(e) => dispatch({ type: ACTIONS.SET_PROJECT_NAME, payload: e.target.value })}
          style={{
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-family)',
            width: '200px',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-color)')}
          onBlur={(e) => (e.target.style.borderColor = 'transparent')}
        />
        <span className="badge">编辑中</span>
      </div>
      <div className="editor-topbar-right">
        <button
          className="btn btn-icon btn-secondary"
          title="撤销 (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: ACTIONS.UNDO })}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="btn btn-icon btn-secondary"
          title="重做 (Ctrl+Y)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: ACTIONS.REDO })}
        >
          <Redo2 size={18} />
        </button>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
        <button
          className="btn btn-icon btn-secondary"
          title="缩小"
          onClick={() => dispatch({ type: ACTIONS.SET_ZOOM, payload: state.zoom - 0.1 })}
        >
          <ZoomOut size={18} />
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          className="btn btn-icon btn-secondary"
          title="放大"
          onClick={() => dispatch({ type: ACTIONS.SET_ZOOM, payload: state.zoom + 0.1 })}
        >
          <ZoomIn size={18} />
        </button>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
        <button className="btn btn-secondary" title="保存项目 (Ctrl+S)">
          <Save size={16} />
          保存
        </button>
        <button className="btn btn-secondary" title="导出为图片">
          <Download size={16} />
          导出
        </button>
        <button
          className="btn btn-primary"
          title="预览"
          onClick={() => dispatch({ type: ACTIONS.SET_SHOW_PREVIEW, payload: true })}
        >
          <Eye size={16} />
          预览
        </button>
      </div>
    </div>
  );
}

/** 左侧页面列表面板 */
function PageListPanel({ state, dispatch }) {
  const dragItemIndex = useRef(null);
  const dragOverIndex = useRef(null);

  // 拖拽开始
  const handleDragStart = (index) => {
    dragItemIndex.current = index;
  };

  // 拖拽经过
  const handleDragOver = (e, index) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  // 拖拽结束
  const handleDrop = (index) => {
    if (dragItemIndex.current === null || dragItemIndex.current === index) return;
    dispatch({
      type: ACTIONS.REORDER_PAGE,
      payload: { fromIndex: dragItemIndex.current, toIndex: index },
    });
    dragItemIndex.current = null;
    dragOverIndex.current = null;
  };

  return (
    <div className="editor-sidebar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
        <h3 style={{ margin: 0 }}>页面列表</h3>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => {
            dispatch({ type: ACTIONS.ADD_PAGE });
          }}
          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
        >
          <Plus size={12} />
        </button>
      </div>

      {state.pages.map((page, index) => (
        <div
          key={page.id}
          className={`page-thumbnail ${state.activePageIndex === index ? 'active' : ''}`}
          onClick={() => dispatch({ type: ACTIONS.SET_ACTIVE_PAGE, payload: index })}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          style={{ position: 'relative', cursor: 'grab' }}
        >
          <div style={{ textAlign: 'center' }}>
            <Layers size={16} style={{ marginBottom: '4px', opacity: 0.5 }} />
            <div style={{ fontSize: '0.7rem' }}>{page.label}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              {page.elements.length} 个元素
            </div>
          </div>
          {/* 悬停时显示删除按钮 */}
          {state.pages.length > 1 && (
            <button
              className="page-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: ACTIONS.DELETE_PAGE, payload: index });
              }}
              title="删除页面"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(233, 69, 96, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                color: '#fff',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      <button
        className="btn btn-sm btn-outline"
        style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
        onClick={() => dispatch({ type: ACTIONS.ADD_PAGE })}
      >
        <Plus size={14} />
        添加页面
      </button>
    </div>
  );
}

/** 画布上的元素渲染组件 */
function CanvasElement({ element, isSelected, isEditing, state, dispatch, canvasRef }) {
  const elRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // 处理元素点击选中
  const handleClick = (e) => {
    e.stopPropagation();
    if (state.activeTool === 'select') {
      dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: element.id });
    }
  };

  // 处理双击编辑文本
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (element.type === 'text' || element.type === 'bubble') {
      dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: element.id });
    }
  };

  // 处理拖拽移动
  const handleMouseDown = (e) => {
    if (state.activeTool !== 'select') return;
    e.stopPropagation();
    isDragging.current = true;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const scale = state.zoom;
    dragOffset.current = {
      x: e.clientX - element.x * scale - (canvasRect?.left || 0),
      y: e.clientY - element.y * scale - (canvasRect?.top || 0),
    };

    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      let newX = (moveEvent.clientX - dragOffset.current.x - rect.left) / scale;
      let newY = (moveEvent.clientY - dragOffset.current.y - rect.top) / scale;

      // 网格吸附
      if (state.snapToGrid) {
        const gridSize = 20;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      dispatch({ type: ACTIONS.MOVE_ELEMENT, payload: { elementId: element.id, x: newX, y: newY } });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ============ 触摸事件处理 ============

  const touchDragOffset = useRef({ x: 0, y: 0 });
  const isTouchDragging = useRef(false);
  const touchElementRef = useRef(null);

  const handleTouchStart = (e) => {
    if (state.activeTool !== 'select') return;
    // 只处理单指触摸（不处理双指缩放）
    if (e.touches.length !== 1) return;
    e.stopPropagation();

    const touch = e.touches[0];
    isTouchDragging.current = true;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const scale = state.zoom;
    touchDragOffset.current = {
      x: touch.clientX - element.x * scale - (canvasRect?.left || 0),
      y: touch.clientY - element.y * scale - (canvasRect?.top || 0),
    };

    // 添加视觉反馈
    touchElementRef.current = e.currentTarget;
    if (touchElementRef.current) {
      touchElementRef.current.classList.add('touch-dragging');
    }

    const handleTouchMove = (moveEvent) => {
      if (!isTouchDragging.current) return;
      moveEvent.preventDefault(); // 防止页面滚动
      const moveTouch = moveEvent.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      let newX = (moveTouch.clientX - touchDragOffset.current.x - rect.left) / scale;
      let newY = (moveTouch.clientY - touchDragOffset.current.y - rect.top) / scale;

      // 网格吸附
      if (state.snapToGrid) {
        const gridSize = 20;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      dispatch({ type: ACTIONS.MOVE_ELEMENT, payload: { elementId: element.id, x: newX, y: newY } });
    };

    const handleTouchEnd = () => {
      isTouchDragging.current = false;
      // 移除视觉反馈
      if (touchElementRef.current) {
        touchElementRef.current.classList.remove('touch-dragging');
        touchElementRef.current = null;
      }
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // 渲染不同类型的元素
  const renderElement = () => {
    const baseStyle = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      cursor: state.activeTool === 'select' ? 'move' : 'crosshair',
    };

    switch (element.type) {
      case 'rect':
        return (
          <div
            ref={elRef}
            style={{
              ...baseStyle,
              backgroundColor: element.fill || 'transparent',
              border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`,
              borderRadius: element.borderRadius || 0,
            }}
          />
        );

      case 'circle':
        return (
          <div
            ref={elRef}
            style={{
              ...baseStyle,
              backgroundColor: element.fill || 'transparent',
              border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`,
              borderRadius: '50%',
            }}
          />
        );

      case 'image':
        return (
          <div
            ref={elRef}
            style={{
              ...baseStyle,
              backgroundColor: '#f0f0f0',
              border: '2px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '4px',
              color: '#999',
              fontSize: '0.7rem',
              overflow: 'hidden',
            }}
          >
            <Image size={24} />
            <span>图片占位</span>
          </div>
        );

      case 'text':
        return (
          <div
            ref={elRef}
            style={{
              ...baseStyle,
              color: element.color || '#000',
              fontSize: `${element.fontSize || 14}px`,
              fontWeight: element.fontWeight || 'normal',
              fontFamily: element.fontFamily || 'sans-serif',
              textAlign: element.textAlign || 'left',
              lineHeight: '1.4',
              padding: '4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
            }}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={element.text || ''}
                onChange={(e) =>
                  dispatch({
                    type: ACTIONS.UPDATE_ELEMENT,
                    payload: { elementId: element.id, updates: { text: e.target.value } },
                  })
                }
                onBlur={() => dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null });
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.9)',
                  border: '2px solid var(--accent-primary)',
                  borderRadius: '2px',
                  color: '#000',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  padding: '2px',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            ) : (
              element.text || '双击编辑文字'
            )}
          </div>
        );

      case 'bubble':
        return (
          <div
            ref={elRef}
            style={{
              ...baseStyle,
              position: 'absolute',
            }}
          >
            {/* 气泡主体 */}
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#fff',
                border: `${element.borderWidth || 2}px solid #000`,
                borderRadius:
                  element.bubbleStyle === 'thought'
                    ? '50%'
                    : element.bubbleStyle === 'shout'
                    ? '4px'
                    : element.bubbleStyle === 'narration'
                    ? '2px'
                    : '16px',
                padding: '8px 12px',
                fontSize: `${element.fontSize || 14}px`,
                color: '#000',
                fontFamily: 'sans-serif',
                lineHeight: '1.4',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: element.bubbleStyle === 'shout' ? '3px 3px 0 #000' : 'none',
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={element.text || ''}
                  onChange={(e) =>
                    dispatch({
                      type: ACTIONS.UPDATE_ELEMENT,
                      payload: { elementId: element.id, updates: { text: e.target.value } },
                    })
                  }
                  onBlur={() => dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null })}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null });
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255,255,255,0.95)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: 'inherit',
                    color: '#000',
                    fontSize: 'inherit',
                    padding: '2px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              ) : (
                element.text || '双击编辑对话'
              )}
            </div>
            {/* 气泡尾巴 */}
            {element.bubbleStyle !== 'narration' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: element.bubbleStyle === 'thought' ? '-8px' : '-12px',
                  left: '20px',
                  width: 0,
                  height: 0,
                  borderLeft: element.bubbleStyle === 'thought' ? '6px solid transparent' : '10px solid transparent',
                  borderRight: element.bubbleStyle === 'thought' ? '6px solid transparent' : '10px solid transparent',
                  borderTop: element.bubbleStyle === 'thought' ? '8px solid #fff' : '12px solid #fff',
                }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{ position: 'absolute', left: 0, top: 0 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {renderElement()}
      {/* 选中边框 */}
      {isSelected && !isEditing && (
        <div
          style={{
            position: 'absolute',
            left: element.x - 2,
            top: element.y - 2,
            width: element.width + 4,
            height: element.height + 4,
            border: '2px solid var(--accent-primary)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {/* 四角控制点 */}
          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
        </div>
      )}
    </div>
  );
}

/** 中央画布区域 */
function CanvasArea({ state, dispatch }) {
  const canvasRef = useRef(null);

  // 获取当前页面
  const currentPage = state.pages[state.activePageIndex];
  if (!currentPage) return null;

  // 处理画布点击（取消选中）
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target === e.currentTarget) {
      dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: null });
      dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null });
    }
  };

  // 处理画布上的鼠标按下（添加新元素）
  const handleCanvasMouseDown = (e) => {
    if (state.activeTool === 'select') return;
    if (e.target !== canvasRef.current && e.target !== e.currentTarget) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = state.zoom;
    let x = (e.clientX - rect.left) / scale;
    let y = (e.clientY - rect.top) / scale;

    // 网格吸附
    if (state.snapToGrid) {
      const gridSize = 20;
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    let newElement = null;

    switch (state.activeTool) {
      case 'rect':
        newElement = {
          id: genId(),
          type: 'rect',
          x,
          y,
          width: 200,
          height: 150,
          fill: 'transparent',
          borderColor: '#000',
          borderWidth: 2,
          borderRadius: 0,
        };
        break;

      case 'circle':
        newElement = {
          id: genId(),
          type: 'circle',
          x,
          y,
          width: 120,
          height: 120,
          fill: 'transparent',
          borderColor: '#000',
          borderWidth: 2,
        };
        break;

      case 'text':
        newElement = {
          id: genId(),
          type: 'text',
          x,
          y,
          width: 200,
          height: 40,
          text: '双击编辑文字',
          fontSize: 14,
          color: '#000',
          fontWeight: 'normal',
          textAlign: 'left',
        };
        break;

      case 'bubble':
        newElement = {
          id: genId(),
          type: 'bubble',
          x,
          y,
          width: 180,
          height: 80,
          text: '双击编辑对话',
          bubbleStyle: 'speech',
          fontSize: 14,
          borderWidth: 2,
        };
        break;

      case 'image':
        newElement = {
          id: genId(),
          type: 'image',
          x,
          y,
          width: 200,
          height: 150,
          src: '',
        };
        break;

      default:
        break;
    }

    if (newElement) {
      dispatch({ type: ACTIONS.ADD_ELEMENT, payload: newElement });
      dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: newElement.id });
      // 添加元素后切回选择工具
      dispatch({ type: ACTIONS.SET_TOOL, payload: 'select' });
    }
  };

  // 处理滚轮缩放
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      dispatch({ type: ACTIONS.SET_ZOOM, payload: state.zoom + delta });
    }
  };

  // ============ 触摸事件：双指缩放 ============
  const pinchStateRef = useRef({
    isPinching: false,
    initialDistance: 0,
    initialZoom: 1,
  });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // 双指缩放开始
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      pinchStateRef.current = {
        isPinching: true,
        initialDistance: distance,
        initialZoom: state.zoom,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStateRef.current.isPinching) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / pinchStateRef.current.initialDistance;
      const newZoom = Math.max(0.25, Math.min(3, pinchStateRef.current.initialZoom * scale));

      dispatch({ type: ACTIONS.SET_ZOOM, payload: newZoom });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStateRef.current.isPinching = false;
    }
  };

  // 处理触摸添加元素（单指点击画布空白区域）
  const handleCanvasTouchStart = (e) => {
    if (state.activeTool === 'select') return;
    if (e.touches.length !== 1) return;
    if (e.target !== canvasRef.current && e.target !== e.currentTarget) return;

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = state.zoom;
    let x = (touch.clientX - rect.left) / scale;
    let y = (touch.clientY - rect.top) / scale;

    // 网格吸附
    if (state.snapToGrid) {
      const gridSize = 20;
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    let newElement = null;

    switch (state.activeTool) {
      case 'rect':
        newElement = {
          id: genId(),
          type: 'rect',
          x,
          y,
          width: 200,
          height: 150,
          fill: 'transparent',
          borderColor: '#000',
          borderWidth: 2,
          borderRadius: 0,
        };
        break;
      case 'circle':
        newElement = {
          id: genId(),
          type: 'circle',
          x,
          y,
          width: 120,
          height: 120,
          fill: 'transparent',
          borderColor: '#000',
          borderWidth: 2,
        };
        break;
      case 'text':
        newElement = {
          id: genId(),
          type: 'text',
          x,
          y,
          width: 200,
          height: 40,
          text: '双击编辑文字',
          fontSize: 14,
          color: '#000',
          fontWeight: 'normal',
          textAlign: 'left',
        };
        break;
      case 'bubble':
        newElement = {
          id: genId(),
          type: 'bubble',
          x,
          y,
          width: 180,
          height: 80,
          text: '双击编辑对话',
          bubbleStyle: 'speech',
          fontSize: 14,
          borderWidth: 2,
        };
        break;
      case 'image':
        newElement = {
          id: genId(),
          type: 'image',
          x,
          y,
          width: 200,
          height: 150,
          src: '',
        };
        break;
      default:
        break;
    }

    if (newElement) {
      dispatch({ type: ACTIONS.ADD_ELEMENT, payload: newElement });
      dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: newElement.id });
      dispatch({ type: ACTIONS.SET_TOOL, payload: 'select' });
    }
  };

  return (
    <div
      className="editor-canvas"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="editor-canvas-content"
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onTouchStart={handleCanvasTouchStart}
        style={{
          width: 600,
          minHeight: 800,
          transform: `scale(${state.zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
          backgroundImage: state.showGrid
            ? 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)'
            : 'none',
          backgroundSize: state.showGrid ? '20px 20px' : 'none',
        }}
      >
        {/* 渲染所有元素 */}
        {currentPage.elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={state.selectedElementId === element.id}
            isEditing={state.editingTextId === element.id}
            state={state}
            dispatch={dispatch}
            canvasRef={canvasRef}
          />
        ))}

        {/* 空状态提示 */}
        {currentPage.elements.length === 0 && (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: '800px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '0.9rem',
              pointerEvents: 'none',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Layers size={48} style={{ marginBottom: 'var(--spacing-md)', color: '#ccc' }} />
              <p>画布区域</p>
              <p style={{ fontSize: '0.8rem', color: '#bbb', marginTop: '4px' }}>
                使用右侧工具栏添加元素，或点击画布放置
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 右侧工具栏 */
function RightToolbar({ state, dispatch }) {
  // 获取当前选中元素
  const currentPage = state.pages[state.activePageIndex];
  const selectedElement = currentPage?.elements.find((el) => el.id === state.selectedElementId);

  // 工具列表
  const tools = [
    { id: 'select', icon: <MousePointer size={18} />, label: '选择' },
    { id: 'text', icon: <Type size={18} />, label: '文字' },
    { id: 'rect', icon: <Square size={18} />, label: '矩形' },
    { id: 'circle', icon: <Circle size={18} />, label: '圆形' },
    { id: 'bubble', icon: <MessageSquare size={18} />, label: '气泡' },
    { id: 'image', icon: <ImagePlus size={18} />, label: '图片' },
  ];

  // 气泡样式预设
  const bubblePresets = [
    { id: 'speech', label: '对话', desc: '圆角矩形气泡' },
    { id: 'thought', label: '思考', desc: '圆形气泡' },
    { id: 'shout', label: '呐喊', desc: '尖锐爆炸气泡' },
    { id: 'narration', label: '旁白', desc: '矩形文本框' },
  ];

  // 更新选中元素属性
  const updateSelectedElement = (updates) => {
    if (!selectedElement) return;
    dispatch({
      type: ACTIONS.UPDATE_ELEMENT,
      payload: { elementId: selectedElement.id, updates },
    });
  };

  return (
    <div className="editor-toolbar">
      {/* 工具选择 */}
      <div className="toolbar-section">
        <h4>工具</h4>
        <div className="toolbar-tools">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`tool-btn ${state.activeTool === tool.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: ACTIONS.SET_TOOL, payload: tool.id })}
              title={tool.label}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="section-divider" />

      {/* 气泡样式预设 */}
      <div className="toolbar-section">
        <h4>对话气泡</h4>
        <div className="toolbar-tools">
          {bubblePresets.map((preset) => (
            <button
              key={preset.id}
              className={`tool-btn ${selectedElement?.bubbleStyle === preset.id ? 'active' : ''}`}
              onClick={() => {
                if (selectedElement?.type === 'bubble') {
                  updateSelectedElement({ bubbleStyle: preset.id });
                } else {
                  // 创建新气泡
                  const newBubble = {
                    id: genId(),
                    type: 'bubble',
                    x: 100,
                    y: 100,
                    width: 180,
                    height: 80,
                    text: '双击编辑对话',
                    bubbleStyle: preset.id,
                    fontSize: 14,
                    borderWidth: 2,
                  };
                  dispatch({ type: ACTIONS.ADD_ELEMENT, payload: newBubble });
                  dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: newBubble.id });
                }
              }}
              title={preset.desc}
            >
              <MessageSquare size={18} />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="section-divider" />

      {/* 属性面板 - 仅在选中元素时显示 */}
      {selectedElement && (
        <>
          <div className="toolbar-section">
            <h4>属性</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {/* 位置 */}
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>X</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Y</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* 尺寸 */}
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>宽</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 50 })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>高</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.height)}
                    onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 50 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* 文本属性 */}
              {(selectedElement.type === 'text' || selectedElement.type === 'bubble') && (
                <>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>字号</label>
                    <input
                      type="number"
                      value={selectedElement.fontSize || 14}
                      min={8}
                      max={72}
                      onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 14 })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>颜色</label>
                    <input
                      type="color"
                      value={selectedElement.color || '#000000'}
                      onChange={(e) => updateSelectedElement({ color: e.target.value })}
                      style={{ ...inputStyle, padding: '2px', height: '28px', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}

              {/* 形状属性 */}
              {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
                <>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>填充色</label>
                    <input
                      type="color"
                      value={selectedElement.fill || '#ffffff'}
                      onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                      style={{ ...inputStyle, padding: '2px', height: '28px', cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>边框色</label>
                    <input
                      type="color"
                      value={selectedElement.borderColor || '#000000'}
                      onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                      style={{ ...inputStyle, padding: '2px', height: '28px', cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>边框宽度</label>
                    <input
                      type="number"
                      value={selectedElement.borderWidth || 2}
                      min={0}
                      max={20}
                      onChange={(e) => updateSelectedElement({ borderWidth: parseInt(e.target.value) || 2 })}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <hr className="section-divider" />

          {/* 元素操作 */}
          <div className="toolbar-section">
            <h4>操作</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ flex: 1, padding: '4px' }}
                  onClick={() => dispatch({ type: ACTIONS.BRING_FORWARD, payload: selectedElement.id })}
                  title="上移一层"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ flex: 1, padding: '4px' }}
                  onClick={() => dispatch({ type: ACTIONS.SEND_BACKWARD, payload: selectedElement.id })}
                  title="下移一层"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ flex: 1, padding: '4px' }}
                  onClick={() => dispatch({ type: ACTIONS.DUPLICATE_ELEMENT, payload: selectedElement.id })}
                  title="复制元素"
                >
                  <Copy size={14} />
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ flex: 1, padding: '4px', color: 'var(--accent-primary)' }}
                  onClick={() => {
                    dispatch({ type: ACTIONS.DELETE_ELEMENT, payload: selectedElement.id });
                    dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: null });
                  }}
                  title="删除元素"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          <hr className="section-divider" />
        </>
      )}

      {/* 图层列表 */}
      <div className="toolbar-section">
        <h4>图层 ({currentPage?.elements.length || 0})</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {currentPage?.elements.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-sm)' }}>
              暂无元素
            </div>
          ) : (
            [...(currentPage?.elements || [])].reverse().map((element, idx) => (
              <div
                key={element.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  background: state.selectedElementId === element.id ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                  border: state.selectedElementId === element.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  marginBottom: '2px',
                  color: state.selectedElementId === element.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                onClick={() => dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: element.id })}
              >
                <GripVertical size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                {element.type === 'rect' && <Square size={12} />}
                {element.type === 'circle' && <Circle size={12} />}
                {element.type === 'text' && <Type size={12} />}
                {element.type === 'bubble' && <MessageSquare size={12} />}
                {element.type === 'image' && <Image size={12} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {element.type === 'text' || element.type === 'bubble'
                    ? element.text?.slice(0, 10) || '空文本'
                    : element.type === 'rect'
                    ? '矩形'
                    : element.type === 'circle'
                    ? '圆形'
                    : '图片'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="section-divider" />

      {/* 画布设置 */}
      <div className="toolbar-section">
        <h4>画布设置</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={() => dispatch({ type: ACTIONS.TOGGLE_GRID })}
              style={{ cursor: 'pointer' }}
            />
            <Grid3X3 size={14} />
            显示网格
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={state.snapToGrid}
              onChange={() => dispatch({ type: ACTIONS.TOGGLE_SNAP })}
              style={{ cursor: 'pointer' }}
            />
            吸附网格
          </label>
        </div>
      </div>
    </div>
  );
}

/** 预览弹窗 */
function PreviewModal({ state, dispatch }) {
  const currentPage = state.pages[state.activePageIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={() => dispatch({ type: ACTIONS.SET_SHOW_PREVIEW, payload: false })}
    >
      <div
        style={{
          background: '#fff',
          width: 600,
          minHeight: 800,
          position: 'relative',
          boxShadow: '0 0 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 预览内容 - 渲染当前页面所有元素 */}
        {currentPage?.elements.map((element) => {
          const baseStyle = {
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
          };

          switch (element.type) {
            case 'rect':
              return (
                <div
                  key={element.id}
                  style={{
                    ...baseStyle,
                    backgroundColor: element.fill || 'transparent',
                    border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`,
                    borderRadius: element.borderRadius || 0,
                  }}
                />
              );
            case 'circle':
              return (
                <div
                  key={element.id}
                  style={{
                    ...baseStyle,
                    backgroundColor: element.fill || 'transparent',
                    border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`,
                    borderRadius: '50%',
                  }}
                />
              );
            case 'text':
              return (
                <div
                  key={element.id}
                  style={{
                    ...baseStyle,
                    color: element.color || '#000',
                    fontSize: `${element.fontSize || 14}px`,
                    fontWeight: element.fontWeight || 'normal',
                    padding: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {element.text || ''}
                </div>
              );
            case 'bubble':
              return (
                <div key={element.id} style={baseStyle}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#fff',
                      border: `${element.borderWidth || 2}px solid #000`,
                      borderRadius:
                        element.bubbleStyle === 'thought'
                          ? '50%'
                          : element.bubbleStyle === 'shout'
                          ? '4px'
                          : element.bubbleStyle === 'narration'
                          ? '2px'
                          : '16px',
                      padding: '8px 12px',
                      fontSize: `${element.fontSize || 14}px`,
                      color: '#000',
                      lineHeight: '1.4',
                      boxShadow: element.bubbleStyle === 'shout' ? '3px 3px 0 #000' : 'none',
                    }}
                  >
                    {element.text || ''}
                  </div>
                </div>
              );
            case 'image':
              return (
                <div
                  key={element.id}
                  style={{
                    ...baseStyle,
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: '0.7rem',
                  }}
                >
                  图片占位
                </div>
              );
            default:
              return null;
          }
        })}

        {(!currentPage || currentPage.elements.length === 0) && (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: '800px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ccc',
            }}
          >
            <p>暂无内容</p>
          </div>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={() => dispatch({ type: ACTIONS.SET_SHOW_PREVIEW, payload: false })}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
        }}
      >
        <X size={20} />
      </button>

      {/* 页面信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.85rem',
        }}
      >
        {state.projectName} - {currentPage?.label || '预览'}
      </div>
    </div>
  );
}

// ============ 输入框样式常量 ============

const inputStyle = {
  width: '100%',
  padding: '4px 8px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-family)',
  outline: 'none',
};

// ============ 主组件 ============

function EditorPage() {
  const { projectId } = useParams();
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: ACTIONS.UNDO });
      }
      // Ctrl+Y / Ctrl+Shift+Z 重做
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        dispatch({ type: ACTIONS.REDO });
      }
      // Ctrl+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // TODO: 实现保存逻辑
        console.log('[编辑器] 保存项目:', state.projectName);
      }
      // Delete 删除选中元素
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementId && !state.editingTextId) {
          dispatch({ type: ACTIONS.DELETE_ELEMENT, payload: state.selectedElementId });
          dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: null });
        }
      }
      // Escape 取消选中/编辑
      if (e.key === 'Escape') {
        dispatch({ type: ACTIONS.SELECT_ELEMENT, payload: null });
        dispatch({ type: ACTIONS.SET_EDITING_TEXT, payload: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId, state.editingTextId, state.projectName]);

  return (
    <div className="editor-layout">
      {/* 顶部工具栏 */}
      <TopBar state={state} dispatch={dispatch} />

      {/* 左侧页面列表 */}
      <PageListPanel state={state} dispatch={dispatch} />

      {/* 中央画布 */}
      <CanvasArea state={state} dispatch={dispatch} />

      {/* 右侧工具栏 */}
      <RightToolbar state={state} dispatch={dispatch} />

      {/* 预览弹窗 */}
      {state.showPreview && <PreviewModal state={state} dispatch={dispatch} />}
    </div>
  );
}

export default EditorPage;
