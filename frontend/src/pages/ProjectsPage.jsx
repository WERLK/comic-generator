import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FolderOpen,
  Edit3,
  Film,
  Trash2,
  Calendar,
  MoreVertical,
} from 'lucide-react';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);

  // Simulate loading projects
  useEffect(() => {
    const mockProjects = [
      {
        id: '1',
        title: '星际冒险记',
        date: '2024-01-15',
        type: 'text-to-comic',
        pages: 8,
      },
      {
        id: '2',
        title: '校园日常',
        date: '2024-01-12',
        type: 'image-to-comic',
        pages: 4,
      },
      {
        id: '3',
        title: '武侠江湖',
        date: '2024-01-10',
        type: 'text-to-comic',
        pages: 12,
      },
      {
        id: '4',
        title: '科幻未来',
        date: '2024-01-08',
        type: 'text-to-comic',
        pages: 6,
      },
      {
        id: '5',
        title: '美食之旅',
        date: '2024-01-05',
        type: 'image-to-comic',
        pages: 4,
      },
      {
        id: '6',
        title: '奇幻森林',
        date: '2024-01-03',
        type: 'text-to-comic',
        pages: 10,
      },
    ];
    setProjects(mockProjects);
  }, []);

  const handleDelete = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="projects-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            我的项目
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            共 {projects.length} 个项目
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to="/create" className="btn btn-primary">
            <Plus size={18} />
            新建项目
          </Link>
          <Link to="/image-to-comic" className="btn btn-secondary">
            图片转漫画
          </Link>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-card-thumbnail">
                <FolderOpen size={32} />
              </div>
              <div className="project-card-info">
                <div className="project-card-title">{project.title}</div>
                <div className="project-card-date">
                  <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {project.date}
                  <span style={{ marginLeft: 'var(--spacing-sm)' }}>
                    {project.pages} 页
                  </span>
                </div>
                <div className="project-card-actions">
                  <Link to={`/editor/${project.id}`} className="btn btn-sm btn-primary">
                    <Edit3 size={14} />
                    编辑
                  </Link>
                  <Link to={`/video/${project.id}`} className="btn btn-sm btn-secondary">
                    <Film size={14} />
                    视频
                  </Link>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FolderOpen size={64} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--spacing-md)' }}>还没有任何项目</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            创建你的第一个漫画项目，开始你的创作之旅
          </p>
          <Link to="/create" className="btn btn-primary btn-lg">
            <Plus size={20} />
            创建第一个项目
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
