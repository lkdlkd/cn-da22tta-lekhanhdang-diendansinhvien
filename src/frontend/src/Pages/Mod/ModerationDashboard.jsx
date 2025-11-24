import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import swal from 'sweetalert2';
import { AuthContext } from '../../Context/AuthContext';
import { getPendingPosts, approvePost, rejectPost, getModerationStats } from '../../Utils/api';
import LoadingPost from '@/Components/LoadingPost';

const ModerationDashboard = () => {
	const { auth } = useContext(AuthContext);
	const navigate = useNavigate();
	const token = auth?.token;

	const [pendingPosts, setPendingPosts] = useState([]);
	const [stats, setStats] = useState(null);
	const [recentActions, setRecentActions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [selectedPost, setSelectedPost] = useState(null);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectionReason, setRejectionReason] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [lastUpdated, setLastUpdated] = useState(null);
	const [sortBy, setSortBy] = useState('createdAt');
	const [sortOrder, setSortOrder] = useState('desc');
	const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [postsPerPage, setPostsPerPage] = useState(10);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		if (!auth || (auth.role !== 'mod' && auth.role !== 'admin')) {
			toast.error('Bạn không có quyền truy cập trang này');
			navigate('/');
		}
	}, [auth, navigate]);

	const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

	const buildPostUrl = (slug) => {
		if (!slug) return '';
		const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
		return `${origin}/post/${slug}`;
	};

	const getContentPreview = (content = '') => {
		if (!content) return '<em>Chưa có nội dung để hiển thị</em>';
		const stripped = content.replace(/<[^>]*>/g, '');
		return stripped.length > 320 ? `${stripped.substring(0, 320)}...` : stripped;
	};

	const loadPendingPosts = async () => {
		try {
			setLoading(true);

			// Build query params from current filters and pagination
			const params = new URLSearchParams();
			params.append('page', currentPage.toString());
			params.append('limit', postsPerPage.toString());
			params.append('moderationStatus', 'pending');

			if (categoryFilter && categoryFilter !== 'all') {
				params.append('categoryId', categoryFilter);
			}

			if (searchTerm.trim()) {
				params.append('keyword', searchTerm.trim());
			}

			params.append('sortBy', sortBy);
			params.append('order', sortOrder);

			const data = await getPendingPosts(token, params.toString());

			if (data.success) {
				setPendingPosts(data.data || []);
				if (data.pagination) {
					setTotalPages(data.pagination.pages || 1);
				}
				setLastUpdated(new Date());
			}
		} catch (error) {
			console.error('Error loading pending posts:', error);
			toast.error('Không thể tải danh sách bài viết');
		} finally {
			setLoading(false);
		}
	};

	const loadStats = async () => {
		try {
			const data = await getModerationStats(token);
			if (data.success) {
				const payload = data.data || {};
				setStats({
					pending: payload.pending || 0,
					approved: payload.approved || 0,
					rejected: payload.rejected || 0,
					total: payload.total || 0
				});
				setRecentActions(payload.recentActions || []);
			}
		} catch (error) {
			console.error('Error loading stats:', error);
			toast.error('Không thể tải thống kê');
		}
	};

	useEffect(() => {
		if (token && auth && (auth.role === 'mod' || auth.role === 'admin')) {
			loadStats();
		}
	}, [token, auth]);

	// Reload posts when filters or pagination changes
	useEffect(() => {
		if (token && auth && (auth.role === 'mod' || auth.role === 'admin')) {
			loadPendingPosts();
		}
	}, [token, auth, currentPage, postsPerPage, categoryFilter, searchTerm, sortBy, sortOrder]);

	// Note: Category counts may not be accurate with server-side pagination
	const availableCategories = useMemo(() => {
		const map = new Map();
		pendingPosts.forEach((post) => {
			const id = post.categoryId?._id || 'uncategorized';
			const title = post.categoryId?.title || '(Không có danh mục)';
			if (!map.has(id)) {
				map.set(id, { id, title, count: 0 });
			}
			map.get(id).count++;
		});
		return Array.from(map.values());
	}, [pendingPosts]);

	const filteredPosts = useMemo(() => {
		let result = [...pendingPosts];

		// Client-side date filter only (backend doesn't support date filtering)
		if (dateFilter !== 'all') {
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			let startDate;

			switch (dateFilter) {
				case 'today':
					startDate = today;
					break;
				case 'week':
					startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case 'month':
					startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				default:
					startDate = null;
			}

			if (startDate) {
				result = result.filter(post => new Date(post.createdAt) >= startDate);
			}
		}

		return result;
	}, [pendingPosts, dateFilter]);

	// Backend handles pagination, filtered posts are already paginated
	const paginatedPosts = filteredPosts;

	// Reset to page 1 when filters change (not when pagination changes)
	useEffect(() => {
		setCurrentPage(1);
	}, [categoryFilter, searchTerm, dateFilter, sortBy, sortOrder]);

	const filteredCount = filteredPosts.length;
	const totalPending = pendingPosts.length;
	const roleLabel = auth?.role === 'admin' ? 'ADMIN' : 'MOD';

	// Pagination handlers
	const handlePageChange = (page) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handlePostsPerPageChange = (newPerPage) => {
		setPostsPerPage(newPerPage);
		setCurrentPage(1);
	};

	const getPaginationRange = () => {
		const delta = 2;
		const range = [];
		const rangeWithDots = [];
		let l;

		for (let i = 1; i <= totalPages; i++) {
			if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
				range.push(i);
			}
		}

		range.forEach((i) => {
			if (l) {
				if (i - l === 2) {
					rangeWithDots.push(l + 1);
				} else if (i - l !== 1) {
					rangeWithDots.push('...');
				}
			}
			rangeWithDots.push(i);
			l = i;
		});

		return rangeWithDots;
	};

	const handleRefreshAll = () => {
		loadPendingPosts();
		loadStats();
	};

	const handleOpenPublicPost = (slug) => {
		if (!slug) {
			toast.info('Bài viết chưa có đường dẫn công khai');
			return;
		}
		const url = buildPostUrl(slug);
		if (url) {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	};

	const handleCopyPostLink = async (slug) => {
		if (!slug) {
			toast.info('Bài viết chưa có slug');
			return;
		}
		if (!navigator?.clipboard) {
			toast.error('Trình duyệt không hỗ trợ sao chép tự động');
			return;
		}
		try {
			await navigator.clipboard.writeText(buildPostUrl(slug));
			toast.success('Đã sao chép liên kết bài viết');
		} catch (error) {
			console.error('Clipboard error:', error);
			toast.error('Không thể sao chép liên kết');
		}
	};

	const openDetailsModal = (post) => {
		setSelectedPost(post);
		setShowDetailsModal(true);
	};

	const closeDetailsModal = () => {
		setShowDetailsModal(false);
		setSelectedPost(null);
	};

	const openRejectModal = (post) => {
		setShowDetailsModal(false);
		setSelectedPost(post);
		setRejectionReason('');
		setShowRejectModal(true);
	};

	const handleOpenRejectFromDetails = () => {
		if (!selectedPost) return;
		openRejectModal(selectedPost);
	};

	const handleApprove = async (postId, options = {}) => {
		const { closeDetails = false } = options;
		swal
			.fire({
				title: 'Xác nhận duyệt bài',
				text: 'Bạn có chắc muốn duyệt bài viết này?',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Duyệt',
				cancelButtonText: 'Hủy'
			})
			.then(async (result) => {
				if (result.isConfirmed) {
					try {
						setIsProcessing(true);
						const data = await approvePost(token, postId);
						if (data.success) {
							toast.success('Đã duyệt bài viết thành công!');
							if (closeDetails) {
								closeDetailsModal();
							}
							loadPendingPosts();
							loadStats();
						} else {
							toast.error(data.error || 'Có lỗi xảy ra');
						}
					} catch (error) {
						console.error('Error approving post:', error);
						toast.error('Không thể duyệt bài viết');
					} finally {
						setIsProcessing(false);
					}
				}
			});
	};

	const handleReject = async () => {
		const trimmedReason = rejectionReason.trim();
		if (!trimmedReason) {
			toast.error('Vui lòng nhập lý do từ chối');
			return;
		}
		if (!selectedPost?._id) {
			toast.error('Không tìm thấy bài viết để từ chối');
			return;
		}

		try {
			setIsProcessing(true);
			const data = await rejectPost(token, selectedPost._id, trimmedReason);
			if (data.success) {
				toast.success('Đã từ chối bài viết');
				setShowRejectModal(false);
				closeDetailsModal();
				setSelectedPost(null);
				setRejectionReason('');
				loadPendingPosts();
				loadStats();
			} else {
				toast.error(data.error || 'Có lỗi xảy ra');
			}
		} catch (error) {
			console.error('Error rejecting post:', error);
			toast.error('Không thể từ chối bài viết');
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="container-fluid py-4">
			{/* Header */}
			<div className="row mb-4">
				<div className="col-12">
					<div className="d-flex flex-wrap justify-content-between align-items-start gap-3 border-bottom pb-3">
						<div>
							<h1 className="h2 mb-1 d-flex align-items-center gap-2">
								<i className="ph-shield-check" style={{ fontSize: '2rem', color: '#8b5cf6' }}></i>
								Quản lý duyệt bài
							</h1>
							<p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>Theo dõi tiến trình kiểm duyệt và phản hồi bài viết</p>
						</div>
						<div className="text-end">
							{lastUpdated && (
								<p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Cập nhật: {formatDateTime(lastUpdated)}</p>
							)}
							<div className="d-flex flex-wrap gap-2 justify-content-end">
								<span
									className="badge rounded-pill px-3 py-2 fw-semibold text-uppercase"
									style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}
								>
									{roleLabel}
								</span>
								<button
									className="btn btn-outline-primary d-flex align-items-center gap-2"
									onClick={handleRefreshAll}
									disabled={loading || isProcessing}
								>
									<i className={`ph-arrow-clockwise ${loading ? 'ph-spin' : ''}`}></i>
									Làm mới
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			{stats && (
				<div className="row g-3 mb-4">
					{[
						{ label: 'Chờ duyệt', value: stats.pending, icon: 'ph-clock', accent: 'text-warning' },
						{ label: 'Đã duyệt', value: stats.approved, icon: 'ph-check-circle', accent: 'text-success' },
						{ label: 'Đã từ chối', value: stats.rejected, icon: 'ph-x-circle', accent: 'text-danger' },
						{ label: 'Tổng bài viết', value: stats.total, icon: 'ph-article', accent: 'text-primary' }
					].map((card) => (
						<div className="col-md-6 col-xl-3" key={card.label}>
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div
										className="rounded-circle bg-light d-flex align-items-center justify-content-center"
										style={{ width: '56px', height: '56px' }}
									>
										<i className={`${card.icon} ${card.accent}`} style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>{card.label}</p>
										<h3 className="mb-0 fw-bold">{card.value}</h3>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Filter Bar */}
			<div className="card border-0 shadow-sm mb-4">
				<div className="card-body">
					{/* Row 1: Search, Category, Date Filter */}
					<div className="row g-3 mb-3">
						<div className="col-md-4">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								<i className="ph-magnifying-glass me-1"></i>Tìm kiếm
							</label>
							<div className="input-group">
								<span className="input-group-text bg-light border-0">
									<i className="ph-magnifying-glass"></i>
								</span>
								<input
									type="text"
									className="form-control border-0 bg-light"
									placeholder="Tiêu đề, tác giả, email, tags, slug..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>
						<div className="col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								<i className="ph-folder me-1"></i>Danh mục
							</label>
							<select
								className="form-select border-0 bg-light"
								value={categoryFilter}
								onChange={(e) => setCategoryFilter(e.target.value)}
							>
								<option value="all">Tất cả danh mục</option>
								{availableCategories.map((cat) => (
									<option key={cat.id} value={cat.id}>
										{cat.title} ({cat.count})
									</option>
								))}
							</select>
						</div>
						<div className="col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								<i className="ph-calendar me-1"></i>Thời gian
							</label>
							<select
								className="form-select border-0 bg-light"
								value={dateFilter}
								onChange={(e) => setDateFilter(e.target.value)}
							>
								<option value="all">Tất cả thời gian</option>
								<option value="today">Hôm nay</option>
								<option value="week">7 ngày qua</option>
								<option value="month">30 ngày qua</option>
							</select>
						</div>
						<div className="col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								&nbsp;
							</label>
							<button
								className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
								onClick={() => {
									setSearchTerm('');
									setCategoryFilter('all');
									setDateFilter('all');
									setSortBy('createdAt');
									setSortOrder('desc');
								}}
							>
								<i className="ph-eraser"></i>
								Xóa lọc
							</button>
						</div>
					</div>

					{/* Row 2: Sort Options & Stats */}
					<div className="row g-3 align-items-center">
						<div className="col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								<i className="ph-sort-ascending me-1"></i>Sắp xếp theo
							</label>
							<select
								className="form-select border-0 bg-light"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="views">Lượt xem</option>
								<option value="title">Tiêu đề (A-Z)</option>
							</select>
						</div>
						<div className="col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
								<i className="ph-arrows-down-up me-1"></i>Thứ tự
							</label>
							<select
								className="form-select border-0 bg-light"
								value={sortOrder}
								onChange={(e) => setSortOrder(e.target.value)}
							>
								<option value="desc">Giảm dần</option>
								<option value="asc">Tăng dần</option>
							</select>
						</div>
						<div className="col-md-7">
							<div className="d-flex align-items-center gap-3 h-100">
								<div className="d-flex align-items-center gap-2">
									<i className="ph-list-checks" style={{ fontSize: '1.25rem', color: '#6366f1' }}></i>
									<div>
										<div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Hiển thị</div>
										<div className="fw-bold" style={{ fontSize: '1.1rem', color: '#1f2937' }}>{filteredCount}/{totalPending}</div>
									</div>
								</div>
								<div className="vr" style={{ height: '40px' }}></div>
								<div className="d-flex align-items-center gap-2">
									<i className="ph-hourglass-medium" style={{ fontSize: '1.25rem', color: '#f59e0b' }}></i>
									<div>
										<div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Chờ xử lý</div>
										<div className="fw-bold" style={{ fontSize: '1.1rem', color: '#1f2937' }}>{stats?.pending ?? totalPending}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			{/* Main Content */}
			<div className="row g-4">
				
				<div className="col-lg-8">
					<div className="card border-0 shadow-sm h-100">
						<div className="card-header bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
							<div>
								<h2 className="h5 mb-1">Bài viết chờ duyệt</h2>
								<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
									{filteredCount} / {totalPending} bài phù hợp bộ lọc hiện tại
								</p>
							</div>
							<span className="badge bg-primary text-white fw-semibold px-3 py-2">Chờ duyệt</span>
							
						</div>
						<div className="p-3">
							{/* Pagination Controls */}
							{!loading && filteredCount > 0 && (
								<div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-4">
									{/* Page Info */}
									<div className="text-muted" style={{ fontSize: '0.9rem' }}>
										Hiển thị <span className="fw-semibold">{((currentPage - 1) * postsPerPage) + 1}</span> đến{' '}
										<span className="fw-semibold">{Math.min(currentPage * postsPerPage, filteredCount)}</span> trong tổng số{' '}
										<span className="fw-semibold">{filteredCount}</span> bài viết
									</div>

									{/* Pagination Buttons */}
									{totalPages > 1 && (
										<div className="d-flex gap-2 align-items-center">
											{/* Previous Button */}
											<button
												className="btn btn-outline-secondary btn-sm"
												onClick={() => handlePageChange(currentPage - 1)}
												disabled={currentPage === 1}
											>
												<i className="ph-caret-left"></i>
											</button>

											{/* Page Numbers */}
											{getPaginationRange().map((page, idx) => (
												page === '...' ? (
													<span key={`dots-${idx}`} className="px-2 text-muted">
														...
													</span>
												) : (
													<button
														key={page}
														className={`btn btn-sm ${currentPage === page
																? 'btn-primary'
																: 'btn-outline-secondary'
															}`}
														onClick={() => handlePageChange(page)}
													>
														{page}
													</button>
												)
											))}

											{/* Next Button */}
											<button
												className="btn btn-outline-secondary btn-sm"
												onClick={() => handlePageChange(currentPage + 1)}
												disabled={currentPage === totalPages}
											>
												<i className="ph-caret-right"></i>
											</button>
										</div>
									)}

									{/* Posts Per Page Selector */}
									<div className="d-flex align-items-center gap-2">
										<span className="text-muted" style={{ fontSize: '0.9rem' }}>Hiển thị:</span>
										<select
											className="form-select form-select-sm"
											style={{ width: 'auto', fontSize: '0.9rem' }}
											value={postsPerPage}
											onChange={(e) => handlePostsPerPageChange(Number(e.target.value))}
										>
											<option value={10}>10 bài</option>
											<option value={20}>20 bài</option>
											<option value={50}>50 bài</option>
											<option value={100}>100 bài</option>
										</select>
									</div>
								</div>
							)}
							</div>
						
						<div className="card-body">
							{loading ? (
								<div className="py-2 text-center">
									<LoadingPost />
								</div>
							) : filteredCount === 0 ? (
								<div className="text-center py-5">
									<i className="ph-clipboard-text" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
									<p className="text-muted mt-3 mb-0">
										{searchTerm.trim() || categoryFilter !== 'all'
											? 'Không tìm thấy bài viết phù hợp với bộ lọc hiện tại'
											: 'Không có bài viết nào đang chờ duyệt'}
									</p>
								</div>
							) : (
								<div className="d-flex flex-column ">
									{paginatedPosts.map((post) => (
										<div key={post._id} className="card border shadow-sm">
											<div className="card-body">
												{/* Header: Author & Category */}
												<div className="d-flex justify-content-between align-items-start mb-3">
													<div className="d-flex align-items-center gap-2">
														<img
															src={post.authorId?.avatarUrl || '/default-avatar.png'}
															alt={post.authorId?.displayName || 'Tác giả'}
															className="rounded-circle"
															style={{ width: '48px', height: '48px', objectFit: 'cover' }}
														/>
														<div>
															<h5 className="mb-0 fw-semibold">{post.authorId?.displayName || 'Người dùng'}</h5>
															<div className="d-flex flex-wrap align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
																<span className="text-muted">{formatDateTime(post.createdAt)}</span>
																{post.authorId?.email && (
																	<>
																		<span className="text-muted">•</span>
																		<span className="text-muted">{post.authorId.email}</span>
																	</>
																)}
															</div>
														</div>
													</div>
													<span className="badge bg-secondary">{post.categoryId?.title || 'Không có danh mục'}</span>
												</div>

												{/* Slug Section */}
												<div className="d-flex flex-wrap align-items-center gap-2 text-muted mb-3" style={{ fontSize: '0.9rem' }}>
													<span>Slug:</span>
													<code className="bg-light px-2 py-1 rounded">{post.slug || '—'}</code>
													{post.slug && (
														<>
															<button
																className="btn btn-link btn-sm p-0 text-decoration-none"
																onClick={() => handleCopyPostLink(post.slug)}
															>
																<i className="ph-copy-simple me-1"></i>Sao chép
															</button>
															<button
																className="btn btn-link btn-sm p-0 text-decoration-none"
																onClick={() => handleOpenPublicPost(post.slug)}
															>
																<i className="ph-arrow-square-out me-1"></i>Mở tab
															</button>
														</>
													)}
												</div>

												{/* Title & Content */}
												<h4 className="mb-2">{post.title}</h4>
												<div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
													{getContentPreview(post.content)}
												</div>

												{/* Tags */}
												{post.tags && post.tags.length > 0 && (
													<div className="d-flex flex-wrap gap-2 mb-3">
														{post.tags.map((tag, idx) => (
															<span key={idx} className="badge bg-light text-dark border" style={{ fontSize: '0.85rem' }}>
																<i className="ph-hash me-1"></i>{tag}
															</span>
														))}
													</div>
												)}

												{/* Attachments */}
												{post.attachments && post.attachments.length > 0 && (
													<div className="mb-3">
														<div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.9rem' }}>
															<i className="ph-paperclip text-muted"></i>
															<span className="text-muted">{post.attachments.length} tệp đính kèm</span>
														</div>
													</div>
												)}

												{/* Stats */}
												<div className="d-flex flex-wrap gap-3 text-muted mb-3" style={{ fontSize: '0.9rem' }}>
													<span><i className="ph-eye me-1"></i>{post.views || 0} lượt xem</span>
													<span><i className="ph-heart me-1"></i>{post.likesCount || 0} lượt thích</span>
													<span><i className="ph-chat me-1"></i>{post.commentsCount || 0} bình luận</span>
												</div>

												{/* Actions */}
												<div className="d-flex flex-wrap gap-2">
													<button
														className="btn btn-success btn-sm d-flex align-items-center gap-2"
														onClick={() => handleApprove(post._id)}
														disabled={isProcessing}
													>
														<i className="ph-check"></i>
														Duyệt
													</button>
													<button
														className="btn btn-danger btn-sm d-flex align-items-center gap-2"
														onClick={() => openRejectModal(post)}
														disabled={isProcessing}
													>
														<i className="ph-x"></i>
														Từ chối
													</button>
													<button
														className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
														onClick={() => openDetailsModal(post)}
													>
														<i className="ph-list"></i>
														Chi tiết
													</button>
													<button
														className="btn btn-light btn-sm d-flex align-items-center gap-2"
														onClick={() => navigate(`/post/${post.slug}`)}
														disabled={!post.slug}
													>
														<i className="ph-eye"></i>
														Xem nhanh
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}


						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div className="col-lg-4">
					<div className="card border-0 shadow-sm mb-4">
						<div className="card-header bg-white border-0">
							<h6 className="mb-0 text-uppercase text-muted fw-semibold" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>Lịch sử duyệt gần đây</h6>
						</div>
						<div className="card-body">
							{recentActions.length === 0 ? (
								<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Chưa có hoạt động duyệt bài gần đây.</p>
							) : (
								<div className="list-group list-group-flush">
									{recentActions.map((action) => (
										<div
											key={action._id || action.slug}
											className="list-group-item px-0 border-0 pb-3 mb-3"
											style={{ borderBottom: '1px dashed #e5e7eb' }}
										>
											<div className="d-flex justify-content-between align-items-center gap-2 mb-2">
												<span className={`badge ${action.moderationStatus === 'approved' ? 'bg-success' : 'bg-danger'}`}>
													{action.moderationStatus === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
												</span>
												<span className="text-muted" style={{ fontSize: '0.85rem' }}>{formatDateTime(action.moderatedAt)}</span>
											</div>
											<p className="fw-semibold mb-1">{action.title}</p>
											<p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>
												Bởi {action.moderatedBy?.displayName || 'Ẩn danh'} • Tác giả: {action.authorId?.displayName || 'Không rõ'}
											</p>
											{action.moderationStatus === 'rejected' && action.rejectionReason && (
												<p className="text-danger mb-1" style={{ fontSize: '0.9rem' }}>Lý do: {action.rejectionReason}</p>
											)}
											<button
												className="btn btn-link btn-sm px-0 text-decoration-none"
												onClick={() => handleOpenPublicPost(action.slug)}
												disabled={!action.slug}
											>
												<i className="ph-arrow-square-out me-1"></i>Mở bài viết
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="card border shadow-sm">
						<div className="card-body">
							<h6 className="text-uppercase text-muted fw-semibold mb-3" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>Gợi ý thao tác</h6>
							<ul className="list-unstyled mb-0" style={{ fontSize: '0.9rem' }}>
								<li className="d-flex gap-2 mb-2">
									<i className="ph-lightning text-warning mt-1"></i>
									<span>Ưu tiên kiểm duyệt theo thời gian tạo và danh mục quan trọng.</span>
								</li>
								<li className="d-flex gap-2 mb-2">
									<i className="ph-note-pencil text-primary mt-1"></i>
									<span>Ghi rõ lý do khi từ chối để tác giả cải thiện nội dung.</span>
								</li>
								<li className="d-flex gap-2 mb-2">
									<i className="ph-eye text-success mt-1"></i>
									<span>Xem nhanh nội dung trước khi duyệt để tránh bỏ sót lỗi.</span>
								</li>
								<li className="d-flex gap-2">
									<i className="ph-users-three text-info mt-1"></i>
									<span>Trao đổi với Admin khi phát hiện nội dung nhạy cảm.</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Details Modal */}
			{showDetailsModal && selectedPost && (
				<div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className="modal-dialog modal-xl modal-dialog-scrollable">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title d-flex align-items-center gap-2">
									<i className="ph-file-text"></i>
									Chi tiết bài viết
								</h5>
								<button type="button" className="btn-close" onClick={closeDetailsModal}></button>
							</div>
							<div className="modal-body">
								<h3 className="fw-semibold mb-3">{selectedPost.title}</h3>
								<div className="d-flex flex-wrap align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
									<span className="text-muted">Slug:</span>
									<code className="bg-light px-2 py-1 rounded">{selectedPost.slug || '—'}</code>
									{selectedPost.slug && (
										<>
											<button
												className="btn btn-link btn-sm text-decoration-none"
												onClick={() => handleCopyPostLink(selectedPost.slug)}
											>
												<i className="ph-copy-simple me-1"></i>Sao chép
											</button>
											<button
												className="btn btn-link btn-sm text-decoration-none"
												onClick={() => handleOpenPublicPost(selectedPost.slug)}
											>
												<i className="ph-arrow-square-out me-1"></i>Mở tab
											</button>
										</>
									)}
								</div>
								<div className="row g-3 mb-4">
									<div className="col-md-4">
										<div className="border rounded p-3 h-100">
											<p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>Tác giả</p>
											<h6 className="mb-0">{selectedPost.authorId?.displayName || 'Người dùng'}</h6>
											<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedPost.authorId?.email}</p>
										</div>
									</div>
									<div className="col-md-4">
										<div className="border rounded p-3 h-100">
											<p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>Danh mục</p>
											<h6 className="mb-0">{selectedPost.categoryId?.title || 'Không có danh mục'}</h6>
											<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Tạo {formatDateTime(selectedPost.createdAt)}</p>
										</div>
									</div>
									<div className="col-md-4">
										<div className="border rounded p-3 h-100">
											<p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>Số liệu</p>
											<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedPost.views || 0} lượt xem</p>
											<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedPost.likes?.length || 0} lượt thích</p>
											<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedPost.comments?.length || 0} bình luận</p>
										</div>
									</div>
								</div>
								<div>
									<h6 className="text-uppercase text-muted fw-semibold mb-2" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>Nội dung</h6>
									<div
										className="border rounded p-3"
										style={{ maxHeight: '400px', overflowY: 'auto' }}
										dangerouslySetInnerHTML={{ __html: selectedPost.content || '<em>Chưa có nội dung</em>' }}
									/>
								</div>
							</div>
							<div className="modal-footer flex-wrap gap-2">
								<button className="btn btn-outline-secondary" onClick={closeDetailsModal}>
									Đóng
								</button>
								<button
									className="btn btn-light d-flex align-items-center gap-2"
									onClick={() => handleOpenPublicPost(selectedPost.slug)}
									disabled={!selectedPost.slug}
								>
									<i className="ph-arrow-square-out"></i>
									Mở tab mới
								</button>
								<button
									className="btn btn-success d-flex align-items-center gap-2"
									onClick={() => handleApprove(selectedPost._id, { closeDetails: true })}
									disabled={isProcessing}
								>
									<i className="ph-check"></i>
									Duyệt
								</button>
								<button
									className="btn btn-danger d-flex align-items-center gap-2"
									onClick={handleOpenRejectFromDetails}
									disabled={isProcessing}
								>
									<i className="ph-x"></i>
									Từ chối
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Reject Modal */}
			{showRejectModal && selectedPost && (
				<div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<div className="modal-dialog modal-dialog-centered">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">Từ chối bài viết</h5>
								<button
									type="button"
									className="btn-close"
									onClick={() => setShowRejectModal(false)}
									disabled={isProcessing}
								></button>
							</div>
							<div className="modal-body">
								<div className="border rounded p-3 mb-3">
									<p className="fw-semibold mb-1">{selectedPost.title}</p>
									<p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>
										Tác giả: {selectedPost.authorId?.displayName || 'Không rõ'} • {formatDateTime(selectedPost.createdAt)}
									</p>
									<p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Danh mục: {selectedPost.categoryId?.title || 'Không có danh mục'}</p>
									<div className="d-flex flex-wrap gap-2 align-items-center mt-2" style={{ fontSize: '0.9rem' }}>
										<span>Slug:</span>
										<code className="bg-light px-2 py-1 rounded">{selectedPost.slug || '—'}</code>
										{selectedPost.slug && (
											<>
												<button
													className="btn btn-link btn-sm p-0 text-decoration-none"
													onClick={() => handleCopyPostLink(selectedPost.slug)}
												>
													<i className="ph-copy-simple me-1"></i>Sao chép
												</button>
												<button
													className="btn btn-link btn-sm p-0 text-decoration-none"
													onClick={() => handleOpenPublicPost(selectedPost.slug)}
												>
													<i className="ph-arrow-square-out me-1"></i>Mở
												</button>
											</>
										)}
									</div>
								</div>
								<div className="mb-3">
									<label htmlFor="rejectionReason" className="form-label">
										Lý do từ chối <span className="text-danger">*</span>
									</label>
									<textarea
										id="rejectionReason"
										className="form-control"
										value={rejectionReason}
										onChange={(e) => setRejectionReason(e.target.value)}
										placeholder="Nhập lý do từ chối (bắt buộc)"
										rows="4"
										disabled={isProcessing}
									/>
								</div>
								<div className="alert alert-warning mb-0" style={{ fontSize: '0.9rem' }}>
									Lý do sẽ được gửi cho tác giả thông qua thông báo hệ thống.
								</div>
							</div>
							<div className="modal-footer">
								<button
									type="button"
									className="btn btn-secondary"
									onClick={() => setShowRejectModal(false)}
									disabled={isProcessing}
								>
									Hủy
								</button>
								<button
									type="button"
									className="btn btn-danger d-flex align-items-center gap-2"
									onClick={handleReject}
									disabled={isProcessing}
								>
									{isProcessing ? (
										<span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
									) : (
										<i className="ph-x"></i>
									)}
									Xác nhận từ chối
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ModerationDashboard;
