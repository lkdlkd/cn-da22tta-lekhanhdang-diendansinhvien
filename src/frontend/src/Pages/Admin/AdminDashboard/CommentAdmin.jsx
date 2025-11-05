import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { 
	getAllCommentsAdmin, 
	deleteCommentAdmin,
	deleteMultipleComments,
	getCommentsStats
} from "../../../Utils/api";

const CommentAdmin = () => {
	const [comments, setComments] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedComment, setSelectedComment] = useState(null);
	const [selectedComments, setSelectedComments] = useState([]);
	const [stats, setStats] = useState(null);
	
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
			if (filters.keyword) params.keyword = filters.keyword;
			if (filters.postId) params.postId = filters.postId;
			if (filters.userId) params.userId = filters.userId;
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;
			
			const data = await getAllCommentsAdmin(token, params);
			setComments(data.data || []);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách bình luận");
		}
		setLoading(false);
	};
	
	// Fetch statistics
	const fetchStats = async () => {
		try {
			const data = await getCommentsStats(token);
			setStats(data);
		} catch (err) {
			console.error("Lỗi khi tải thống kê");
		}
	};
	
	useEffect(() => {
		fetchComments();
		fetchStats();
		// eslint-disable-next-line
	}, [filters]);
	
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
								<h3 className="text-success">{(stats.totalComments || 0) - (stats.totalReplies || 0)}</h3>
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
			)}
			
			{/* Filters */}
			<div className="card mb-4">
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-6">
							<Form.Control
								type="text"
								placeholder="Tìm kiếm theo nội dung..."
								value={filters.keyword}
								onChange={(e) => setFilters({...filters, keyword: e.target.value, page: 1})}
							/>
						</div>
						<div className="col-md-3">
							<Form.Control
								type="text"
								placeholder="Post ID..."
								value={filters.postId}
								onChange={(e) => setFilters({...filters, postId: e.target.value, page: 1})}
							/>
						</div>
						<div className="col-md-3">
							<Form.Select
								value={filters.sortBy}
								onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="likesCount">Lượt thích</option>
							</Form.Select>
						</div>
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
				<div className="text-center p-5">
					<div className="spinner-border" role="status">
						<span className="visually-hidden">Đang tải...</span>
					</div>
				</div>
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
											<div style={{maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
												{comment.content}
											</div>
											{comment.parentId && <span className="badge bg-info ms-2">Reply</span>}
										</td>
										<td>{comment.authorId?.username || "N/A"}</td>
										<td>
											<div style={{maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
												{comment.postId?.title || "N/A"}
											</div>
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
								<p><strong>Bài viết:</strong> {selectedComment.postId?.title || "N/A"}</p>
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
