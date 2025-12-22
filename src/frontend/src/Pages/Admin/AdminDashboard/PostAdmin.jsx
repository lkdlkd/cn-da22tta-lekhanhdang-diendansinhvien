import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
	getAllPostsAdmin,
	deletePost,
	togglePinPost,
	toggleLockPost,
	deleteMultiplePosts,
	movePosts,
	getPostsStats,
	getCategories,
	softDeletePostAdmin,
	restorePostAdmin,
	bulkSoftDeletePostsAdmin,
	bulkRestorePostsAdmin,
	approvePost,
	rejectPost
} from "../../../Utils/api";
import LoadingPost from "@/Components/LoadingPost";
import { Link } from "react-router-dom";

const PostAdmin = () => {
	const [posts, setPosts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedPost, setSelectedPost] = useState(null);
	const [selectedPosts, setSelectedPosts] = useState([]);
	const [stats, setStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

	// Filters (applied) and pendingFilters (UI state)
	const filterDefaults = {
		keyword: "",
		categoryId: "",
		username: "",
		pinned: "",
		locked: "",
		moderationStatus: "",
		isDeleted: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	};
	const [filters, setFilters] = useState(filterDefaults);
	const [pendingFilters, setPendingFilters] = useState(filterDefaults);

	const token = localStorage.getItem("token");
	const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");
	const buildPostUrl = (slug) => {
		if (!slug) return "";
		const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
		return `${origin}/post/${slug}`;
	};
	const getModeratorName = (moderator) => (
		moderator?.displayName || moderator?.username || "—"
	);

	// Fetch posts with filters
	const fetchPosts = async () => {
		setLoading(true);
		try {
			const params = {};
			if (filters.keyword) params.keyword = filters.keyword;
			if (filters.categoryId) params.categoryId = filters.categoryId;
			if (filters.username) params.username = filters.username;
			if (filters.pinned !== "") params.pinned = filters.pinned;
			if (filters.locked !== "") params.locked = filters.locked;
			if (filters.moderationStatus) params.moderationStatus = filters.moderationStatus;
			if (filters.isDeleted !== "") params.isDeleted = filters.isDeleted;
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;

			const data = await getAllPostsAdmin(token, params);
			setPosts(data.data || []);
			if (data.pagination) setPagination(data.pagination);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách bài viết");
		}
		setLoading(false);
	};

	// Apply filters only when clicking Search or pressing Enter
	const applyFilters = () => {
		setSelectedPosts([]);
		setFilters({ ...pendingFilters, page: 1 });
	};

	// Reset filters
	const resetFilters = () => {
		setPendingFilters(filterDefaults);
		setFilters(filterDefaults);
		setSelectedPosts([]);
		setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
	};

	// Fetch categories
	const fetchCategories = async () => {
		try {
			const data = await getCategories();
			setCategories(data.data || data);
		} catch (err) {
			console.error("Lỗi khi tải danh mục");
		}
	};

	// Pagination handlers
	const goToPage = (page) => {
		if (page < 1 || page > pagination.pages) return;
		setSelectedPosts([]);
		setFilters(prev => ({ ...prev, page }));
	};

	// Fetch statistics
	const fetchStats = async () => {
		try {
			const data = await getPostsStats(token);
			setStats(data.stats);
		} catch (err) {
			console.error("Lỗi khi tải thống kê");
		}
	};

	useEffect(() => {
		fetchPosts();
		fetchCategories();
		fetchStats();
		// eslint-disable-next-line
	}, [filters]);

	// Select all posts
	const handleSelectAll = (e) => {
		if (e.target.checked) {
			setSelectedPosts(posts.map(p => p._id));
		} else {
			setSelectedPosts([]);
		}
	};

	// Select single post
	const handleSelectPost = (postId) => {
		if (selectedPosts.includes(postId)) {
			setSelectedPosts(selectedPosts.filter(id => id !== postId));
		} else {
			setSelectedPosts([...selectedPosts, postId]);
		}
	};

	// Show post detail modal
	const handleShowModal = (post) => {
		setSelectedPost(post);
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setSelectedPost(null);
	};

	const handleOpenPublicPost = (slug) => {
		if (!slug) {
			toast.info("Bài viết chưa có đường dẫn công khai");
			return;
		}
		const url = buildPostUrl(slug);
		window.open(url || `/post/${slug}`, "_blank", "noopener,noreferrer");
	};

	// Delete post with confirmation
	const handleDelete = async (postId) => {
		const result = await Swal.fire({
			title: "Xác nhận xóa bài viết?",
			text: "Bạn có chắc muốn xóa bài viết này?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		if (result.isConfirmed) {
			try {
				await deletePost(token, postId);
				toast.success("Xóa bài viết thành công!");
				fetchPosts();
				fetchStats();
			} catch (err) {
				toast.error("Lỗi khi xóa bài viết");
			}
		}
	};

	// Toggle pin
	const handleTogglePin = async (postId) => {
		try {
			await togglePinPost(token, postId);
			toast.success("Cập nhật trạng thái ghim thành công!");
			fetchPosts();
		} catch (err) {
			toast.error("Lỗi khi cập nhật trạng thái ghim");
		}
	};

	// Toggle lock
	const handleToggleLock = async (postId) => {
		try {
			await toggleLockPost(token, postId);
			toast.success("Cập nhật trạng thái khóa thành công!");
			fetchPosts();
		} catch (err) {
			toast.error("Lỗi khi cập nhật trạng thái khóa");
		}
	};

	// Soft delete (ẩn) single
	const handleSoftDelete = async (postId) => {
		const result = await Swal.fire({
			title: "Ẩn bài viết?",
			text: "Bài viết sẽ được đánh dấu Đã ẩn và ẩn khỏi người dùng, có thể khôi phục sau.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Ẩn",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		if (result.isConfirmed) {
			try {
				await softDeletePostAdmin(token, postId);
				toast.success("Đã ẩn bài viết");
				fetchPosts();
				fetchStats();
			} catch (err) {
				toast.error("Lỗi khi ẩn bài viết");
			}
		}
	};

	// Restore single
	const handleRestore = async (postId) => {
		try {
			await restorePostAdmin(token, postId);
			toast.success("Đã khôi phục bài viết");
			fetchPosts();
			fetchStats();
		} catch (err) {
			toast.error("Lỗi khi khôi phục bài viết");
		}
	};

	const handleApprove = async (postId) => {
		try {
			await approvePost(token, postId);
			toast.success("Đã duyệt bài viết");
			fetchPosts();
			fetchStats();
		} catch (err) {
			toast.error("Không thể duyệt bài viết");
		}
	};

	const handleReject = async (postId) => {
		const { value: reason, isConfirmed } = await Swal.fire({
			title: "Lý do từ chối",
			input: "textarea",
			inputLabel: "Vui lòng nhập lý do (tuỳ chọn)",
			inputPlaceholder: "Ví dụ: Nội dung vi phạm quy định...",
			showCancelButton: true,
			confirmButtonText: "Từ chối",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});

		if (!isConfirmed) return;

		const trimmedReason = (reason || "").trim();
		if (!trimmedReason) {
			toast.warning("Vui lòng nhập lý do từ chối");
			return;
		}

		try {
			await rejectPost(token, postId, trimmedReason);
			toast.success("Đã từ chối bài viết");
			fetchPosts();
			fetchStats();
		} catch (err) {
			toast.error("Không thể từ chối bài viết");
		}
	};

	// Bulk actions
	const handleBulkAction = async (action) => {
		if (selectedPosts.length === 0) {
			toast.warning("Vui lòng chọn ít nhất một bài viết");
			return;
		}

		if (action === "delete") {
			const result = await Swal.fire({
				title: "Xác nhận",
				text: `Xóa ${selectedPosts.length} bài viết đã chọn?`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Xóa",
				cancelButtonText: "Hủy",
				customClass: { container: 'swal-on-modal' }
			});

			if (result.isConfirmed) {
				try {
					await deleteMultiplePosts(token, selectedPosts);
					toast.success("Xóa bài viết thành công!");
					setSelectedPosts([]);
					fetchPosts();
					fetchStats();
				} catch (err) {
					toast.error(`Lỗi: ${err.message}`);
				}
			}
		} else if (action === "soft-delete") {
			const result = await Swal.fire({
				title: "Xác nhận",
				text: `Ẩn ${selectedPosts.length} bài viết đã chọn?`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Ẩn",
				cancelButtonText: "Hủy",
				customClass: { container: 'swal-on-modal' }
			});
			if (result.isConfirmed) {
				try {
					await bulkSoftDeletePostsAdmin(token, selectedPosts);
					toast.success("Đã ẩn các bài viết đã chọn");
					setSelectedPosts([]);
					fetchPosts();
					fetchStats();
				} catch (err) {
					toast.error(`Lỗi: ${err.message}`);
				}
			}
		} else if (action === "restore") {
			try {
				await bulkRestorePostsAdmin(token, selectedPosts);
				toast.success("Đã khôi phục các bài viết đã chọn");
				setSelectedPosts([]);
				fetchPosts();
				fetchStats();
			} catch (err) {
				toast.error(`Lỗi: ${err.message}`);
			}
		} else if (action === "move") {
			const { value: categoryId } = await Swal.fire({
				title: "Chuyển sang danh mục",
				input: "select",
				inputOptions: categories.reduce((acc, cat) => {
					acc[cat._id] = cat.title;
					return acc;
				}, {}),
				showCancelButton: true,
				confirmButtonText: "Chuyển",
				cancelButtonText: "Hủy",
				customClass: { container: 'swal-on-modal' }
			});

			if (categoryId) {
				try {
					await movePosts(token, selectedPosts, categoryId);
					toast.success("Chuyển bài viết thành công!");
					setSelectedPosts([]);
					fetchPosts();
				} catch (err) {
					toast.error(`Lỗi: ${err.message}`);
				}
			}
		}
	};

	const statCards = stats ? [
		{ title: "Tổng bài viết", value: stats.totalPosts, accent: "text-primary" },
		// { title: "Đã xuất bản", value: stats.publishedPosts, accent: "text-success" },
		// { title: "Bản nháp", value: stats.draftPosts, accent: "text-warning" },
		// { title: "Đã ghim", value: stats.pinnedPosts, accent: "text-primary" },
		{ title: "Đã khóa", value: stats.lockedPosts, accent: "text-secondary" },
		{ title: "Bài mới (7 ngày)", value: stats.recentPosts, accent: "text-info" }
	].filter(card => card.value !== undefined) : [];

	const topCategories = stats?.postsByCategory?.slice(0, 5) || [];

	const renderStatusBadges = (post) => (
		<div className="d-flex flex-wrap gap-1">
			{post.isDeleted && <span className="badge bg-danger">Đã ẩn</span>}
			{post.isDraft && <span className="badge bg-warning text-dark">Bản nháp</span>}
			{!post.isDraft && !post.isDeleted && <span className="badge bg-success">Công khai</span>}
			{post.pinned && <span className="badge bg-primary">Ghim</span>}
			{post.locked && <span className="badge bg-secondary">Khóa</span>}
		</div>
	);

	const renderModerationBadge = (post) => {
		const moderatorName = post.moderatedBy?.displayName || post.moderatedBy?.username;
		const moderatedAt = post.moderatedAt ? formatDateTime(post.moderatedAt) : null;
		const rejectionReason = post.rejectionReason;

		switch (post.moderationStatus) {
			case "approved":
				return (
					<div className="d-flex flex-column gap-1">
						<span className="badge bg-success">Đã duyệt</span>
						{moderatorName && <small className="text-muted">Bởi {moderatorName}</small>}
						{moderatedAt && <small className="text-muted">{moderatedAt}</small>}
					</div>
				);
			case "rejected":
				return (
					<div className="d-flex flex-column gap-1">
						<span className="badge bg-danger">Đã từ chối</span>
						{moderatorName && <small className="text-muted">Bởi {moderatorName}</small>}
						{moderatedAt && <small className="text-muted">{moderatedAt}</small>}
						{rejectionReason && <small className="text-danger">Lý do: {rejectionReason}</small>}
					</div>
				);
			default:
				return (
					<div className="d-flex flex-column gap-1">
						<span className="badge bg-warning text-dark">Chờ duyệt</span>
						<small className="text-muted">Chưa có người duyệt</small>
					</div>
				);
		}
	};

	return (
		<div className="">
			<h2 className="mb-4">Quản lý bài viết</h2>

			{/* Statistics */}
			{stats && (
				<>
					<div className="row g-3 mb-4">
						<div className="col-6 col-md-4">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-file-earmark-text text-primary" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Tổng bài viết</p>
										<h3 className="mb-0 fw-bold">{stats.totalPosts || 0}</h3>
									</div>
								</div>
							</div>
						</div>
						<div className="col-6 col-md-4">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-lock text-secondary" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Đã khóa</p>
										<h3 className="mb-0 fw-bold text-secondary">{stats.lockedPosts || 0}</h3>
									</div>
								</div>
							</div>
						</div>
						<div className="col-6 col-md-4">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-info bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-clock-history text-info" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Bài mới (7 ngày)</p>
										<h3 className="mb-0 fw-bold text-info">{stats.recentPosts || 0}</h3>
									</div>
								</div>
							</div>
						</div>
					</div>
					{topCategories.length > 0 && (
						<div className="card border-0 shadow-sm mb-4">
							<div className="card-header bg-white border-0 pb-0">
								<h5 className="mb-0 d-flex align-items-center gap-2">
									<i className="bi-bar-chart text-primary"></i>
									Danh mục nhiều bài viết nhất
								</h5>
							</div>
							<div className="card-body">
								<div className="table-responsive">
									<Table size="sm" className="mb-0">
										<thead>
											<tr>
												<th>Danh mục</th>
												<th className="text-end">Số bài</th>
											</tr>
										</thead>
										<tbody>
											{topCategories.map(cat => (
												<tr key={cat.categoryId}>
													<td>{cat.categoryTitle}</td>
													<td className="text-end">{cat.postsCount}</td>
												</tr>
											))}
										</tbody>
									</Table>
								</div>
							</div>
						</div>
					)}
				</>
			)}

			{/* Filters */}
			<div className="card border-0 shadow-sm mb-4">
				<div className="card-body p-3 p-md-4">
					{/* Row 1: Tìm kiếm chính */}
					<div className="row g-2 g-md-3 align-items-end">
						<div className="col-12 col-md-4">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-search me-1"></i>Tìm kiếm nội dung
							</label>
							<div className="input-group">
								<span className="input-group-text bg-light border-0">
									<i className="bi-search text-muted"></i>
								</span>
								<Form.Control
									type="text"
									className="border-0 bg-light"
									placeholder="Tiêu đề, nội dung..."
									value={pendingFilters.keyword}
									onChange={(e) => setPendingFilters({ ...pendingFilters, keyword: e.target.value })}
									onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
									style={{ fontSize: '0.9rem' }}
								/>
							</div>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-folder me-1"></i>Danh mục
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.categoryId}
								onChange={(e) => setPendingFilters({ ...pendingFilters, categoryId: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="">Tất cả</option>
								{categories.map(cat => (
									<option key={cat._id} value={cat._id}>{cat.title}</option>
								))}
							</Form.Select>
						</div>
						<div className="col-6 col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-person me-1"></i>Tác giả
							</label>
							<Form.Control
								type="text"
								className="border-0 bg-light"
								placeholder="Nhập username..."
								value={pendingFilters.username}
								onChange={(e) => setPendingFilters({ ...pendingFilters, username: e.target.value })}
								onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
								style={{ fontSize: '0.9rem' }}
							/>
						</div>
						<div className="col-12 col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-check-circle me-1"></i>Trạng thái duyệt
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.moderationStatus}
								onChange={(e) => setPendingFilters({ ...pendingFilters, moderationStatus: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="">Tất cả</option>
								<option value="pending">Chờ duyệt</option>
								<option value="approved">Đã duyệt</option>
								<option value="rejected">Đã từ chối</option>
							</Form.Select>
						</div>
					</div>

					{/* Row 2: Bộ lọc nâng cao và sắp xếp */}
					<div className="row g-2 g-md-3 mt-2 align-items-end">
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-pin-angle me-1"></i>Ghim
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.pinned}
								onChange={(e) => setPendingFilters({ ...pendingFilters, pinned: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="">Tất cả</option>
								<option value="true">Đã ghim</option>
								<option value="false">Chưa ghim</option>
							</Form.Select>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-lock me-1"></i>Khóa
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.locked}
								onChange={(e) => setPendingFilters({ ...pendingFilters, locked: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="">Tất cả</option>
								<option value="true">Đã khóa</option>
								<option value="false">Chưa khóa</option>
							</Form.Select>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-eye-slash me-1"></i>Hiển thị
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.isDeleted}
								onChange={(e) => setPendingFilters({ ...pendingFilters, isDeleted: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="">Tất cả</option>
								<option value="false">Đang hiển thị</option>
								<option value="true">Đã ẩn</option>
							</Form.Select>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-sort-down me-1"></i>Sắp xếp
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.sortBy}
								onChange={(e) => setPendingFilters({ ...pendingFilters, sortBy: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="views">Lượt xem</option>
								<option value="likesCount">Lượt thích</option>
								<option value="commentsCount">Bình luận</option>
							</Form.Select>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-arrows-expand me-1"></i>Thứ tự
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={pendingFilters.order}
								onChange={(e) => setPendingFilters({ ...pendingFilters, order: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="desc">Mới nhất</option>
								<option value="asc">Cũ nhất</option>
							</Form.Select>
						</div>
						<div className="col-12 col-md-2">
							<div className="d-flex gap-2">
								<button 
									className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-1" 
									onClick={applyFilters} 
									type="button" 
									style={{ fontSize: '0.85rem' }}
								>
									<i className="bi-search"></i>
									<span className="d-none d-md-inline">Tìm</span>
								</button>
								<button 
									className="btn btn-outline-secondary d-flex align-items-center justify-content-center" 
									onClick={resetFilters} 
									type="button" 
									style={{ fontSize: '0.85rem', minWidth: '45px' }}
									title="Đặt lại bộ lọc"
								>
									<i className="bi-arrow-clockwise"></i>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="mb-3">
				<div className="d-flex justify-content-between align-items-center mb-2">
					<small className="text-muted">
						Hiển thị {posts.length} / {pagination.total} bài viết
					</small>
					<div className="d-flex align-items-center">
						<span className="me-2">Mỗi trang:</span>
						<Form.Select
							size="sm"
							style={{ width: 100 }}
							value={filters.limit}
							onChange={(e) => {
								const newLimit = Number(e.target.value) || 20;
								setSelectedPosts([]);
								setFilters(prev => ({ ...prev, limit: newLimit, page: 1 }));
							}}
						>
							<option value="10">10</option>
							<option value="20">20</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</Form.Select>
					</div>
				</div>
			</div>
			{/* Bulk actions */}
			{selectedPosts.length > 0 && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<span>Đã chọn {selectedPosts.length} bài viết</span>
					<div>
						<button className="btn btn-warning btn-sm me-2" onClick={() => handleBulkAction("soft-delete")}>
							Ẩn
						</button>
						<button className="btn btn-success btn-sm me-2" onClick={() => handleBulkAction("restore")}>
							Khôi phục
						</button>
						<button className="btn btn-danger btn-sm me-2" onClick={() => handleBulkAction("delete")}>
							Xóa vĩnh viễn
						</button>
						<button className="btn btn-primary btn-sm" onClick={() => handleBulkAction("move")}>
							Chuyển danh mục
						</button>
					</div>
				</div>
			)}

			{loading ? (
				<LoadingPost count={5} />
			) : (
				<div className="card border-0 shadow-sm">
					<div className="card-body p-0">
						<div className="table-responsive">
							<Table className="mb-0" striped hover>
								<thead>
									<tr>
										<th>
											<Form.Check
												type="checkbox"
												onChange={handleSelectAll}
												checked={selectedPosts.length === posts.length && posts.length > 0}
											/>
										</th>
										<th>STT</th>
										<th>Hành động</th>
										<th>Tiêu đề</th>
										<th>Tác giả</th>
										<th>Danh mục</th>
										<th>thống kê</th>
										<th>Ngày tạo</th>
										<th>Trạng thái</th>
										<th>Duyệt</th>
									</tr>
								</thead>
								<tbody>
									{posts.map((post, idx) => (
										<tr key={post._id}>
											<td>
												<Form.Check
													type="checkbox"
													checked={selectedPosts.includes(post._id)}
													onChange={() => handleSelectPost(post._id)}
												/>
											</td>
											<td>{(filters.page - 1) * filters.limit + idx + 1}</td>
											<td>
												<div className="dropdown">
													<button
														className="btn btn-primary dropdown-toggle"
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
																onClick={() => handleShowModal(post)}
															>
																<i className="bi bi-eye me-2 text-info"></i>
																Xem chi tiết
															</button>
														</li>
														<li>
															<button
																className="dropdown-item"
																onClick={() => handleOpenPublicPost(post.slug)}
																disabled={!post.slug}
															>
																<i className="bi bi-link-45deg me-2 text-primary"></i>
																Mở bài viết
															</button>
														</li>
														<li><hr className="dropdown-divider" /></li>
														<li>
															<button
																className="dropdown-item"
																onClick={() => handleTogglePin(post._id)}
															>
																<i className={`bi ${post.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'} me-2 text-warning`}></i>
																{post.pinned ? 'Bỏ ghim' : 'Ghim bài viết'}
															</button>
														</li>
														<li>
															<button
																className="dropdown-item"
																onClick={() => handleToggleLock(post._id)}
															>
																<i className={`bi ${post.locked ? 'bi-unlock' : 'bi-lock'} me-2 text-secondary`}></i>
																{post.locked ? 'Mở khóa' : 'Khóa bài viết'}
															</button>
														</li>
														{post.moderationStatus === "pending" && (
															<>
																<li><hr className="dropdown-divider" /></li>
																<li>
																	<button
																		className="dropdown-item text-success"
																		onClick={() => handleApprove(post._id)}
																	>
																		<i className="bi bi-check-circle me-2"></i>
																		Duyệt bài viết
																	</button>
																</li>
																<li>
																	<button
																		className="dropdown-item text-danger"
																		onClick={() => handleReject(post._id)}
																	>
																		<i className="bi bi-x-circle me-2"></i>
																		Từ chối
																	</button>
																</li>
															</>
														)}
														<li><hr className="dropdown-divider" /></li>
														{post.isDeleted ? (
															<li>
																<button
																	className="dropdown-item text-success"
																	onClick={() => handleRestore(post._id)}
																>
																	<i className="bi bi-arrow-counterclockwise me-2"></i>
																	Khôi phục
																</button>
															</li>
														) : (
															<li>
																<button
																	className="dropdown-item text-warning"
																	onClick={() => handleSoftDelete(post._id)}
																>
																	<i className="bi bi-eye-slash me-2"></i>
																	Ẩn bài viết
																</button>
															</li>
														)}
														<li>
															<button
																className="dropdown-item text-danger"
																onClick={() => handleDelete(post._id)}
															>
																<i className="bi bi-trash me-2"></i>
																Xóa vĩnh viễn
															</button>
														</li>
													</ul>
												</div>
											</td>
											<td className="text-break">
												<div className="fw-semibold">{post.title}</div>
												{post.slug && <small className="text-muted d-block">/{post.slug}</small>}
												{post.tags && post.tags.length > 0 && (
													<div className="d-flex flex-wrap gap-1 mt-1">
														{post.tags.slice(0, 3).map((tag, tagIdx) => (
															<span key={tagIdx} className="badge bg-light text-dark border">#{tag}</span>
														))}
														{post.tags.length > 3 && (
															<span className="badge bg-light text-dark">+{post.tags.length - 3}</span>
														)}
													</div>
												)}
											</td>
											<td>
												<ul>
													<li className="fw-semibold"><div className="fw-semibold"><img
														src={post.authorId?.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
														alt={post.authorId?.username}
														style={{ width: "40px", height: "40px", borderRadius: "50%" }}
													/> - {post.authorId?.displayName || post.authorId?.username || "N/A"}</div></li>
													<li className="fw-semibold">Username: {post.authorId?.username || "N/A"}</li>
												</ul>


											</td>
											<td>{post.categoryId?.title || "N/A"}</td>
											<td>
												<ul>
													<li>Lượt xem: {post.views || 0}</li>
													<li>Lượt thích: {post.likesCount || 0}</li>
													<li>Bình luận: {post.commentsCount || 0}</li>
												</ul>
											</td>
											{/* <td>{post.views || 0}</td>
										<td>{post.likesCount || 0}</td>
										<td>{post.commentsCount || 0}</td> */}
											<td>{formatDateTime(post.createdAt)}</td>
											<td>{renderStatusBadges(post)}</td>
											<td>{renderModerationBadge(post)}</td>

										</tr>
									))}
								</tbody>
							</Table>
						</div>

						{/* Pagination */}
						{pagination.pages > 1 && (
							<div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 p-3 border-top">
								<div>
									<small className="text-muted">
										Hiển thị {posts.length} / {pagination.total} bài viết
									</small>
								</div>
								<Pagination className="mb-0">
									<Pagination.First onClick={() => goToPage(1)} disabled={pagination.page === 1} />
									<Pagination.Prev onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} />
									{Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => {
										const pageNum = p;
										// Hiển thị trang đầu, cuối và 2 trang gần current
										if (
											pageNum === 1 ||
											pageNum === pagination.pages ||
											(pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
										) {
											return (
												<Pagination.Item
													key={pageNum}
													active={pageNum === pagination.page}
													onClick={() => goToPage(pageNum)}
												>
													{pageNum}
												</Pagination.Item>
											);
										} else if (
											pageNum === pagination.page - 2 ||
											pageNum === pagination.page + 2
										) {
											return <Pagination.Ellipsis key={pageNum} disabled />;
										}
										return null;
									})}
									<Pagination.Next onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.pages} />
									<Pagination.Last onClick={() => goToPage(pagination.pages)} disabled={pagination.page === pagination.pages} />
								</Pagination>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Modal hiển thị thông tin bài viết */}
			<Modal show={showModal} onHide={handleCloseModal} centered size="lg">
				<Modal.Header closeButton className="border-0 pb-0">
					<Modal.Title className="d-flex align-items-center gap-2">
						<i className="bi-info-circle text-primary"></i>
						Thông tin bài viết
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedPost && (
						<div>
							<h5>{selectedPost.title}</h5>
							<hr />
							<div className="row mb-3">
								<div className="col-md-6">
									<p><strong>Tác giả:</strong> {selectedPost.authorId?.username || "N/A"}</p>
									<p><strong>Danh mục:</strong> {selectedPost.categoryId?.title || "N/A"}</p>
									<p><strong>Ngày tạo:</strong> {formatDateTime(selectedPost.createdAt)}</p>
								</div>
								<div className="col-md-6">
									<p><strong>Lượt xem:</strong> {selectedPost.views || 0}</p>
									<p><strong>Số bình luận:</strong> {selectedPost.commentsCount || 0}</p>
									<p><strong>Số lượt thích:</strong> {selectedPost.likesCount || 0}</p>
								</div>
							</div>
							<div className="mb-3">
								<strong>Trạng thái:</strong>
								{selectedPost.pinned && <span className="badge bg-warning ms-2">Ghim</span>}
								{selectedPost.locked && <span className="badge bg-secondary ms-2">Khóa</span>}
								{selectedPost.isDeleted && <span className="badge bg-danger ms-2">Đã xóa</span>}
								{selectedPost.isDraft ? (
									<span className="badge bg-warning ms-2">Bản nháp</span>
								) : (
									<span className="badge bg-success ms-2">Công khai</span>
								)}
							</div>
							<div className="mb-3">
								<strong>Trạng thái duyệt:</strong>
								<div className="mt-2">{renderModerationBadge(selectedPost)}</div>
							</div>
							<div className="row mb-3">
								<div className="col-md-6">
									<p>
										<strong>Slug:</strong> {selectedPost.slug || "—"}
										{selectedPost.slug && (
											<Link
												to={`/post/${selectedPost.slug}`}
												target="_blank"
												rel="noreferrer"
												className="ms-2"
											>
												Xem bài viết
											</Link>
										)}
									</p>
								</div>
								<div className="col-md-6">
									<p><strong>Cập nhật:</strong> {formatDateTime(selectedPost.updatedAt)}</p>
								</div>
							</div>
							{selectedPost.moderationStatus !== "pending" && (
								<div className="row mb-3">
									<div className="col-md-6">
										<p><strong>Người duyệt:</strong> {getModeratorName(selectedPost.moderatedBy)}</p>
									</div>
									<div className="col-md-6">
										<p><strong>Thời gian duyệt:</strong> {formatDateTime(selectedPost.moderatedAt)}</p>
									</div>
								</div>
							)}
							{selectedPost.rejectionReason && (
								<div className="alert alert-warning">
									<strong>Lý do từ chối:</strong> {selectedPost.rejectionReason}
								</div>
							)}
							<div>
								<strong>Nội dung:</strong>
								<div
									style={{
										maxHeight: "300px",
										overflow: "auto",
										padding: "10px",
										background: "#f8f9fa",
										borderRadius: "5px",
										marginTop: "10px"
									}}
								>
									{selectedPost.content}
								</div>
							</div>
							{selectedPost.attachments && selectedPost.attachments.length > 0 && (
								<div className="mt-3">
									<strong>Tệp đính kèm:</strong>
									<ul className="mt-2">
										{selectedPost.attachments.map(att => (
											<li key={att._id}>
												<Link to={att.storageUrl} target="_blank" rel="noreferrer">
													{att.filename}
												</Link>
											</li>
										))}
									</ul>
								</div>
							)}
							{selectedPost.tags && selectedPost.tags.length > 0 && (
								<div className="mt-3">
									<strong>Tags:</strong>
									<div className="mt-2">
										{selectedPost.tags.map((tag, idx) => (
											<span key={idx} className="badge bg-info me-2">{tag}</span>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<button className="btn btn-secondary" onClick={handleCloseModal}>
						Đóng
					</button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};

export default PostAdmin;
