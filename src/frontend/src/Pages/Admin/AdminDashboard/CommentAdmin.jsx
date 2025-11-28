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
					<div className="row mb-4">
						<div className="col-md-3">
							<div className="card text-center">
								<div className="card-body">
									<h5>Tổng bình luận</h5>
									<h3>{stats.totalComments || 0}</h3>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card text-center">
								<div className="card-body">
									<h5>Bình luận gốc</h5>
									<h3 className="text-success">{stats.totalRootComments || 0}</h3>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card text-center">
								<div className="card-body">
									<h5>Phản hồi</h5>
									<h3 className="text-info">{stats.totalReplies || 0}</h3>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card text-center">
								<div className="card-body">
									<h5>Gần đây (7 ngày)</h5>
									<h3 className="text-warning">{stats.recentComments || 0}</h3>
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
			<div className="card mb-4">
				<div className="card-body">
					<div className="row g-3 align-items-end">
						<div className="col-md-4">
							<label className="form-label">Tìm kiếm theo nội dung</label>
							<Form.Control
								type="text"
								placeholder="Nhập từ khóa..."
								value={filters.keyword || ""}
								onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										fetchComments();
									}
								}}
							/>
						</div>
						{/* <div className="col-md-2">
							<label className="form-label">Post ID</label>
							<Form.Control
								type="text"
								placeholder="ID bài viết..."
								value={filters.postId}
								onChange={(e) => setFilters({ ...filters, postId: e.target.value })}
							/>
						</div> */}
						<div className="col-md-2">
							<label className="form-label">Sắp xếp theo</label>
							<Form.Select
								value={filters.sortBy}
								onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="likesCount">Lượt thích</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<label className="form-label">Thứ tự</label>
							<Form.Select
								value={filters.order}
								onChange={(e) => setFilters({ ...filters, order: e.target.value })}
							>
								<option value="desc">Giảm dần</option>
								<option value="asc">Tăng dần</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<button
								className="btn btn-primary w-100"
								onClick={() => {
									setFilters({ ...filters, page: 1 });
									fetchComments();
								}}
							>
								<i className="bi-search me-2"></i>
								Tìm kiếm
							</button>
						</div>
						{(filters.keyword || filters.postId || filters.userId) && (
							<div className="col-md-2">
								<button
									className="btn btn-outline-secondary "
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
										// setTimeout(() => fetchComments(), 100);
									}}
								>
									<i className="bi-x me-1"></i>
									Xóa bộ lọc
								</button>
							</div>
						)}
					</div>

					{/* Clear filters button */}

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
				<div className="card">
					<div className="card-body">
						<Table striped bordered hover responsive>
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
									<th>Nội dung</th>
									<th>Tác giả</th>
									<th>Bài viết</th>
									<th>Likes</th>
									<th>Replies</th>
									<th>Ngày tạo</th>
									<th>Hành động</th>
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
										<td>
											<div className="btn-group" role="group">
												<button
													className="btn btn-info btn-sm"
													onClick={() => handleShowModal(comment)}
												>
													Xem
												</button>
												<button
													className="btn btn-danger btn-sm"
													onClick={() => handleDelete(comment._id)}
												>
													Xóa
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</Table>

						{/* Pagination */}
						{pagination.pages > 1 && (
							<div className="d-flex justify-content-between align-items-center mt-3">
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
				<Modal.Header closeButton>
					<Modal.Title>Chi tiết bình luận</Modal.Title>
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
