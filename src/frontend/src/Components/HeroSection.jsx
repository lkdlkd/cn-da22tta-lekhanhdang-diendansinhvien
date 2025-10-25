import React from 'react';

export default function HeroSection() {
  return (
    <section className="hero-section py-5 text-white" style={{background: 'linear-gradient(135deg, #4f46e5, #6366f1)'}}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <h1 className="display-4 fw-bold mb-3">Chào mừng đến với Diễn đàn sinh viên</h1>
            <p className="lead mb-4">Nơi chia sẻ kiến thức, kết nối bạn bè và phát triển bản thân trong môi trường học tập năng động.</p>
            <a href="/register" className="btn btn-light btn-lg fw-bold me-3">Đăng ký ngay</a>
            <a href="/categories" className="btn btn-outline-light btn-lg">Khám phá chuyên mục</a>
          </div>
          <div className="col-lg-4 d-none d-lg-block">
            <img src="/assets/img/hero-student.svg" alt="Sinh viên" className="img-fluid" />
          </div>
        </div>
      </div>
    </section>
  );
}
