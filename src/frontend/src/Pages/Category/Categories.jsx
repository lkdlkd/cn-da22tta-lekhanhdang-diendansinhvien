import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../../Utils/api';

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
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Đang tải chuyên mục...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4" style={{ 
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <h4 className="mb-2 d-flex align-items-center" style={{ fontWeight: 700 }}>
            <i className="ph-duotone ph-folders me-2" style={{ fontSize: '32px' }}></i>
            Tất cả chuyên mục
          </h4>
          <p className="mb-0" style={{ opacity: 0.95, fontSize: '14px' }}>
            Khám phá các chủ đề thảo luận đa dạng
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="row g-4">
        {categories.map((category) => (
          <div key={category._id} className="col-md-6 col-lg-4">
            <div 
              className="card border-0 shadow-sm h-100"
              style={{ 
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
              }}
              onClick={() => navigate(`/category/${category.slug}`)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
              }}
            >
              <div 
                className="card-header border-0"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '20px'
                }}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <i className="ph-duotone ph-folder-notch-open" style={{ 
                      fontSize: '24px',
                      color: 'white'
                    }}></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1" style={{ 
                      fontWeight: 700,
                      color: 'white',
                      fontSize: '16px'
                    }}>
                      {category.title}
                    </h6>
                    <small style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
                      {category.slug}
                    </small>
                  </div>
                </div>
              </div>
              
              <div className="card-body" style={{ padding: '20px' }}>
                {category.description ? (
                  <p className="text-muted mb-3" style={{ 
                    fontSize: '13px',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {category.description}
                  </p>
                ) : (
                  <p className="text-muted mb-3" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                    Chưa có mô tả
                  </p>
                )}
                
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex gap-3">
                    <div className="d-flex align-items-center">
                      <i className="ph ph-file-text text-primary me-1" style={{ fontSize: '16px' }}></i>
                      <small className="text-muted" style={{ fontSize: '12px' }}>
                        <strong>{category.count || 0}</strong> bài viết
                      </small>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    style={{ 
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 12px'
                    }}
                  >
                    Xem <i className="ph ph-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body text-center py-5">
            <i className="ph-duotone ph-folders" style={{ 
              fontSize: '64px', 
              color: '#ccc',
              marginBottom: '16px'
            }}></i>
            <h5 className="text-muted">Chưa có chuyên mục nào</h5>
          </div>
        </div>
      )}
    </div>
  );
}
