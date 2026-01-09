import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getForumStats } from '../Utils/api';
import '../assets/css/HeroSection.css';

export default function HeroSection() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalCategories: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getForumStats();
        if (response.success) {
          setStats(response.stats);
        }
      } catch (error) {
        console.error('Error fetching forum stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleCreatePost = () => {
    document.querySelector('[data-create-post-trigger]')?.click();
  };

  return (
    <section className="hero-section">
      {/* Decorative circles */}
      <div className="hero-decorative-circle-1" />
      <div className="hero-decorative-circle-2" />

      <div className="container hero-content">
        <div className="row align-items-center py-4">
          <div className="col-lg-8">
            <h1 className="hero-title mb-3">
              <span className="hero-title-line1 d-block text-uppercase  mb-2">
                Chào mừng đến với
              </span>
              <span className="hero-title-main d-block text-primary fw-bold">
                Diễn đàn Sinh viên TVU
              </span>
            </h1>
            
            <p className="hero-subtitle text-muted mb-4">
              Nơi chia sẻ kiến thức, kết nối bạn bè và phát triển bản thân trong môi trường học tập năng động.
            </p>
            
            <div className="hero-actions d-flex flex-wrap gap-2 mb-4">
              <button
                className="btn btn-primary hero-btn hero-btn-primary px-4 py-2"
                onClick={handleCreatePost}
              >
                <i className="bi bi-plus-circle-fill me-2"></i>
                Tạo bài viết
              </button>
              <Link
                to="/forum"
                className="btn btn-outline-primary hero-btn hero-btn-secondary px-4 py-2"
              >
                <i className="bi bi-chat-dots-fill me-2"></i>
                Phòng Chat
              </Link>
            </div>

            {/* Stats */}
            <div className="hero-stats row g-3 mt-4 pt-4 border-top">
              <div className="col-4">
                <div className="hero-stat-item text-center p-3 bg-light border rounded">
                  <span className="hero-stat-number d-block fs-3 fw-bold text-primary mb-1">
                    {stats.totalUsers?.toLocaleString() || 0}+
                  </span>
                  <span className="hero-stat-label d-block small text-muted text-uppercase fw-semibold">
                    Thành viên
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="hero-stat-item text-center p-3 bg-light border rounded">
                  <span className="hero-stat-number d-block fs-3 fw-bold text-primary mb-1">
                    {stats.totalPosts?.toLocaleString() || 0}+
                  </span>
                  <span className="hero-stat-label d-block small text-muted text-uppercase fw-semibold">
                    Bài viết
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="hero-stat-item text-center p-3 bg-light border rounded">
                  <span className="hero-stat-number d-block fs-3 fw-bold text-primary mb-1">
                    {stats.totalCategories?.toLocaleString() || 0}+
                  </span>
                  <span className="hero-stat-label d-block small text-muted text-uppercase fw-semibold">
                    Chuyên mục
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 d-none d-lg-block">
            <div className="hero-side-card bg-light border rounded-4 p-4 text-center">
              <i className="bi bi-mortarboard-fill hero-side-icon text-primary d-block mb-3"></i>
              <h5 className="hero-side-title fw-bold mb-2">Cộng đồng sinh viên TVU</h5>
              <p className="hero-side-description text-muted mb-0 small">
                Nơi kết nối và chia sẻ kiến thức
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
