import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { getAllUsers, deleteUser } from "../../../Utils/api";

const UserAdmin = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
    const token = localStorage.getItem("token");
	// Fetch users
	const fetchUsers = async () => {
		setLoading(true);
		try {
			const data = await getAllUsers(token);
			setUsers(data.users);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách người dùng");
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchUsers();
		// eslint-disable-next-line
	}, []);

	// Show user detail modal
	const handleShowModal = (user) => {
		setSelectedUser(user);
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setSelectedUser(null);
	};

	// Delete user with confirmation
	const handleDelete = async (userId) => {
		const result = await Swal.fire({
			title: "Xác nhận xóa người dùng?",
			text: "Bạn có chắc muốn xóa người dùng này?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
		});
		if (result.isConfirmed) {
			try {
				await deleteUser(token, userId);
				toast.success("Xóa người dùng thành công!");
				fetchUsers();
			} catch (err) {
				toast.error("Lỗi khi xóa người dùng");
			}
		}
	};

	return (
		<div>
			<h2>Quản lý người dùng</h2>
			{loading ? (
				<div>Đang tải...</div>
			) : (
				<Table striped bordered hover responsive>
					<thead>
						<tr>
							<th>STT</th>
							<th>Tên đăng nhập</th>
							<th>Email</th>
							<th>Vai trò</th>
							<th>Khoa</th>
							<th>Lớp</th>
							<th>Trạng thái</th>
							<th>Hành động</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user, idx) => (
							<tr key={user._id}>
								<td>{idx + 1}</td>
								<td>{user.username}</td>
								<td>{user.email}</td>
								<td>{user.role}</td>
								<td>{user.faculty}</td>
								<td>{user.class}</td>
								<td>{user.isBanned ? "Bị cấm" : "Hoạt động"}</td>
								<td>
									<button
										className="btn btn-info btn-sm me-2"
										onClick={() => handleShowModal(user)}
									>
										Xem
									</button>
									<button
										className="btn btn-danger btn-sm"
										onClick={() => handleDelete(user._id)}
									>
										Xóa
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			)}

			{/* Modal hiển thị thông tin người dùng */}
			<Modal show={showModal} onHide={handleCloseModal} centered>
				<Modal.Header closeButton>
					<Modal.Title>Thông tin người dùng</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedUser && (
						<div>
							<p><strong>Tên đăng nhập:</strong> {selectedUser.username}</p>
							<p><strong>Email:</strong> {selectedUser.email}</p>
							<p><strong>Vai trò:</strong> {selectedUser.role}</p>
							<p><strong>Khoa:</strong> {selectedUser.faculty}</p>
							<p><strong>Lớp:</strong> {selectedUser.class}</p>
							<p><strong>Trạng thái:</strong> {selectedUser.isBanned ? "Bị cấm" : "Hoạt động"}</p>
							<p><strong>Ngày tạo:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</p>
							<p><strong>Tiểu sử:</strong> {selectedUser.bio}</p>
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

export default UserAdmin;
