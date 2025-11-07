import React, { useState, useEffect } from 'react';
import { getMyReports, cancelReport } from '../../Utils/api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import LoadingPost from '@/Components/LoadingPost';

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filterStatus, setFilterStatus] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchReports();
  }, [pagination.page, filterStatus]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const result = await getMyReports(token, pagination.page, pagination.limit, filterStatus);
      if (result.success) {
        setReports(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          pages: result.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Lỗi khi tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReport = async (reportId) => {
    try {
      const result = await Swal.fire({
        title: 'Hủy báo cáo?',
        text: 'Bạn có chắc muốn hủy báo cáo này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Hủy báo cáo',
        cancelButtonText: 'Không',
        confirmButtonColor: '#dc3545'
      });

      if (result.isConfirmed) {
        const response = await cancelReport(token, reportId);
        if (response.success) {
          toast.success(response.message);
          fetchReports();
        } else {
          toast.error(response.error);
        }
      }
    } catch (error) {
      console.error('Error canceling report:', error);
      toast.error('Lỗi khi hủy báo cáo');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { text: 'Chờ xử lý', className: 'badge bg-warning' },
      reviewed: { text: 'Đang xem xét', className: 'badge bg-info' },
      closed: { text: 'Đã đóng', className: 'badge bg-success' }
    };
    return badges[status] || { text: status, className: 'badge bg-secondary' };
  };

  const getTargetTypeText = (type) => {
    const types = {
      post: '📄 Bài viết',
      comment: '💬 Bình luận',
      user: '👤 User'
    };
    return types[type] || type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="ph-warning-circle me-2"></i>
                  Báo cáo của tôi
                </h4>
                <select 
                  className="form-select w-auto"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="open">Chờ xử lý</option>
                  <option value="reviewed">Đang xem xét</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>
            </div>

            <div className="card-body">
              {loading ? (
                <LoadingPost  count={5} />
              ) : reports.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="ph-warning-circle" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">Bạn chưa có báo cáo nào</p>
                </div>
              ) : (
                <>
                  <div className="list-group">
                    {reports.map(report => (
                      <div key={report._id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="fw-bold">{getTargetTypeText(report.targetType)}</span>
                              <span className={getStatusBadge(report.status).className}>
                                {getStatusBadge(report.status).text}
                              </span>
                            </div>

                            {/* Target Info */}
                            {report.targetInfo ? (
                              <div className="mb-2 p-2 bg-light rounded">
                                {report.targetType === 'post' && (
                                  <small className="text-muted">
                                    <strong>Bài viết:</strong> {report.targetInfo.title}
                                  </small>
                                )}
                                {report.targetType === 'comment' && (
                                  <small className="text-muted">
                                    <strong>Bình luận:</strong> {report.targetInfo.content?.substring(0, 100)}...
                                  </small>
                                )}
                                {report.targetType === 'user' && (
                                  <small className="text-muted">
                                    <strong>User:</strong> {report.targetInfo.displayName || report.targetInfo.username}
                                  </small>
                                )}
                              </div>
                            ) : (
                              <div className="mb-2 p-2 bg-light rounded">
                                <small className="text-danger">Nội dung đã bị xóa</small>
                              </div>
                            )}

                            {/* Reason */}
                            <div className="mb-2">
                              <strong className="text-muted small">Lý do:</strong>
                              <p className="mb-0 small">{report.reason}</p>
                            </div>

                            {/* Date */}
                            <small className="text-muted">
                              <i className="ph-clock me-1"></i>
                              {formatDate(report.createdAt)}
                            </small>
                          </div>

                          {/* Actions */}
                          <div>
                            {report.status === 'open' && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancelReport(report._id)}
                              >
                                <i className="ph-x me-1"></i>
                                Hủy báo cáo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Handler Info */}
                        {report.handledBy && (
                          <div className="mt-2 pt-2 border-top">
                            <small className="text-muted">
                              <i className="ph-user-check me-1"></i>
                              Xử lý bởi: <strong>{report.handledBy.displayName || report.handledBy.username}</strong>
                            </small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted">
                        Trang {pagination.page} / {pagination.pages} (Tổng: {pagination.total} báo cáo)
                      </div>
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={pagination.page === 1}
                            >
                              Trước
                            </button>
                          </li>
                          {[...Array(pagination.pages)].map((_, i) => (
                            <li 
                              key={i} 
                              className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}
                            >
                              <button 
                                className="page-link"
                                onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                              >
                                {i + 1}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={pagination.page === pagination.pages}
                            >
                              Sau
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyReports;
