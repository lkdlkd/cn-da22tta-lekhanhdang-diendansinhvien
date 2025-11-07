import React, { useEffect, useState } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import { getDocumentCategories, getDocuments } from '../../Utils/api';
import { useNavigate,Link } from 'react-router-dom';
import { toast } from 'react-toastify';
const CATEGORY_LABELS = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  ppt: 'PowerPoint',
  text: 'Text',
  image: 'Ảnh',
  video: 'Video',
  audio: 'Audio',
  archive: 'Lưu trữ',
  other: 'Khác'
};

const Documents = () => {
  const [categories, setCategories] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const [pendingFilters, setPendingFilters] = useState({ keyword: '', category: '' });
  const [appliedFilters, setAppliedFilters] = useState({ keyword: '', category: '' });
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | name | size

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, appliedFilters, token]);

  const fetchCategories = async () => {
    try {
      const res = await getDocumentCategories(token);
      if (res.success) {
        setCategories(res.categories || []);
        setTotalDocs(res.total || 0);
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi tải danh mục tài liệu');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await getDocuments(token, { page: pagination.page, limit: pagination.limit, keyword: appliedFilters.keyword, category: appliedFilters.category });
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setDocs(applySorting(list, sortBy));
        setPagination(prev => ({ ...prev, total: res.pagination?.total || 0, pages: res.pagination?.pages || 0 }));
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setPendingFilters({ keyword: '', category: '' });
    setAppliedFilters({ keyword: '', category: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Helpers
  const handlePageChange = (p) => {
    setPagination(prev => ({ ...prev, page: p }));
  };

  const renderPageNumbers = () => {
    const items = [];
    const total = pagination.pages || 0;
    const current = pagination.page || 1;

    const add = (p) => items.push(
      <Pagination.Item key={p} active={p === current} onClick={() => handlePageChange(p)}>
        {p}
      </Pagination.Item>
    );

    if (total <= 7) {
      for (let p = 1; p <= total; p++) add(p);
    } else {
      add(1);
      if (current > 3) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let p = start; p <= end; p++) add(p);
      if (current < total - 2) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      add(total);
    }
    return items;
  };
  const getCategoryFromDoc = (d) => {
    const mime = (d.mime || '').toLowerCase();
    const name = (d.filename || '').toLowerCase();
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) return 'image';
    if (mime.startsWith('video/') || /\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i.test(name)) return 'video';
    if (mime.startsWith('audio/') || /\.(mp3|wav|flac|aac|ogg|wma|m4a)$/i.test(name)) return 'audio';
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (mime.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'excel';
    if (mime.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
    if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
    if (mime.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return 'archive';
    return 'other';
  };

  const getIconByCategory = (cat) => {
    switch (cat) {
      case 'pdf': return 'ph-file-pdf text-danger';
      case 'word': return 'ph-file-doc text-primary';
      case 'excel': return 'ph-file-xls text-success';
      case 'ppt': return 'ph-file-ppt text-warning';
      case 'text': return 'ph-file-text text-secondary';
      case 'image': return 'ph-image text-info';
      case 'video': return 'ph-video text-purple';
      case 'audio': return 'ph-music-note text-pink';
      case 'archive': return 'ph-file-zip text-muted';
      default: return 'ph-file text-secondary';
    }
  };

  const applySorting = (list, mode) => {
    const arr = [...list];
    switch (mode) {
      case 'oldest':
        return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name':
        return arr.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
      case 'size':
        return arr.sort((a, b) => (a.size || 0) - (b.size || 0));
      case 'newest':
      default:
        return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  // Resort when sortBy changes
  useEffect(() => {
    if (docs && docs.length > 0) {
      setDocs(prev => applySorting(prev, sortBy));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  if (!token) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <div>Bạn cần đăng nhập để truy cập Thư viện tài liệu.</div>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Đăng nhập</button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <h2 className="mb-3">
        <i className="ph-folder-open me-2"></i>
        Thư viện tài liệu
      </h2>

      {/* Category summary */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <strong>Tổng tài liệu: {totalDocs}</strong>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Sắp xếp:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="name">Tên (A-Z)</option>
                  <option value="size">Kích thước (tăng)</option>
                </select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Kích thước trang:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value, 10);
                    setPagination(prev => ({ ...prev, page: 1, limit: newLimit }));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {categories.map(c => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={c.key}>
                <button
                  className={`btn w-100 ${appliedFilters.category === c.key ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setPendingFilters(prev => ({ ...prev, category: c.key }));
                    setAppliedFilters(prev => ({ ...prev, category: c.key }));
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <div className="d-flex flex-column align-items-center">
                    <div className="fw-bold">{CATEGORY_LABELS[c.key] || c.label}</div>
                    <small>{c.count} tài liệu</small>
                  </div>
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="col-12 text-muted">Không có danh mục nào</div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Tìm theo tên tệp</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập từ khóa..."
                value={pendingFilters.keyword}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Danh mục</label>
              <select
                className="form-select"
                value={pendingFilters.category}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="ppt">PowerPoint</option>
                <option value="text">Text</option>
                <option value="image">Ảnh</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="archive">Lưu trữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={applyFilters}>
                <i className="ph-magnifying-glass me-1"></i>Tìm kiếm
              </button>
              <button className="btn btn-outline-secondary" onClick={resetFilters}>
                <i className="ph-arrow-counter-clockwise me-1"></i>Đặt lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center text-muted py-5">Không có tài liệu</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Tên tệp</th>
                    <th>Loại</th>
                    <th>Kích thước</th>
                    <th>Chủ sở hữu</th>
                    <th>Ngày tải lên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: 420 }} title={d.filename}>
                          <i className={`${getIconByCategory(getCategoryFromDoc(d))}`} style={{ fontSize: 18 }}></i>
                          <span className="text-truncate">{d.filename}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark">{CATEGORY_LABELS[getCategoryFromDoc(d)] || 'Khác'}</span>
                      </td>
                      <td>
                        <small>{typeof d.size === 'number' ? `${(d.size / 1024).toFixed(1)} KB` : '-'}</small>
                      </td>
                      <td>
                        <Link to={`/user/${d.ownerId?.username || ''}`} className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: 150 }} title={d.ownerId?.displayName || d.ownerId?.username || '-'}>
                          <div className="d-flex align-items-center">
                            <img src={d.ownerId?.avatarUrl || 'https://via.placeholder.com/28'} alt="avatar" className="rounded-circle me-2" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                            <small>{d.ownerId?.displayName || d.ownerId?.username || '-'}</small>
                          </div>
                        </Link>

                      </td>
                      <td><small>{new Date(d.createdAt).toLocaleString('vi-VN')}</small></td>
                      <td>
                        <div className="btn-group">
                          <a className="btn btn-sm btn-outline-primary" href={d.storageUrl} target="_blank" rel="noreferrer">
                            <i className="ph-arrow-square-out me-1"></i>Mở
                          </a>
                          <a className="btn btn-sm btn-outline-secondary" href={d.storageUrl} download>
                            <i className="ph-download-simple me-1"></i>Tải xuống
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && docs.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span>Hiển thị {docs.length} / {pagination.total}</span>
              <Pagination className="mb-0">
                <Pagination.First disabled={pagination.page === 1} onClick={() => handlePageChange(1)} />
                <Pagination.Prev disabled={pagination.page === 1} onClick={() => handlePageChange(Math.max(1, pagination.page - 1))} />
                {renderPageNumbers()}
                <Pagination.Next disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(Math.min(pagination.pages || 1, pagination.page + 1))} />
                <Pagination.Last disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.pages || 1)} />
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;
