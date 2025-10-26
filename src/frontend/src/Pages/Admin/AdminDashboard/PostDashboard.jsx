import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { getAllPosts, deletePost } from "../../../Utils/api";

const PostDashboard = () => {
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedPost, setSelectedPost] = useState(null);
	const token = localStorage.getItem("token");
	// Fetch posts
	const fetchPosts = async () => {
		setLoading(true);
		try {
			const data = await getAllPosts();
			setPosts(data.posts || data); // data.posts nếu API trả về dạng {posts: []}
		} catch (err) {
			toast.error("Lỗi khi tải danh sách bài viết");
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchPosts();
		// eslint-disable-next-line
	}, []);

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
		});
		if (result.isConfirmed) {
			try {
				await deletePost(token, postId);
				toast.success("Xóa bài viết thành công!");
				fetchPosts();
			} catch (err) {
				toast.error("Lỗi khi xóa bài viết");
			}
		}
	};

	return (
		<div>
			<h2>Quản lý bài viết</h2>
			{loading ? (
				<div>Đang tải...</div>
			) : (
				<Table striped bordered hover responsive>
					<thead>
						<tr>
							<th>STT</th>
							<th>Tiêu đề</th>
							<th>Tác giả</th>
							<th>Danh mục</th>
							<th>Ngày tạo</th>
							<th>Trạng thái</th>
							<th>Hành động</th>
						</tr>
					</thead>
					<tbody>
						{posts.map((post, idx) => (
							<tr key={post._id}>
								<td>{idx + 1}</td>
								<td>{post.title}</td>
								<td>{post.authorId?.username || post.authorId}</td>
								<td>{post.categoryId?.title || post.categoryId}</td>
								<td>{new Date(post.createdAt).toLocaleString()}</td>
								<td>{post.isDeleted ? "Đã xóa" : post.isDraft ? "Bản nháp" : "Hoạt động"}</td>
								<td>
									<button
										className="btn btn-info btn-sm me-2"
										onClick={() => handleShowModal(post)}
									>
										Xem
									</button>
									<button
										className="btn btn-danger btn-sm"
										onClick={() => handleDelete(post._id)}
									>
										Xóa
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			)}

			{/* Modal hiển thị thông tin bài viết */}
			<Modal show={showModal} onHide={handleCloseModal} centered>
				<Modal.Header closeButton>
					<Modal.Title>Thông tin bài viết</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedPost && (
						<div>
							<p><strong>Tiêu đề:</strong> {selectedPost.title}</p>
							<p><strong>Tác giả:</strong> {selectedPost.authorId?.username || selectedPost.authorId}</p>
							<p><strong>Danh mục:</strong> {selectedPost.categoryId?.title || selectedPost.categoryId}</p>
							<p><strong>Ngày tạo:</strong> {new Date(selectedPost.createdAt).toLocaleString()}</p>
							<p><strong>Nội dung:</strong> {selectedPost.content}</p>
							<p><strong>Trạng thái:</strong> {selectedPost.isDeleted ? "Đã xóa" : selectedPost.isDraft ? "Bản nháp" : "Hoạt động"}</p>
							<p><strong>Lượt xem:</strong> {selectedPost.views}</p>
							<p><strong>Số bình luận:</strong> {selectedPost.commentsCount}</p>
							<p><strong>Số lượt thích:</strong> {selectedPost.likesCount}</p>
							{/* Có thể bổ sung thêm các trường khác nếu cần */}
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

export default PostDashboard;
