import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
	getAllCommentsAdmin,
	deleteCommentAdmin,
	deleteMultipleComments,
	getCommentsStats
} from "../../../Utils/api";
import { Link } from "react-router-dom";
import LoadingPost from "@/Components/LoadingPost";

const CommentAdmin = () => {
	const [comments, setComments] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedComment, setSelectedComment] = useState(null);
	const [selectedComments, setSelectedComments] = useState([]);
	const [stats, setStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

	// Filters
	const [filters, setFilters] = useState({
		keyword: "",
		postId: "",
		userId: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	});

	const token = localStorage.getItem("token");

	// Fetch comments with filters
	const fetchComments = async () => {
		setLoading(true);
		try {
			const params = {};
			if (filters.keyword) params.keyword = filters.keyword || "";
			// if (filters.postId) params.postId = filters.postId;
			if (filters.userId) params.userId = filters.userId || "";
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;

			const data = await getAllCommentsAdmin(token, params);
			setComments(data.data || []);
			setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
		} catch (err) {
			toast.error("Lỗi khi tải danh sách bình luận");
		}
		setLoading(false);
	};

	// Fetch statistics
	const fetchStats = async () => {
		try {
			const data = await getCommentsStats(token);
			setStats(data.stats);
		} catch (err) {
			console.error("Lỗi khi tải thống kê");
		}
	};

	useEffect(() => {
		fetchComments();
		fetchStats();
		// eslint-disable-next-line
	}, []);

	// Re-fetch when filters change (especially pagination)
	useEffect(() => {
		fetchComments();
		// eslint-disable-next-line
	}, [filters.page, filters.limit, filters.sortBy, filters.order]);

	// Debounced search đã tắt - người dùng phải nhấn nút Tìm kiếm
	// useEffect(() => {
	// 	if (filters.keyword === "" || filters.keyword.length < 2) {
	// 		return;
	// 	}
	// 	const timer = setTimeout(() => {
	// 		fetchComments();
	// 	}, 500);
	// 	return () => clearTimeout(timer);
	// 	// eslint-disable-next-line
	// }, [filters.keyword]);

	// Handle manual search
	const handleSearch = () => {
		setFilters({ ...filters, page: 1 });
		fetchComments();
	};

	// Select all comments
	const handleSelectAll = (e) => {
		if (e.target.checked) {
			setSelectedComments(comments.map(c => c._id));
		} else {
			setSelectedComments([]);
		}
	};

	// Select single comment
	const handleSelectComment = (commentId) => {
		if (selectedComments.includes(commentId)) {
			setSelectedComments(selectedComments.filter(id => id !== commentId));
		} else {
			setSelectedComments([...selectedComments, commentId]);
		}
	};

	// Show comment detail modal
	const handleShowModal = (comment) => {
		setSelectedComment(comment);
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setSelectedComment(null);
	};

	// Delete comment with confirmation (cascade delete)
	const handleDelete = async (commentId) => {
		const result = await Swal.fire({
			title: "Xác nhận xóa bình luận?",
			text: "Bình luận và tất cả các reply sẽ bị xóa!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		if (result.isConfirmed) {
			try {
				await deleteCommentAdmin(token, commentId);
				toast.success("Xóa bình luận thành công!");
				fetchComments();
				fetchStats();
			} catch (err) {
				toast.error("Lỗi khi xóa bình luận");
			}
		}
	};

	// Bulk delete
	const handleBulkDelete = async () => {
		if (selectedComments.length === 0) {
			toast.warning("Vui lòng chọn ít nhất một bình luận");
			return;
		}

		const result = await Swal.fire({
			title: "Xác nhận",
			text: `Xóa ${selectedComments.length} bình luận đã chọn?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});

		if (result.isConfirmed) {
			try {
				await deleteMultipleComments(token, selectedComments);
				toast.success("Xóa bình luận thành công!");
				setSelectedComments([]);
				fetchComments();
				fetchStats();
			} catch (err) {
				toast.error(`Lỗi: ${err.message}`);
			}
		}
	};

	return (
		<div className="">
			<h2 className="mb-4">Quản lý bình luận</h2>

			{/* Statistics */}
			{stats && (
				<>
					<div className="row g-3 mb-4">
						<div className="col-6 col-md-3">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-chat-dots text-primary" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Tổng bình luận</p>
										<h3 className="mb-0 fw-bold">{stats.totalComments || 0}</h3>
									</div>
								</div>
							</div>
						</div>
						<div className="col-6 col-md-3">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-chat-left-text text-success" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Bình luận gốc</p>
										<h3 className="mb-0 fw-bold text-success">{stats.totalRootComments || 0}</h3>
									</div>
								</div>
							</div>
						</div>
						<div className="col-6 col-md-3">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-info bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-reply-all text-info" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Phản hồi</p>
										<h3 className="mb-0 fw-bold text-info">{stats.totalReplies || 0}</h3>
									</div>
								</div>
							</div>
						</div>
						<div className="col-6 col-md-3">
							<div className="card border-0 shadow-sm h-100">
								<div className="card-body d-flex align-items-center gap-3">
									<div className="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
										<i className="bi-clock-history text-warning" style={{ fontSize: '1.5rem' }}></i>
									</div>
									<div>
										<p className="text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Gần đây (7 ngày)</p>
										<h3 className="mb-0 fw-bold text-warning">{stats.recentComments || 0}</h3>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Top Commenters */}
					{stats.topCommenters && stats.topCommenters.length > 0 && (
						<div className="card mb-4">
							<div className="card-header">
								<h5 className="mb-0">
									<i className="bi-trophy me-2"></i>
									Top người bình luận nhiều nhất
								</h5>
							</div>
							<div className="card-body">
								<div className="row g-3">
									{stats.topCommenters.slice(0, 5).map((user, idx) => (
										<div className="col-md-6 col-lg-4" key={user._id}>
											<div className="d-flex align-items-center p-3 bg-light rounded">
												<div className="position-relative me-3">
													<img
														src={user.avatarUrl || 'https://via.placeholder.com/50'}
														alt={user.username}
														className="rounded-circle"
														style={{ width: 50, height: 50, objectFit: 'cover' }}
													/>
													{idx < 3 && (
														<span
															className={`position-absolute top-0 start-0 badge rounded-pill ${idx === 0 ? 'bg-warning' : idx === 1 ? 'bg-secondary' : 'bg-danger'
																}`}
															style={{ fontSize: '10px' }}
														>
															#{idx + 1}
														</span>
													)}
												</div>
												<div className="flex-grow-1">
													<div className="fw-bold">{user.displayName || user.username}</div>
													<small className="text-muted">@{user.username}</small>
													<div className="mt-1">
														<span className="badge bg-primary">
															{user.commentsCount} bình luận
														</span>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Comments by Month Chart */}
					{stats.commentsByMonth && stats.commentsByMonth.length > 0 && (
						<div className="card mb-4">
							<div className="card-header">
								<h5 className="mb-0">
									<i className="bi-calendar me-2"></i>
									Thống kê theo tháng
								</h5>
							</div>
							<div className="card-body">
								<div className="table-responsive">
									<table className="table table-sm table-hover">
										<thead>
											<tr>
												<th>Tháng/Năm</th>
												<th>Số lượng</th>
												<th>Biểu đồ</th>
											</tr>
										</thead>
										<tbody>
											{stats.commentsByMonth.map((item) => {
												const maxCount = Math.max(...stats.commentsByMonth.map(i => i.count));
												const percentage = (item.count / maxCount) * 100;
												return (
													<tr key={`${item._id.year}-${item._id.month}`}>
														<td>Tháng {item._id.month}/{item._id.year}</td>
														<td><strong>{item.count}</strong></td>
														<td>
															<div className="progress" style={{ height: '20px' }}>
																<div
																	className="progress-bar bg-info"
																	role="progressbar"
																	style={{ width: `${percentage}%` }}
																	aria-valuenow={item.count}
																	aria-valuemin="0"
																	aria-valuemax={maxCount}
																>
																	{item.count}
																</div>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
				</>
			)}

			{/* Filters */}
			<div className="card border-0 shadow-sm mb-4">
				<div className="card-body p-3 p-md-4">
					<div className="row g-2 g-md-3 align-items-end">
						<div className="col-12 col-md-5">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-search me-1"></i>Tìm kiếm theo nội dung
							</label>
							<div className="input-group">
								<span className="input-group-text bg-light border-0">
									<i className="bi-search text-muted"></i>
								</span>
								<Form.Control
									type="text"
									className="border-0 bg-light"
									placeholder="Nhập từ khóa..."
									value={filters.keyword || ""}
									onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
									onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
									style={{ fontSize: '0.9rem' }}
								/>
								<button
									className="btn btn-primary"
									onClick={handleSearch}
									style={{ fontSize: '0.9rem' }}
								>
									<i className="bi-search me-1"></i>
									Tìm kiếm
								</button>
							</div>
						</div>
						<div className="col-6 col-md-3">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-sort-alpha-down me-1"></i>Sắp xếp theo
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={filters.sortBy}
								onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="likesCount">Lượt thích</option>
							</Form.Select>
						</div>
						<div className="col-6 col-md-2">
							<label className="form-label text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
								<i className="bi-arrows-down-up me-1"></i>Thứ tự
							</label>
							<Form.Select
								className="border-0 bg-light"
								value={filters.order}
								onChange={(e) => setFilters({ ...filters, order: e.target.value })}
								style={{ fontSize: '0.9rem' }}
							>
								<option value="desc">Giảm dần</option>
								<option value="asc">Tăng dần</option>
							</Form.Select>
						</div>
						{(filters.keyword || filters.sortBy !== "createdAt" || filters.order !== "desc") && (
							<div className="col-12 col-md-2">
								<button
									className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
									onClick={() => {
										setFilters({
											keyword: "",
											postId: "",
											userId: "",
											page: 1,
											limit: 20,
											sortBy: "createdAt",
											order: "desc"
										});
									}}
									style={{ fontSize: '0.85rem' }}
								>
									<i className="bi-x-circle"></i>
									<span className="d-none d-sm-inline">Xóa lọc</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Bulk actions */}
			{selectedComments.length > 0 && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<span>Đã chọn {selectedComments.length} bình luận</span>
					<div>
						<button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
							Xóa tất cả
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
											checked={selectedComments.length === comments.length && comments.length > 0}
										/>
									</th>
									<th>STT</th>
									<th>Hành động</th>
									<th>Nội dung</th>
									<th>Tác giả</th>
									<th>Bài viết</th>
									<th>Lượt thích</th>
									<th>Trả lời</th>
									<th>Ngày tạo</th>
								</tr>
							</thead>
							<tbody>
								{comments.map((comment, idx) => (
									<tr key={comment._id}>
										<td>
											<Form.Check
												type="checkbox"
												checked={selectedComments.includes(comment._id)}
												onChange={() => handleSelectComment(comment._id)}
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
															onClick={() => handleShowModal(comment)}
														>
															<i className="bi bi-eye me-2 text-info"></i>
															Xem chi tiết
														</button>
													</li>
													<li><hr className="dropdown-divider" /></li>
													<li>
														<button
															className="dropdown-item text-danger"
															onClick={() => handleDelete(comment._id)}
														>
															<i className="bi bi-trash me-2"></i>
															Xóa
														</button>
													</li>
												</ul>
											</div>
										</td>
										<td>
											<div style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
												{comment.content}
											</div>
											{comment.parentId && <span className="badge bg-info ms-2">Reply</span>}
										</td>
										<td>{comment.authorId?.username || "N/A"}</td>
										<td>
											{comment.postId ? (
												<Link
													to={`/post/${comment.postId.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-decoration-none"
													title={comment.postId.title}
												>
													<div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{comment.postId.title}
													</div>
													<i className="bi-link-45deg ms-1" style={{ fontSize: '12px' }}></i>
												</Link>
											) : (
												<span className="text-muted">Bài viết đã xóa</span>
											)}
										</td>
										<td>{comment.likesCount || 0}</td>
										<td>{comment.repliesCount || 0}</td>
										<td>{new Date(comment.createdAt).toLocaleDateString()}</td>

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
										Hiển thị {comments.length} / {pagination.total} bình luận
									</small>
								</div>
								<Pagination className="mb-0">
									<Pagination.First
										disabled={pagination.page === 1}
										onClick={() => setFilters({ ...filters, page: 1 })}
									/>
									<Pagination.Prev
										disabled={pagination.page === 1}
										onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
									/>

									{[...Array(pagination.pages)].map((_, idx) => {
										const pageNum = idx + 1;
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
													onClick={() => setFilters({ ...filters, page: pageNum })}
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

									<Pagination.Next
										disabled={pagination.page === pagination.pages}
										onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
									/>
									<Pagination.Last
										disabled={pagination.page === pagination.pages}
										onClick={() => setFilters({ ...filters, page: pagination.pages })}
									/>
								</Pagination>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Modal hiển thị thông tin bình luận */}
			<Modal show={showModal} onHide={handleCloseModal} centered size="lg">
				<Modal.Header closeButton className="border-0 pb-0">
					<Modal.Title className="d-flex align-items-center gap-2">
						<i className="bi-info-circle text-primary"></i>
						Chi tiết bình luận
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedComment && (
						<div>
							<div className="row mb-3">
								<div className="col-md-6">
									<p><strong>Tác giả:</strong> {selectedComment.authorId?.username || "N/A"}</p>
									<p><strong>Email:</strong> {selectedComment.authorId?.email || "N/A"}</p>
								</div>
								<div className="col-md-6">
									<p><strong>Ngày tạo:</strong> {new Date(selectedComment.createdAt).toLocaleString()}</p>
									<p>
										<strong>Loại:</strong>
										{selectedComment.parentId ? (
											<span className="badge bg-info ms-2">Phản hồi</span>
										) : (
											<span className="badge bg-primary ms-2">Bình luận gốc</span>
										)}
									</p>
								</div>
							</div>
							<div className="mb-3">
								<p>
									<strong>Bài viết:</strong>{" "}
									{selectedComment.postId ? (
										<Link
											to={`/post/${selectedComment.postId.slug}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary"
										>
											{selectedComment.postId.title}
											<i className="bi-link-45deg ms-2"></i>
										</Link>
									) : (
										<span className="text-muted">Bài viết đã xóa</span>
									)}
								</p>
							</div>
							<div className="mb-3">
								<strong>Nội dung:</strong>
								<div
									style={{
										padding: "10px",
										background: "#f8f9fa",
										borderRadius: "5px",
										marginTop: "10px"
									}}
								>
									{selectedComment.content}
								</div>
							</div>
							<div className="row">
								<div className="col-md-6">
									<p><strong>Lượt thích:</strong> {selectedComment.likesCount || 0}</p>
								</div>
								<div className="col-md-6">
									<p><strong>Số phản hồi:</strong> {selectedComment.repliesCount || 0}</p>
								</div>
							</div>
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

export default CommentAdmin;
