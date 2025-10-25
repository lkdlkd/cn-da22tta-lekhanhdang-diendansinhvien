import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-dark text-light mt-5 py-4">
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <h5>Diễn đàn sinh viên</h5>
            <p>Chia sẻ kiến thức, kết nối sinh viên, phát triển cộng đồng học tập.</p>
          </div>
          <div className="col-md-3">
            <h6>Liên hệ</h6>
            <ul className="list-unstyled">
              <li>Email: support@studentforum.edu.vn</li>
              <li>Hotline: 0123 456 789</li>
            </ul>
          </div>
          <div className="col-md-3">
            <h6>Kết nối</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-light">Facebook</a></li>
              <li><a href="#" className="text-light">Zalo</a></li>
              <li><a href="#" className="text-light">Email</a></li>
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <div className="text-center">
          <small>&copy; 2024 Diễn đàn sinh viên. Tất cả quyền được bảo lưu.</small>
        </div>
      </div>
    </footer>
  );
}
