import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { 
	getAllUsersAdmin, 
	deleteUser, 
	banUser, 
	unbanUser,
	updateUserRole,
	deleteMultipleUsers,
	banMultipleUsers,
	unbanMultipleUsers,
	getUsersStats
} from "../../../Utils/api";

const UserAdmin = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [selectedUsers, setSelectedUsers] = useState([]);
	const [stats, setStats] = useState(null);
	
	// Filters
	const [filters, setFilters] = useState({
		keyword: "",
		role: "",
		isBanned: "",
		isOnline: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	});
	
	const token = localStorage.getItem("token");
	
	// Fetch users with filters
	const fetchUsers = async () => {
		setLoading(true);
		try {
			const params = {};
			if (filters.keyword) params.keyword = filters.keyword;
			if (filters.role) params.role = filters.role;
			if (filters.isBanned !== "") params.isBanned = filters.isBanned;
			if (filters.isOnline !== "") params.isOnline = filters.isOnline;
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;
			
			const data = await getAllUsersAdmin(token, params);
			setUsers(data.data || []);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách người dùng");
		}
		setLoading(false);
	};
	
	// Fetch statistics
	const fetchStats = async () => {
		try {
			const data = await getUsersStats(token);
			setStats(data.stats);
		} catch (err) {
			console.error("Lỗi khi tải thống kê");
		}
	};

	useEffect(() => {
		fetchUsers();
		fetchStats();
		// eslint-disable-next-line
	}, [filters]);
	
	// Select all users
	const handleSelectAll = (e) => {
		if (e.target.checked) {
			setSelectedUsers(users.map(u => u._id));
		} else {
			setSelectedUsers([]);
		}
	};
	
	// Select single user
	const handleSelectUser = (userId) => {
		if (selectedUsers.includes(userId)) {
			setSelectedUsers(selectedUsers.filter(id => id !== userId));
		} else {
			setSelectedUsers([...selectedUsers, userId]);
		}
	};

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
			customClass: { container: 'swal-on-modal' }
		});
		if (result.isConfirmed) {
			try {
				await deleteUser(token, userId);
				toast.success("Xóa người dùng thành công!");
				fetchUsers();
				fetchStats();
			} catch (err) {
				toast.error("Lỗi khi xóa người dùng");
			}
		}
	};
	
	// Ban user
	const handleBan = async (userId) => {
		const result = await Swal.fire({
			title: "Cấm người dùng",
			text: "Bạn có chắc muốn cấm người dùng này?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Cấm",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		if (result.isConfirmed) {
			try {
				await banUser(token, userId);
				toast.success("Cấm người dùng thành công!");
				fetchUsers();
			} catch (err) {
				toast.error("Lỗi khi cấm người dùng");
			}
		}
	};
	
	// Unban user
	const handleUnban = async (userId) => {
		try {
			await unbanUser(token, userId);
			toast.success("Bỏ cấm người dùng thành công!");
			fetchUsers();
		} catch (err) {
			toast.error("Lỗi khi bỏ cấm người dùng");
		}
	};
	
	// Change user role
	const handleChangeRole = async (userId, currentRole) => {
		const { value: newRole } = await Swal.fire({
			title: "Thay đổi vai trò",
			input: "select",
			inputOptions: {
				user: "User",
				moderator: "Moderator",
				admin: "Admin"
			},
			inputValue: currentRole,
			showCancelButton: true,
			confirmButtonText: "Cập nhật",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		
		if (newRole && newRole !== currentRole) {
			try {
				await updateUserRole(token, userId, newRole);
				toast.success("Cập nhật vai trò thành công!");
				fetchUsers();
			} catch (err) {
				toast.error("Lỗi khi cập nhật vai trò");
			}
		}
	};
	
	// Bulk actions
	const handleBulkAction = async (action) => {
		if (selectedUsers.length === 0) {
			toast.warning("Vui lòng chọn ít nhất một người dùng");
			return;
		}
		
		let confirmText = "";
		let successText = "";
		
		switch (action) {
			case "delete":
				confirmText = `Xóa ${selectedUsers.length} người dùng đã chọn?`;
				successText = "Xóa người dùng thành công!";
				break;
			case "ban":
				confirmText = `Cấm ${selectedUsers.length} người dùng đã chọn?`;
				successText = "Cấm người dùng thành công!";
				break;
			case "unban":
				confirmText = `Bỏ cấm ${selectedUsers.length} người dùng đã chọn?`;
				successText = "Bỏ cấm người dùng thành công!";
				break;
			default:
				return;
		}
		
		const result = await Swal.fire({
			title: "Xác nhận",
			text: confirmText,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xác nhận",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		
		if (result.isConfirmed) {
			try {
				if (action === "delete") {
					await deleteMultipleUsers(token, selectedUsers);
				} else if (action === "ban") {
					await banMultipleUsers(token, selectedUsers, null, "Bulk ban");
				} else if (action === "unban") {
					await unbanMultipleUsers(token, selectedUsers);
				}
				toast.success(successText);
				setSelectedUsers([]);
				fetchUsers();
				fetchStats();
			} catch (err) {
				toast.error(`Lỗi: ${err.message}`);
			}
		}
	};

	return (
		<div className="container-fluid p-4">
			<h2 className="mb-4">Quản lý người dùng</h2>
			
			{/* Statistics */}
			{stats && (
				<div className="row mb-4">
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Tổng người dùng</h5>
								<h3>{stats.totalUsers || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Đang online</h5>
								<h3 className="text-success">{stats.onlineUsers || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Bị cấm</h5>
								<h3 className="text-danger">{stats.bannedUsers || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Admin</h5>
								<h3 className="text-primary">{stats.usersByRole?.admin || 0}</h3>
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
								placeholder="Tìm kiếm theo username, email..."
								value={filters.keyword}
								onChange={(e) => setFilters({...filters, keyword: e.target.value, page: 1})}
							/>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.role}
								onChange={(e) => setFilters({...filters, role: e.target.value, page: 1})}
							>
								<option value="">Tất cả vai trò</option>
								<option value="user">User</option>
								<option value="moderator">Moderator</option>
								<option value="admin">Admin</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.isBanned}
								onChange={(e) => setFilters({...filters, isBanned: e.target.value, page: 1})}
							>
								<option value="">Tất cả trạng thái</option>
								<option value="false">Hoạt động</option>
								<option value="true">Bị cấm</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.isOnline}
								onChange={(e) => setFilters({...filters, isOnline: e.target.value, page: 1})}
							>
								<option value="">Online/Offline</option>
								<option value="true">Online</option>
								<option value="false">Offline</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={filters.sortBy}
								onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="username">Tên</option>
								<option value="postsCount">Số bài viết</option>
								<option value="commentsCount">Số bình luận</option>
							</Form.Select>
						</div>
					</div>
				</div>
			</div>
			
			{/* Bulk actions */}
			{selectedUsers.length > 0 && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<span>Đã chọn {selectedUsers.length} người dùng</span>
					<div>
						<button className="btn btn-danger btn-sm me-2" onClick={() => handleBulkAction("delete")}>
							Xóa
						</button>
						<button className="btn btn-warning btn-sm me-2" onClick={() => handleBulkAction("ban")}>
							Cấm
						</button>
						<button className="btn btn-success btn-sm" onClick={() => handleBulkAction("unban")}>
							Bỏ cấm
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
											checked={selectedUsers.length === users.length && users.length > 0}
										/>
									</th>
									<th>STT</th>
									<th>Avatar</th>
									<th>Username</th>
									<th>Email</th>
									<th>Vai trò</th>
									<th>Bài viết</th>
									<th>Bình luận</th>
									<th>Trạng thái</th>
									<th>Hành động</th>
								</tr>
							</thead>
							<tbody>
								{users.map((user, idx) => (
									<tr key={user._id}>
										<td>
											<Form.Check 
												type="checkbox"
												checked={selectedUsers.includes(user._id)}
												onChange={() => handleSelectUser(user._id)}
											/>
										</td>
										<td>{(filters.page - 1) * filters.limit + idx + 1}</td>
										<td>
											<img 
												src={user.avatarUrl || "/default-avatar.png"} 
												alt={user.username}
												style={{width: "40px", height: "40px", borderRadius: "50%"}}
											/>
										</td>
										<td>
											{user.username}
											{user.isOnline && <span className="badge bg-success ms-2">Online</span>}
										</td>
										<td>{user.email}</td>
										<td>
											<span className={`badge ${user.role === 'admin' ? 'bg-danger' : user.role === 'moderator' ? 'bg-warning' : 'bg-secondary'}`}>
												{user.role}
											</span>
										</td>
										<td>{user.postsCount || 0}</td>
										<td>{user.commentsCount || 0}</td>
										<td>
											{user.isBanned ? (
												<span className="badge bg-danger">Bị cấm</span>
											) : (
												<span className="badge bg-success">Hoạt động</span>
											)}
										</td>
										<td>
											<div className="btn-group" role="group">
												<button
													className="btn btn-info btn-sm"
													onClick={() => handleShowModal(user)}
												>
													Xem
												</button>
												<button
													className="btn btn-primary btn-sm"
													onClick={() => handleChangeRole(user._id, user.role)}
												>
													Role
												</button>
												{user.isBanned ? (
													<button
														className="btn btn-success btn-sm"
														onClick={() => handleUnban(user._id)}
													>
														Bỏ cấm
													</button>
												) : (
													<button
														className="btn btn-warning btn-sm"
														onClick={() => handleBan(user._id)}
													>
														Cấm
													</button>
												)}
												<button
													className="btn btn-danger btn-sm"
													onClick={() => handleDelete(user._id)}
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

			{/* Modal hiển thị thông tin người dùng */}
			<Modal show={showModal} onHide={handleCloseModal} centered size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Thông tin người dùng</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedUser && (
						<div className="row">
							<div className="col-md-4 text-center">
								<img 
									src={selectedUser.avatarUrl || "/default-avatar.png"} 
									alt={selectedUser.username}
									style={{width: "150px", height: "150px", borderRadius: "50%"}}
									className="mb-3"
								/>
								<h5>{selectedUser.displayName || selectedUser.username}</h5>
								<span className={`badge ${selectedUser.role === 'admin' ? 'bg-danger' : selectedUser.role === 'moderator' ? 'bg-warning' : 'bg-secondary'}`}>
									{selectedUser.role}
								</span>
							</div>
							<div className="col-md-8">
								<table className="table table-borderless">
									<tbody>
										<tr>
											<td><strong>Username:</strong></td>
											<td>{selectedUser.username}</td>
										</tr>
										<tr>
											<td><strong>Email:</strong></td>
											<td>{selectedUser.email}</td>
										</tr>
										<tr>
											<td><strong>Khoa:</strong></td>
											<td>{selectedUser.faculty}</td>
										</tr>
										<tr>
											<td><strong>Lớp:</strong></td>
											<td>{selectedUser.class}</td>
										</tr>
										<tr>
											<td><strong>Số bài viết:</strong></td>
											<td>{selectedUser.postsCount || 0}</td>
										</tr>
										<tr>
											<td><strong>Số bình luận:</strong></td>
											<td>{selectedUser.commentsCount || 0}</td>
										</tr>
										<tr>
											<td><strong>Trạng thái:</strong></td>
											<td>
												{selectedUser.isBanned ? (
													<span className="badge bg-danger">Bị cấm</span>
												) : (
													<span className="badge bg-success">Hoạt động</span>
												)}
												{selectedUser.isOnline && <span className="badge bg-info ms-2">Online</span>}
											</td>
										</tr>
										<tr>
											<td><strong>Ngày tạo:</strong></td>
											<td>{new Date(selectedUser.createdAt).toLocaleString()}</td>
										</tr>
										{selectedUser.bio && (
											<tr>
												<td><strong>Tiểu sử:</strong></td>
												<td>{selectedUser.bio}</td>
											</tr>
										)}
									</tbody>
								</table>
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

export default UserAdmin;
