import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Image, Film, Wand2, ArrowRight } from 'lucide-react';

function HomePage() {
  const features = [
    {
      icon: <Wand2 size={28} />,
      title: '文字转漫画',
      description: '输入故事文本，AI 自动生成精美的漫画分镜和画面',
      link: '/create',
    },
    {
      icon: <Image size={28} />,
      title: '图片转漫画',
      description: '上传照片或图片，一键转换为漫画/动漫风格',
      link: '/image-to-comic',
    },
    {
      icon: <BookOpen size={28} />,
      title: '漫画编辑器',
      description: '强大的在线编辑工具，添加对话气泡、特效和文字',
      link: '/projects',
    },
    {
      icon: <Film size={28} />,
      title: '视频漫剧',
      description: '将漫画页面转换为动态视频，添加转场和音效',
      link: '/projects',
    },
  ];

  return (
    <div className="page">
      {/* Hero Section */}
      <section className="hero">
        <h1>漫剧生成器</h1>
        <p>
          用 AI 的力量，将你的创意故事转化为精美的漫画和动态漫剧。
          无需绘画技巧，只需文字或图片，即可开始创作。
        </p>
        <div className="hero-actions">
          <Link to="/create" className="btn btn-primary btn-lg">
            <Wand2 size={20} />
            开始创作
          </Link>
          <Link to="/image-to-comic" className="btn btn-secondary btn-lg">
            <Image size={20} />
            图片转漫画
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section>
        <div className="features-grid">
          {features.map((feature, index) => (
            <Link
              to={feature.link}
              key={index}
              className="feature-card"
              style={{ textDecoration: 'none' }}
            >
              <div className="icon-wrapper">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ textAlign: 'center', padding: 'var(--spacing-2xl) 0' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
          准备好开始你的漫画之旅了吗？
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          从一个简单的想法开始，AI 将帮助你完成剩下的工作
        </p>
        <Link to="/create" className="btn btn-primary btn-lg">
          立即体验
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}

export default HomePage;
