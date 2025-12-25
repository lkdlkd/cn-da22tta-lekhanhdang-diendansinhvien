import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../Context/AuthContext';
import {
  getAllReportsAdmin,
  getReportsStatsAdmin,
  updateReportStatusAdmin,
  deleteReportAdmin,
  deleteMultipleReportsAdmin,
  bulkHandleReportsAdmin,
  getReportsByTargetAdmin
} from '../../Utils/api';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import LoadingPost from '@/Components/LoadingPost';
import { Table } from 'react-bootstrap';
import '../../assets/css/ReportAdmin.css';

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

  const { auth } = useContext(AuthContext);
  const token = auth.token;

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
      const statusText = {
        'open': 'Chờ xử lý',
        'reviewed': 'Đang xem xét',
        'closed': 'Đã đóng'
      };

      const actionText = action
        ? ` và ${action === 'delete_content' ? 'xóa nội dung' : action === 'ban_user' ? 'ban user' : action === 'warn_user' ? 'cảnh báo user' : 'thực hiện hành động'}`
        : '';

      const result = await Swal.fire({
        title: 'Xác nhận',
        text: `Cập nhật trạng thái thành "${statusText[status] || status}"${actionText}?`,
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
      {/* Page Header */}
      <div className="report-admin-header">
        <h2>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Quản lý Báo cáo
        </h2>
        <p>
          <i className="bi bi-info-circle me-1"></i>
          Xem và xử lý các báo cáo vi phạm từ người dùng
        </p>
      </div>
      {/* Statistics Cards */}
      {stats && (
        <div className="row mb-2">
          <div className="col-md-3 mb-3">
            <div className="stats-card card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 text-muted">Tổng báo cáo</p>
                    <h3 className="mb-0 fw-bold text-primary">{stats.totalReports}</h3>
                  </div>
                  <div className="stats-icon bg-primary bg-opacity-10">
                    <i className="bi bi-clipboard-data-fill text-primary" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="stats-card card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 text-muted">Chờ xử lý</p>
                    <h3 className="mb-0 fw-bold text-warning">{stats.byStatus.open}</h3>
                  </div>
                  <div className="stats-icon bg-warning bg-opacity-10">
                    <i className="bi bi-hourglass-split text-warning" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="stats-card card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 text-muted">Đang xem xét</p>
                    <h3 className="mb-0 fw-bold text-info">{stats.byStatus.reviewed}</h3>
                  </div>
                  <div className="stats-icon bg-info bg-opacity-10">
                    <i className="bi bi-eye-fill text-info" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="stats-card card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 text-muted">Đã đóng</p>
                    <h3 className="mb-0 fw-bold text-success">{stats.byStatus.closed}</h3>
                  </div>
                  <div className="stats-icon bg-success bg-opacity-10">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-card card mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-funnel-fill me-2"></i>
            Bộ lọc
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-3 col-md-6">
              <label className="filter-label">
                <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
                Trạng thái
              </label>
              <select
                className="form-select"
                value={pendingFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">🔘 Tất cả</option>
                <option value="open">⏳ Chờ xử lý</option>
                <option value="reviewed">👁️ Đang xem xét</option>
                <option value="closed">✅ Đã đóng</option>
              </select>
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="filter-label">
                <i className="bi bi-tags-fill me-1" style={{ fontSize: '8px' }}></i>
                Loại đối tượng
              </label>
              <select
                className="form-select"
                value={pendingFilters.targetType}
                onChange={(e) => handleFilterChange('targetType', e.target.value)}
              >
                <option value="">🔘 Tất cả</option>
                <option value="post">📝 Bài viết</option>
                <option value="comment">💬 Bình luận</option>
                <option value="user">👤 User</option>
              </select>
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="filter-label">
                <i className="bi bi-search me-1" style={{ fontSize: '8px' }}></i>
                Tìm kiếm
              </label>
              <div className="filter-input-group input-group">
                <span className="input-group-text">
                  <i className="bi bi-search text-primary"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm theo nội dung..."
                  value={pendingFilters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                />
                <button className="btn btn-primary" onClick={applyFilters}>
                  <i className="bi bi-search"></i>
                </button>
              </div>
            </div>
            <div className="col-lg-2 col-md-6">
              <label className="filter-label">
                <i className="bi bi-sort-down me-1" style={{ fontSize: '8px' }}></i>
                Sắp xếp
              </label>
              <div className="d-flex gap-1">
                <select
                  className="form-select"
                  value={pendingFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="createdAt">📅 Thời gian</option>
                  <option value="status">🔵 Trạng thái</option>
                  <option value="targetType">📂 Loại</option>
                </select>
                <button
                  className={`btn ${pendingFilters.order === 'desc' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('order', pendingFilters.order === 'desc' ? 'asc' : 'desc')}
                  title={pendingFilters.order === 'desc' ? 'Giảm dần' : 'Tăng dần'}
                >
                  <i className={`bi bi-sort-${pendingFilters.order === 'desc' ? 'down' : 'up'}`}></i>
                </button>
              </div>
            </div>
            <div className="col-lg-1 col-md-6">
              <label className="filter-label">
                <i className="bi bi-list-ol me-1" style={{ fontSize: '8px' }}></i>
                Số dòng
              </label>
              <select
                className="form-select"
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
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={applyFilters}>
              <i className="bi bi-search me-2"></i>
              Áp dụng
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFilters}>
              <i className="bi bi-arrow-counterclockwise me-2"></i>
              Đặt lại
            </button>
            <button className="btn btn-outline-primary" onClick={fetchReports}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* Applied filters summary */}
      {(appliedFilters.status || appliedFilters.targetType || appliedFilters.keyword || appliedFilters.sortBy || appliedFilters.order) && (
        <div className="applied-filters mb-3">
          {appliedFilters.status && (
            <span className="badge me-2">Trạng thái: {appliedFilters.status}</span>
          )}
          {appliedFilters.targetType && (
            <span className="badge me-2">Loại: {appliedFilters.targetType}</span>
          )}
          {appliedFilters.keyword && (
            <span className="badge me-2">Từ khóa: "{appliedFilters.keyword}"</span>
          )}
          {(appliedFilters.sortBy || appliedFilters.order) && (
            <span className="badge me-2">
              Sắp xếp: {appliedFilters.sortBy === 'createdAt' ? 'Thời gian' : appliedFilters.sortBy === 'status' ? 'Trạng thái' : 'Loại'} {appliedFilters.order === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <div className="bulk-actions-alert d-flex align-items-center justify-content-between mb-3">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            <strong>Đã chọn {selectedReports.length} báo cáo</strong>
          </div>
          <div className="btn-group flex-wrap">
            <button
              className="btn btn-sm btn-info"
              onClick={() => handleBulkHandle('reviewed')}
            >
              <i className="bi bi-eye-fill me-1"></i>
              Đánh dấu xem xét
            </button>
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleBulkHandle('closed')}
            >
              <i className="bi bi-check-circle-fill me-1"></i>
              Đóng
            </button>
            <button
              className="btn btn-sm btn-warning"
              onClick={() => handleBulkHandle('closed', 'delete_content')}
            >
              <i className="bi bi-trash-fill me-1"></i>
              Xóa nội dung
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleBulkHandle('closed', 'ban_user')}
            >
              <i className="bi bi-person-x-fill me-1"></i>
              Ban user
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash-fill me-1"></i>
              Xóa báo cáo
            </button>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="reports-table-card card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-table me-2"></i>
            Danh sách báo cáo
          </h5>
          <span className="badge bg-white text-primary" style={{ fontSize: '14px' }}>
            Tổng: {pagination.total}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4">
              <LoadingPost count={5} />
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-inbox empty-state-icon"></i>
              <h5>Không có báo cáo nào</h5>
              <p>Thử thay đổi bộ lọc để xem kết quả khác</p>
              <button className="btn btn-outline-secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover responsive bordered >
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedReports.length === reports.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ width: '60px' }}>STT</th>
                      <th style={{ width: '120px' }}>Thao tác</th>
                      <th style={{ minWidth: '200px' }}>Người báo cáo</th>
                      <th style={{ width: '100px' }}>Loại</th>
                      <th style={{ minWidth: '250px' }}>Đối tượng</th>
                      <th style={{ minWidth: '250px' }}>Lý do</th>
                      <th style={{ minWidth: '180px' }}>Trạng thái</th>
                      <th style={{ minWidth: '150px' }}>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => (
                      <tr key={report._id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedReports.includes(report._id)}
                            onChange={() => handleSelectReport(report._id)}
                          />
                        </td>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="action-dropdown dropdown">
                            <button
                              className="btn btn-sm btn-primary dropdown-toggle"
                              type="button"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                            >
                              Thao tác <i className="bi bi-chevron-down ms-1"></i>
                            </button>
                            <ul className="dropdown-menu">
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleViewDetail(report)}
                                >
                                  <i className="bi bi-eye-fill me-2 text-info"></i>
                                  Xem chi tiết
                                </button>
                              </li>
                              <li><hr className="dropdown-divider" /></li>
                              <li>
                                <button
                                  className="dropdown-item text-danger"
                                  onClick={() => handleDeleteReport(report._id)}
                                >
                                  <i className="bi bi-trash-fill me-2"></i>
                                  Xóa
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                        <td>
                          <div className="user-info d-flex align-items-center">
                            <img
                              src={report.reporterId?.avatarUrl || 'https://via.placeholder.com/40'}
                              alt="avatar"
                              className="user-avatar me-2"
                            />
                            <div>
                              <div className="user-name">{report.reporterId?.displayName || report.reporterId?.username}</div>
                              <div className="user-email small">{report.reporterId?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`target-type-badge ${getTargetTypeBadge(report.targetType)}`}>
                            {report.targetType === 'post' ? '📝 Bài viết' :
                              report.targetType === 'comment' ? '💬 Bình luận' : '👤 User'}
                          </span>
                        </td>
                        <td>
                          {report.targetInfo ? (
                            <div>
                              {report.targetType === 'post' && (
                                <div className="text-truncate" style={{ maxWidth: '200px' }} title={report.targetInfo.title}>
                                  {report.targetInfo.title}
                                </div>
                              )}
                              {report.targetType === 'comment' && (
                                <div className="text-truncate" style={{ maxWidth: '200px' }} title={report.targetInfo.content}>
                                  {report.targetInfo.content}
                                </div>
                              )}
                              {report.targetType === 'user' && (
                                <div>
                                  {report.targetInfo.displayName || report.targetInfo.username}
                                </div>
                              )}
                              {(report.targetType === 'post' || report.targetType === 'comment') && report.targetInfo?.authorId && (
                                <div className="text-muted">Bởi: {report.targetInfo.authorId.displayName || report.targetInfo.authorId.username}</div>
                              )}
                              <button
                                className="btn btn-link p-0 mt-1"
                                onClick={() => handleViewTargetReports(report.targetType, report.targetId)}
                              >
                                <i className="bi bi-eye-fill me-1"></i>
                                Xem tất cả báo cáo
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">Đã xóa</span>
                          )}
                        </td>
                        <td>
                          <div className="content-truncate" title={report.reason}>
                            {report.reason}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`status-badge ${report.status}`}>
                              {report.status === 'open' ? '⏳ Chờ xử lý' :
                                report.status === 'reviewed' ? '👁️ Đang xem xét' : '✅ Đã đóng'}
                            </span>
                            <select
                              className="form-select"
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
                          <div>{formatDate(report.createdAt)}</div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="pagination-wrapper d-flex justify-content-between align-items-center">

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
            <div className="report-modal modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-info-circle-fill me-2"></i>
                  Chi tiết báo cáo
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="info-section row mb-3">
                  <div className="col-md-6">
                    <div className="info-label">Người báo cáo:</div>
                    <div className="info-content d-flex align-items-center mt-2">
                      <img
                        src={selectedReport.reporterId?.avatarUrl || 'https://via.placeholder.com/40'}
                        alt="avatar"
                        className="user-avatar me-2"
                      />
                      <div>
                        <div className="fw-semibold">{selectedReport.reporterId?.displayName || selectedReport.reporterId?.username}</div>
                        <div className="text-muted small">{selectedReport.reporterId?.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="info-label">Thời gian:</div>
                    <div className="info-content mt-2">{formatDate(selectedReport.createdAt)}</div>
                  </div>
                </div>

                <div className="info-section mb-3">
                  <div className="info-label">Loại đối tượng:</div>
                  <div className="info-content mt-2">
                    <span className={`target-type-badge ${getTargetTypeBadge(selectedReport.targetType)}`}>
                      {selectedReport.targetType === 'post' ? '📝 Bài viết' :
                        selectedReport.targetType === 'comment' ? '💬 Bình luận' : '👤 User'}
                    </span>
                  </div>
                </div>

                <div className="info-section mb-3">
                  <div className="info-label">Lý do báo cáo:</div>
                  <div className="info-content p-3 bg-light rounded mt-2">
                    {selectedReport.reason}
                  </div>
                </div>

                {selectedReport.targetInfo && (
                  <div className="info-section mb-3">
                    <div className="info-label">Nội dung bị báo cáo:</div>
                    <div className="info-content p-3 border rounded mt-2">
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
                            className="user-avatar me-3"
                            style={{ width: '60px', height: '60px' }}
                          />
                          <div>
                            <h6 className="mb-1">{selectedReport.targetInfo.displayName || selectedReport.targetInfo.username}</h6>
                            <div className="text-muted">{selectedReport.targetInfo.email}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="info-section mb-3">
                  <div className="info-label">Trạng thái:</div>
                  <div className="info-content mt-2">
                    <span className={`status-badge ${selectedReport.status}`}>
                      {selectedReport.status === 'open' ? '⏳ Chờ xử lý' :
                        selectedReport.status === 'reviewed' ? '👁️ Đang xem xét' : '✅ Đã đóng'}
                    </span>
                  </div>
                </div>

                {selectedReport.handledBy && (
                  <div className="info-section">
                    <div className="info-label">Người xử lý:</div>
                    <div className="info-content mt-2">
                      {selectedReport.handledBy.displayName || selectedReport.handledBy.username}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="btn-group me-auto flex-wrap">
                  {selectedReport.status === 'open' && (
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleUpdateStatus(selectedReport._id, 'reviewed')}
                    >
                      <i className="bi bi-eye-fill me-2"></i>
                      Đánh dấu xem xét
                    </button>
                  )}
                  {selectedReport.status !== 'closed' && (
                    <>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed')}
                      >
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Đóng (Không vi phạm)
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'delete_content')}
                      >
                        <i className="bi bi-trash-fill me-2"></i>
                        Xóa nội dung
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'warn_user')}
                      >
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        Cảnh báo user
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUpdateStatus(selectedReport._id, 'closed', 'ban_user')}
                      >
                        <i className="bi bi-person-x-fill me-2"></i>
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
            <div className="report-modal modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-list-ul me-2"></i>
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
                  <div className="empty-state">
                    <i className="bi bi-inbox empty-state-icon"></i>
                    <h5>Không có báo cáo nào</h5>
                  </div>
                ) : (
                  <div className="target-reports-list list-group">
                    {targetReports.map(report => (
                      <div key={report._id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <img
                                src={report.reporterId?.avatarUrl || 'https://via.placeholder.com/30'}
                                alt="avatar"
                                className="user-avatar me-2"
                                style={{ width: '30px', height: '30px' }}
                              />
                              <strong>{report.reporterId?.displayName || report.reporterId?.username}</strong>
                            </div>
                            <p className="mb-2">{report.reason}</p>
                            <div className="text-muted small">{formatDate(report.createdAt)}</div>
                          </div>
                          <span className={`status-badge ${report.status}`}>
                            {report.status === 'open' ? '⏳ Chờ xử lý' :
                              report.status === 'reviewed' ? '👁️ Đang xem xét' : '✅ Đã đóng'}
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
