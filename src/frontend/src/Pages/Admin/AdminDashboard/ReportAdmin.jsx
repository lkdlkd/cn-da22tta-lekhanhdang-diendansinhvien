import React, { useState, useEffect } from 'react';
import { 
  getAllReportsAdmin, 
  getReportsStatsAdmin, 
  updateReportStatusAdmin, 
  deleteReportAdmin, 
  deleteMultipleReportsAdmin,
  bulkHandleReportsAdmin,
  getReportsByTargetAdmin 
} from '../../../Utils/api';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import LoadingPost from '@/Components/LoadingPost';

const ReportAdmin = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  // Filters (fetch-on-submit pattern)
  const defaultFilters = {
    status: '',
    targetType: '',
    keyword: '',
    sortBy: 'createdAt',
    order: 'desc'
  };
  const [pendingFilters, setPendingFilters] = useState({
    status: '',
    targetType: '',
    keyword: '',
    sortBy: 'createdAt',
    order: 'desc'
  });
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  // Selected reports for bulk actions
  const [selectedReports, setSelectedReports] = useState([]);
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTargetReportsModal, setShowTargetReportsModal] = useState(false);
  const [targetReports, setTargetReports] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchReports();
    // stats don't depend on filters/pagination; fetch once on mount and after actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, appliedFilters]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
  const result = await getAllReportsAdmin(token, pagination.page, pagination.limit, appliedFilters);
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

  const fetchStats = async () => {
    try {
      const result = await getReportsStatsAdmin(token);
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSelectedReports([]);
  };

  const resetFilters = () => {
    setPendingFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSelectedReports([]);
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => {
      if (prev.includes(reportId)) {
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r._id));
    }
  };

  const handleViewDetail = async (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleViewTargetReports = async (targetType, targetId) => {
    try {
      const result = await getReportsByTargetAdmin(token, targetType, targetId);
      if (result.success) {
        setTargetReports(result.reports);
        setShowTargetReportsModal(true);
      }
    } catch (error) {
      toast.error('Lỗi khi tải báo cáo');
    }
  };

  const handleUpdateStatus = async (reportId, status, action = null) => {
    try {
      const result = await Swal.fire({
        title: 'Xác nhận',
        text: `Cập nhật trạng thái thành "${status}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
      });

      if (result.isConfirmed) {
        const response = await updateReportStatusAdmin(token, reportId, status, action);
        if (response.success) {
          toast.success(response.message);
          fetchReports();
          fetchStats();
          setShowDetailModal(false);
        } else {
          toast.error(response.error);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const result = await Swal.fire({
        title: 'Xác nhận xóa',
        text: 'Bạn có chắc muốn xóa báo cáo này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#dc3545'
      });

      if (result.isConfirmed) {
        const response = await deleteReportAdmin(token, reportId);
        if (response.success) {
          toast.success(response.message);
          fetchReports();
          fetchStats();
          setShowDetailModal(false);
        } else {
          toast.error(response.error);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi xóa báo cáo');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) {
      toast.warning('Vui lòng chọn báo cáo cần xóa');
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Xác nhận xóa',
        text: `Bạn có chắc muốn xóa ${selectedReports.length} báo cáo?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#dc3545'
      });

      if (result.isConfirmed) {
        const response = await deleteMultipleReportsAdmin(token, selectedReports);
        if (response.success) {
          toast.success(response.message);
          setSelectedReports([]);
          fetchReports();
          fetchStats();
        } else {
          toast.error(response.error);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi xóa báo cáo');
    }
  };

  const handleBulkHandle = async (status, action = null) => {
    if (selectedReports.length === 0) {
      toast.warning('Vui lòng chọn báo cáo cần xử lý');
      return;
    }

    try {
      const actionText = action ? ` và ${action === 'delete_content' ? 'xóa nội dung' : action === 'ban_user' ? 'ban user' : 'cảnh báo user'}` : '';
      const result = await Swal.fire({
        title: 'Xác nhận',
        text: `Cập nhật ${selectedReports.length} báo cáo thành "${status}"${actionText}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
      });

      if (result.isConfirmed) {
        const response = await bulkHandleReportsAdmin(token, selectedReports, status, action);
        if (response.success) {
          toast.success(response.message);
          setSelectedReports([]);
          fetchReports();
          fetchStats();
        } else {
          toast.error(response.error);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi xử lý báo cáo');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: 'badge bg-warning',
      reviewed: 'badge bg-info',
      closed: 'badge bg-success'
    };
    return badges[status] || 'badge bg-secondary';
  };

  const getTargetTypeBadge = (type) => {
    const badges = {
      post: 'badge bg-primary',
      comment: 'badge bg-info',
      user: 'badge bg-danger'
    };
    return badges[type] || 'badge bg-secondary';
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
      <h2 className="mb-4">
        <i className="ph-warning-circle me-2"></i>
        Quản lý Báo cáo
      </h2>

      {/* Statistics Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-white bg-primary">
              <div className="card-body">
                <h5 className="card-title">Tổng báo cáo</h5>
                <h2>{stats.totalReports}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning">
              <div className="card-body">
                <h5 className="card-title">Chờ xử lý</h5>
                <h2>{stats.byStatus.open}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info">
              <div className="card-body">
                <h5 className="card-title">Đang xem xét</h5>
                <h2>{stats.byStatus.reviewed}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success">
              <div className="card-body">
                <h5 className="card-title">Đã đóng</h5>
                <h2>{stats.byStatus.closed}</h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Trạng thái</label>
              <select 
                className="form-select" 
                value={pendingFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="open">Chờ xử lý</option>
                <option value="reviewed">Đang xem xét</option>
                <option value="closed">Đã đóng</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Loại đối tượng</label>
              <select 
                className="form-select" 
                value={pendingFilters.targetType}
                onChange={(e) => handleFilterChange('targetType', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="post">Bài viết</option>
                <option value="comment">Bình luận</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tìm kiếm</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm theo nội dung..."
                value={pendingFilters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Sắp xếp theo</label>
              <div className="d-flex gap-2">
                <select 
                  className="form-select"
                  value={pendingFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="createdAt">Thời gian tạo</option>
                  <option value="status">Trạng thái</option>
                  <option value="targetType">Loại đối tượng</option>
                </select>
                <select 
                  className="form-select" 
                  value={pendingFilters.order}
                  onChange={(e) => handleFilterChange('order', e.target.value)}
                >
                  <option value="desc">Giảm dần</option>
                  <option value="asc">Tăng dần</option>
                </select>
              </div>
            </div>
            <div className="col-md-12 d-flex gap-2 mt-2">
              <button className="btn btn-primary" onClick={applyFilters}>
                <i className="ph-magnifying-glass me-1"></i>
                Tìm kiếm
              </button>
              <button className="btn btn-outline-secondary" onClick={resetFilters}>
                <i className="ph-arrow-counter-clockwise me-1"></i>
                Đặt lại
              </button>
              <button className="btn btn-outline-primary" onClick={fetchReports}>
                <i className="ph-arrow-clockwise me-1"></i>
                Tải lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Applied filters summary */}
      <div className="mb-2">
        {appliedFilters.status && (
          <span className="badge bg-light text-dark me-2">Trạng thái: {appliedFilters.status}</span>
        )}
        {appliedFilters.targetType && (
          <span className="badge bg-light text-dark me-2">Loại: {appliedFilters.targetType}</span>
        )}
        {appliedFilters.keyword && (
          <span className="badge bg-light text-dark me-2">Từ khóa: "{appliedFilters.keyword}"</span>
        )}
        {(appliedFilters.sortBy || appliedFilters.order) && (
          <span className="badge bg-light text-dark me-2">
            Sắp xếp: {appliedFilters.sortBy === 'createdAt' ? 'Thời gian' : appliedFilters.sortBy === 'status' ? 'Trạng thái' : 'Loại'} {appliedFilters.order === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <div className="card mb-3 border-primary">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between">
              <span>Đã chọn {selectedReports.length} báo cáo</span>
              <div className="btn-group">
                <button 
                  className="btn btn-sm btn-info"
                  onClick={() => handleBulkHandle('reviewed')}
                >
                  <i className="ph-eye me-1"></i>
                  Đánh dấu xem xét
                </button>
                <button 
                  className="btn btn-sm btn-success"
                  onClick={() => handleBulkHandle('closed')}
                >
                  <i className="ph-check-circle me-1"></i>
                  Đóng
                </button>
                <button 
                  className="btn btn-sm btn-warning"
                  onClick={() => handleBulkHandle('closed', 'delete_content')}
                >
                  <i className="ph-trash me-1"></i>
                  Xóa nội dung
                </button>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleBulkHandle('closed', 'ban_user')}
                >
                  <i className="ph-prohibit me-1"></i>
                  Ban user
                </button>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={handleBulkDelete}
                >
                  <i className="ph-trash me-1"></i>
                  Xóa báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <LoadingPost count={5} />
          ) : reports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ph-warning-circle" style={{ fontSize: '3rem' }}></i>
              <p className="mt-2">Không có báo cáo nào</p>
              <button className="btn btn-outline-secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox" 
                          className="form-check-input"
                          checked={selectedReports.length === reports.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Người báo cáo</th>
                      <th>Loại</th>
                      <th>Đối tượng</th>
                      <th>Lý do</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report._id}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input"
                            checked={selectedReports.includes(report._id)}
                            onChange={() => handleSelectReport(report._id)}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={report.reporterId?.avatarUrl || 'https://via.placeholder.com/40'} 
                              alt="avatar"
                              className="rounded-circle me-2"
                              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                            />
                            <div>
                              <div>{report.reporterId?.displayName || report.reporterId?.username}</div>
                              <small className="text-muted">{report.reporterId?.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={getTargetTypeBadge(report.targetType)}>
                            {report.targetType === 'post' ? 'Bài viết' : 
                             report.targetType === 'comment' ? 'Bình luận' : 'User'}
                          </span>
                        </td>
                        <td>
                          {report.targetInfo ? (
                            <div>
                              {report.targetType === 'post' && (
                                <small className="text-truncate d-block" style={{ maxWidth: '200px' }} title={report.targetInfo.title}>
                                  {report.targetInfo.title}
                                </small>
                              )}
                              {report.targetType === 'comment' && (
                                <small className="text-truncate d-block" style={{ maxWidth: '200px' }} title={report.targetInfo.content}>
                                  {report.targetInfo.content}
                                </small>
                              )}
                              {report.targetType === 'user' && (
                                <small>
                                  {report.targetInfo.displayName || report.targetInfo.username}
                                </small>
                              )}
                              {(report.targetType === 'post' || report.targetType === 'comment') && report.targetInfo?.authorId && (
                                <div>
                                  <small className="text-muted">Bởi: {report.targetInfo.authorId.displayName || report.targetInfo.authorId.username}</small>
                                </div>
                              )}
                              <button 
                                className="btn btn-link btn-sm p-0"
                                onClick={() => handleViewTargetReports(report.targetType, report.targetId)}
                              >
                                <i className="ph-eye me-1"></i>
                                Xem tất cả báo cáo
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">Đã xóa</span>
                          )}
                        </td>
                        <td>
                          <small className="text-truncate d-block" style={{ maxWidth: '200px' }} title={report.reason}>
                            {report.reason}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={getStatusBadge(report.status)}>
                              {report.status === 'open' ? 'Chờ xử lý' : 
                               report.status === 'reviewed' ? 'Đang xem xét' : 'Đã đóng'}
                            </span>
                            <select 
                              className="form-select form-select-sm"
                              style={{ width: 'auto' }}
                              value={report.status}
                              onChange={(e) => handleUpdateStatus(report._id, e.target.value)}
                            >
                              <option value="open">Chờ xử lý</option>
                              <option value="reviewed">Đang xem xét</option>
                              <option value="closed">Đã đóng</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          <small>{formatDate(report.createdAt)}</small>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-info me-1"
                            onClick={() => handleViewDetail(report)}
                          >
                            <i className="ph-eye"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteReport(report._id)}
                          >
                            <i className="ph-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="d-flex align-items-center gap-3">
                  <span>
                    Hiển thị {reports.length} / {pagination.total} báo cáo
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    <span>Kích thước trang:</span>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 'auto' }}
                      value={pagination.limit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value, 10);
                        setPagination(prev => ({ ...prev, page: 1, limit: newLimit }));
                        setSelectedReports([]);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setPagination(prev => { const next = { ...prev, page: 1 }; setSelectedReports([]); return next; })}
                      >
                        Đầu
                      </button>
                    </li>
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setPagination(prev => { const next = { ...prev, page: prev.page - 1 }; setSelectedReports([]); return next; })}
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
                          onClick={() => setPagination(prev => { const next = { ...prev, page: i + 1 }; setSelectedReports([]); return next; })}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setPagination(prev => { const next = { ...prev, page: prev.page + 1 }; setSelectedReports([]); return next; })}
                      >
                        Sau
                      </button>
                    </li>
                    <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setPagination(prev => { const next = { ...prev, page: pagination.pages || 1 }; setSelectedReports([]); return next; })}
                      >
                        Cuối
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết báo cáo</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Người báo cáo:</strong>
                    <div className="d-flex align-items-center mt-2">
                      <img 
                        src={selectedReport.reporterId?.avatarUrl || 'https://via.placeholder.com/40'} 
                        alt="avatar"
                        className="rounded-circle me-2"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div>
                        <div>{selectedReport.reporterId?.displayName || selectedReport.reporterId?.username}</div>
                        <small className="text-muted">{selectedReport.reporterId?.email}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <strong>Thời gian:</strong>
                    <div className="mt-2">{formatDate(selectedReport.createdAt)}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Loại đối tượng:</strong>
                  <div className="mt-2">
                    <span className={getTargetTypeBadge(selectedReport.targetType)}>
                      {selectedReport.targetType === 'post' ? 'Bài viết' : 
                       selectedReport.targetType === 'comment' ? 'Bình luận' : 'User'}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Lý do báo cáo:</strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    {selectedReport.reason}
                  </div>
                </div>

                {selectedReport.targetInfo && (
                  <div className="mb-3">
                    <strong>Nội dung bị báo cáo:</strong>
                    <div className="mt-2 p-3 border rounded">
                      {selectedReport.targetType === 'post' && (
                        <>
                          <h6>{selectedReport.targetInfo.title}</h6>
                          <div dangerouslySetInnerHTML={{ __html: selectedReport.targetInfo.content?.substring(0, 200) + '...' }} />
                        </>
                      )}
                      {selectedReport.targetType === 'comment' && (
                        <div>{selectedReport.targetInfo.content}</div>
                      )}
                      {selectedReport.targetType === 'user' && (
                        <div className="d-flex align-items-center">
                          <img 
                            src={selectedReport.targetInfo.avatarUrl || 'https://via.placeholder.com/60'} 
                            alt="avatar"
                            className="rounded-circle me-3"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          />
                          <div>
                            <h6>{selectedReport.targetInfo.displayName || selectedReport.targetInfo.username}</h6>
                            <small className="text-muted">{selectedReport.targetInfo.email}</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <strong>Trạng thái:</strong>
                  <div className="mt-2">
                    <span className={getStatusBadge(selectedReport.status)}>
                      {selectedReport.status === 'open' ? 'Chờ xử lý' : 
                       selectedReport.status === 'reviewed' ? 'Đang xem xét' : 'Đã đóng'}
                    </span>
                  </div>
                </div>

                {selectedReport.handledBy && (
                  <div className="mb-3">
                    <strong>Người xử lý:</strong>
                    <div className="mt-2">
                      {selectedReport.handledBy.displayName || selectedReport.handledBy.username}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="btn-group me-auto">
                  {selectedReport.status === 'open' && (
                    <button 
                      className="btn btn-info"
                      onClick={() => handleUpdateStatus(selectedReport._id, 'reviewed')}
                    >
                      <i className="ph-eye me-1"></i>
                      Đánh dấu xem xét
                    </button>
                  )}
                  {selectedReport.status !== 'closed' && (
                    <>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed')}
                      >
                        <i className="ph-check-circle me-1"></i>
                        Đóng (Không vi phạm)
                      </button>
                      <button 
                        className="btn btn-warning"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'delete_content')}
                      >
                        <i className="ph-trash me-1"></i>
                        Xóa nội dung
                      </button>
                      <button 
                        className="btn btn-warning"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'warn_user')}
                      >
                        <i className="ph-warning me-1"></i>
                        Cảnh báo user
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'ban_user')}
                      >
                        <i className="ph-prohibit me-1"></i>
                        Ban user
                      </button>
                    </>
                  )}
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Reports Modal */}
      {showTargetReportsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Tất cả báo cáo ({targetReports.length})
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowTargetReportsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {targetReports.length === 0 ? (
                  <p className="text-muted text-center">Không có báo cáo nào</p>
                ) : (
                  <div className="list-group">
                    {targetReports.map(report => (
                      <div key={report._id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <img 
                                src={report.reporterId?.avatarUrl || 'https://via.placeholder.com/30'} 
                                alt="avatar"
                                className="rounded-circle me-2"
                                style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                              />
                              <strong>{report.reporterId?.displayName || report.reporterId?.username}</strong>
                            </div>
                            <p className="mb-1">{report.reason}</p>
                            <small className="text-muted">{formatDate(report.createdAt)}</small>
                          </div>
                          <span className={getStatusBadge(report.status)}>
                            {report.status === 'open' ? 'Chờ xử lý' : 
                             report.status === 'reviewed' ? 'Đang xem xét' : 'Đã đóng'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowTargetReportsModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAdmin;
