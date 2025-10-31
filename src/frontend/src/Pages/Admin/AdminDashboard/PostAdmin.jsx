import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
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
	getCategories
} from "../../../Utils/api";

const PostAdmin = () => {
	const [posts, setPosts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedPost, setSelectedPost] = useState(null);
	const [selectedPosts, setSelectedPosts] = useState([]);
	const [stats, setStats] = useState(null);
	
	// Filters
	const [filters, setFilters] = useState({
		keyword: "",
		categoryId: "",
		authorId: "",
		pinned: "",
		locked: "",
		isDraft: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	});
	
	const token = localStorage.getItem("token");
	
	// Fetch posts with filters
	const fetchPosts = async () => {
		setLoading(true);
		try {
			const params = {};
			if (filters.keyword) params.keyword = filters.keyword;
			if (filters.categoryId) params.categoryId = filters.categoryId;
			if (filters.authorId) params.authorId = filters.authorId;
			if (filters.pinned !== "") params.pinned = filters.pinned;
			if (filters.locked !== "") params.locked = filters.locked;
			if (filters.isDraft !== "") params.isDraft = filters.isDraft;
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;
			
			const data = await getAllPostsAdmin(token, params);
			setPosts(data.data || []);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách bài viết");
		}
		setLoading(false);
	};
	
	// Fetch categories
	const fetchCategories = async () => {
		try {
			const data = await getCategories();
			setCategories(data.categories || data);
		} catch (err) {
			console.error("Lỗi khi tải danh mục");
		}
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

	return (
		<div className="container-fluid p-4">
			<h2 className="mb-4">Quản lý bài viết</h2>
			
			{/* Statistics */}
			{stats && (
				<div className="row mb-4">
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Tổng bài viết</h5>
								<h3>{stats.totalPosts || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Đã xuất bản</h5>
								<h3 className="text-success">{stats.publishedPosts || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Bản nháp</h5>
								<h3 className="text-warning">{stats.draftPosts || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Đã ghim</h5>
								<h3 className="text-primary">{stats.pinnedPosts || 0}</h3>
							</div>
						</div>
					</div>
				</div>
			)}
			
			{/* Filters */}
			<div className="card mb-4">
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-4">
							<Form.Control
								type="text"
								placeholder="Tìm kiếm theo tiêu đề, nội dung..."
								value={filters.keyword}
								onChange={(e) => setFilters({...filters, keyword: e.target.value, page: 1})}
							/>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.categoryId}
								onChange={(e) => setFilters({...filters, categoryId: e.target.value, page: 1})}
							>
								<option value="">Tất cả danh mục</option>
								{categories.map(cat => (
									<option key={cat._id} value={cat._id}>{cat.title}</option>
								))}
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.pinned}
								onChange={(e) => setFilters({...filters, pinned: e.target.value, page: 1})}
							>
								<option value="">Tất cả</option>
								<option value="true">Đã ghim</option>
								<option value="false">Chưa ghim</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.locked}
								onChange={(e) => setFilters({...filters, locked: e.target.value, page: 1})}
							>
								<option value="">Tất cả</option>
								<option value="true">Đã khóa</option>
								<option value="false">Chưa khóa</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.sortBy}
								onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="views">Lượt xem</option>
								<option value="likesCount">Lượt thích</option>
								<option value="commentsCount">Số bình luận</option>
							</Form.Select>
						</div>
					</div>
				</div>
			</div>
			
			{/* Bulk actions */}
			{selectedPosts.length > 0 && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<span>Đã chọn {selectedPosts.length} bài viết</span>
					<div>
						<button className="btn btn-danger btn-sm me-2" onClick={() => handleBulkAction("delete")}>
							Xóa
						</button>
						<button className="btn btn-primary btn-sm" onClick={() => handleBulkAction("move")}>
							Chuyển danh mục
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
											checked={selectedPosts.length === posts.length && posts.length > 0}
										/>
									</th>
									<th>STT</th>
									<th>Tiêu đề</th>
									<th>Tác giả</th>
									<th>Danh mục</th>
									<th>Lượt xem</th>
									<th>Likes</th>
									<th>Comments</th>
									<th>Trạng thái</th>
									<th>Hành động</th>
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
											{post.title}
											{post.pinned && <span className="badge bg-warning ms-2">Ghim</span>}
											{post.locked && <span className="badge bg-secondary ms-2">Khóa</span>}
										</td>
										<td>{post.authorId?.username || "N/A"}</td>
										<td>{post.categoryId?.title || "N/A"}</td>
										<td>{post.views || 0}</td>
										<td>{post.likesCount || 0}</td>
										<td>{post.commentsCount || 0}</td>
										<td>
											{post.isDraft ? (
												<span className="badge bg-warning">Bản nháp</span>
											) : (
												<span className="badge bg-success">Công khai</span>
											)}
										</td>
										<td>
											<div className="btn-group" role="group">
												<button
													className="btn btn-info btn-sm"
													onClick={() => handleShowModal(post)}
												>
													Xem
												</button>
												<button
													className={`btn btn-sm ${post.pinned ? 'btn-warning' : 'btn-outline-warning'}`}
													onClick={() => handleTogglePin(post._id)}
													title={post.pinned ? "Bỏ ghim" : "Ghim"}
												>
													📌
												</button>
												<button
													className={`btn btn-sm ${post.locked ? 'btn-secondary' : 'btn-outline-secondary'}`}
													onClick={() => handleToggleLock(post._id)}
													title={post.locked ? "Mở khóa" : "Khóa"}
												>
													🔒
												</button>
												<button
													className="btn btn-danger btn-sm"
													onClick={() => handleDelete(post._id)}
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

			{/* Modal hiển thị thông tin bài viết */}
			<Modal show={showModal} onHide={handleCloseModal} centered size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Thông tin bài viết</Modal.Title>
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
									<p><strong>Ngày tạo:</strong> {new Date(selectedPost.createdAt).toLocaleString()}</p>
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
								{selectedPost.isDraft ? (
									<span className="badge bg-warning ms-2">Bản nháp</span>
								) : (
									<span className="badge bg-success ms-2">Công khai</span>
								)}
							</div>
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
