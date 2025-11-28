import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroSection() {

  // Trigger post create modal
  const handleCreatePost = () => {
    // This will be handled by PostCreate component's internal state
    // We can trigger it by programmatically clicking the PostCreate button
    document.querySelector('[data-create-post-trigger]')?.click();
  };
  return (
    <section
      className="hero-section text-white"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        zIndex: 0
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="row align-items-center p-3">
          <div className="col-lg-8">
            <h1 className="display-4 fw-bold mb-3" style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              Chào mừng đến với Diễn đàn Sinh viên TVU
            </h1>
            <p className="lead mb-4" style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              opacity: 0.95
            }}>
              Nơi chia sẻ kiến thức, kết nối bạn bè và phát triển bản thân trong môi trường học tập năng động.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <button
                className="btn btn-light btn-lg fw-bold "
                onClick={handleCreatePost}
                style={{
                  borderRadius: '12px',
                  padding: '12px 32px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className="ph-duotone ph-plus-circle me-2"></i>
                Tạo bài viết
              </button>
              <Link
                to="/forum"
                className="btn btn-outline-light btn-lg"
                style={{
                  borderRadius: '12px',
                  padding: '12px 32px',
                  borderWidth: '2px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <i className="bi bi-compass me-2"></i>
                Phòng Chat
              </Link>
            </div>

            {/* Stats */}
            <div className="row mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div className="col-4">
                <div className="text-center">
                  <h3 className="fw-bold mb-0">1000+</h3>
                  <small style={{ opacity: 0.8 }}>Thành viên</small>
                </div>
              </div>
              <div className="col-4">
                <div className="text-center">
                  <h3 className="fw-bold mb-0">500+</h3>
                  <small style={{ opacity: 0.8 }}>Bài viết</small>
                </div>
              </div>
              <div className="col-4">
                <div className="text-center">
                  <h3 className="fw-bold mb-0">50+</h3>
                  <small style={{ opacity: 0.8 }}>Chuyên mục</small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 d-none d-lg-block">
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '30px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div className="text-center">
                <i className="ph-duotone ph-student" style={{ fontSize: '120px', opacity: 0.9 }}></i>
                <h5 className="mt-3 mb-2 fw-bold">Cộng đồng sinh viên TVU</h5>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Nơi kết nối và chia sẻ kiến thức
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
