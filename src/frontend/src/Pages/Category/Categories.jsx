import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../../Utils/api';
import LoadingPost from '@/Components/LoadingPost';
import '../../assets/css/Categories.css';

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingPost />
    );
  }

  return (
    <div className="categories-container">
      {/* Header */}
      <div className="card categories-header">
        <div className="card-body categories-header-body">
          <h4 className="categories-header-title">
            <i className="bi bi-folder2-open categories-header-icon"></i>
            Tất cả chuyên mục
          </h4>
          <p className="categories-header-description">
            Khám phá các chủ đề thảo luận đa dạng
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="row g-4">
        {categories.map((category) => (
          <div key={category._id} className="col-md-6 col-lg-4">
            <div 
              className="card categories-card h-100"
              onClick={() => navigate(`/category/${category.slug}`)}
            >
              <div className="card-header categories-card-header">
                <div className="d-flex align-items-center">
                  <div className="categories-card-icon-wrapper">
                    <i className="bi bi-folder2-open categories-card-icon"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="categories-card-title">
                      {category.title}
                    </h6>
                    <small className="categories-card-slug">
                      {category.slug}
                    </small>
                  </div>
                </div>
              </div>
              
              <div className="card-body categories-card-body">
                {category.description ? (
                  <p className="text-muted categories-card-description">
                    {category.description}
                  </p>
                ) : (
                  <p className="text-muted categories-card-description-empty">
                    Chưa có mô tả
                  </p>
                )}
                
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex gap-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-file-text text-primary categories-card-stat-icon"></i>
                      <small className="text-muted categories-card-stat-text">
                        <strong>{category.postCount || 0}</strong> bài viết
                      </small>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-sm btn-outline-primary categories-card-view-btn"
                  >
                    Xem <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="card categories-empty-card">
          <div className="card-body categories-empty-body">
            <i className="bi bi-folder2-open categories-empty-icon"></i>
            <h5 className="text-muted">Chưa có chuyên mục nào</h5>
          </div>
        </div>
      )}
    </div>
  );
}
