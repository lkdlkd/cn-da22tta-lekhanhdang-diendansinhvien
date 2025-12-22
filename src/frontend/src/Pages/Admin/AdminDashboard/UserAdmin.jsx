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
	deleteMultipleUsers,
	banMultipleUsers,
	unbanMultipleUsers,
	getUsersStats,
	updateUserRole
} from "../../../Utils/api";
import { Link } from "react-router-dom";
import LoadingPost from "@/Components/LoadingPost";

const UserAdmin = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [selectedUsers, setSelectedUsers] = useState([]);
	const [stats, setStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

	// Filters (applied) and pendingFilters (UI state)
	const [filters, setFilters] = useState({
		keyword: "",
		role: "",
		isBanned: "",
		isOnline: "",
		emailVerified: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	});
	const [pendingFilters, setPendingFilters] = useState({
		keyword: "",
		role: "",
		isBanned: "",
		isOnline: "",
		emailVerified: "",
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
			if (filters.emailVerified !== "") params.emailVerified = filters.emailVerified;

			const data = await getAllUsersAdmin(token, params);
			setUsers(data.data || []);
			if (data.pagination) setPagination(data.pagination);
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

	// Apply filters only when user clicks the button or presses Enter
	const applyFilters = () => {
		setSelectedUsers([]);
		setFilters({ ...pendingFilters, page: 1 });
	};

	// Reset all filters
	const resetFilters = () => {
		const defaults = {
			keyword: "",
			role: "",
			isBanned: "",
			isOnline: "",
			emailVerified: "",
			page: 1,
			limit: 20,
			sortBy: "createdAt",
			order: "desc"
		};
		setPendingFilters(defaults);
		setFilters(defaults);
		setSelectedUsers([]);
		setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
	};

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

	// Update user role
	const handleUpdateRole = async (userId, currentRole) => {
		const { value: newRole } = await Swal.fire({
			title: "Cập nhật vai trò người dùng",
			html: `
				<div class="text-start p-3">
					<div class="mb-3">
						<label class="form-label fw-bold">
							<i class="bi bi-person-badge me-2"></i>
							Vai trò hiện tại: 
							<span class="badge ${currentRole === 'admin' ? 'bg-danger' :
					currentRole === 'mod' ? 'bg-warning text-dark' :
						'bg-secondary'
				} ms-2">${currentRole === 'admin' ? 'Admin' :
					currentRole === 'mod' ? 'Mod' :
						'Student'
				}</span>
						</label>
					</div>
					<div class="mb-3">
						<label class="form-label fw-bold">
							<i class="bi bi-arrow-right-circle me-2"></i>
							Chọn vai trò mới
						</label>
						<select id="role-select" class="form-select form-select-lg" style="width:100%">
							<option value="student" ${currentRole === 'student' ? 'selected' : ''}>
								👨‍🎓 Student - Sinh viên
							</option>
							<option value="mod" ${currentRole === 'mod' ? 'selected' : ''}>
								🛡️ Mod - Kiểm duyệt viên
							</option>
						</select>
					</div>
					<div class="alert alert-info mb-0">
						<small>
							<i class="bi bi-info-circle me-2"></i>
							<strong>Lưu ý:</strong> Thay đổi vai trò sẽ ảnh hưởng đến quyền hạn của người dùng trong hệ thống.
						</small>
					</div>
				</div>
			`,
			focusConfirm: false,
			showCancelButton: true,
			confirmButtonText: '<i class="bi bi-check-circle me-2"></i>Cập nhật',
			cancelButtonText: '<i class="bi bi-x-circle me-2"></i>Hủy',
			confirmButtonColor: '#0d6efd',
			cancelButtonColor: '#6c757d',
			customClass: {
				container: 'swal-on-modal',
				popup: 'rounded-3',
				confirmButton: 'btn btn-primary px-4',
				cancelButton: 'btn btn-secondary px-4'
			},
			preConfirm: () => {
				return document.getElementById('role-select').value;
			}
		});

		if (newRole && newRole !== currentRole) {
			try {
				await updateUserRole(token, userId, newRole);
				toast.success("Cập nhật vai trò thành công!");
				fetchUsers();
			} catch (err) {
				toast.error(err.message || "Lỗi khi cập nhật vai trò");
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
		let duration = null;
		let reason = null;

		switch (action) {
			case "delete":
				confirmText = `Xóa ${selectedUsers.length} người dùng đã chọn?`;
				successText = "Xóa người dùng thành công!";
				break;
			case "ban":
				// Hỏi thêm thời hạn và lý do trước khi xác nhận
				const { value: banConfig } = await Swal.fire({
					title: "Cấm người dùng",
					html: `
						<div class="mb-2 text-start"><label class="form-label">Thời hạn (ngày, để trống = vĩnh viễn)</label>
							<input id="ban-duration" type="number" min="1" class="swal2-input" style="width:100%" placeholder="Số ngày" />
						</div>
						<div class="text-start"><label class="form-label">Lý do</label>
							<textarea id="ban-reason" class="swal2-textarea" placeholder="Vi phạm quy định"></textarea>
						</div>
					`,
					focusConfirm: false,
					confirmButtonText: "Tiếp tục",
					showCancelButton: true,
					cancelButtonText: "Hủy",
					preConfirm: () => {
						const d = (document.getElementById('ban-duration') || {}).value;
						const r = (document.getElementById('ban-reason') || {}).value;
						return { duration: d ? Number(d) : null, reason: r || null };
					}
				});
				if (!banConfig) return; // user canceled
				duration = banConfig.duration;
				reason = banConfig.reason || 'Vi phạm quy định';
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
					await banMultipleUsers(token, selectedUsers, duration, reason || "Bulk ban");
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

	// Pagination handlers
	const goToPage = (page) => {
		if (page < 1 || page > pagination.pages) return;
		setSelectedUsers([]);
		setFilters(prev => ({ ...prev, page }));
	};

	return (
		<div className="">
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

				</div>
			)}

			{/* Filters */}
			<div className="card mb-4">
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-3">
							<Form.Control
								type="text"
								placeholder="Tìm kiếm theo username, email..."
								value={pendingFilters.keyword}
								onChange={(e) => setPendingFilters({ ...pendingFilters, keyword: e.target.value })}
								onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
							/>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={pendingFilters.role}
								onChange={(e) => setPendingFilters({ ...pendingFilters, role: e.target.value })}
							>
								<option value="">Tất cả vai trò</option>
								<option value="student">👨‍🎓 Student</option>
								<option value="mod">🛡️ Mod</option>
								<option value="admin">👑 Admin</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={pendingFilters.isBanned}
								onChange={(e) => setPendingFilters({ ...pendingFilters, isBanned: e.target.value })}
							>
								<option value="">Tất cả trạng thái</option>
								<option value="false">Hoạt động</option>
								<option value="true">Bị cấm</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={pendingFilters.isOnline}
								onChange={(e) => setPendingFilters({ ...pendingFilters, isOnline: e.target.value })}
							>
								<option value="">Online/Offline</option>
								<option value="true">Online</option>
								<option value="false">Offline</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={pendingFilters.emailVerified}
								onChange={(e) => setPendingFilters({ ...pendingFilters, emailVerified: e.target.value })}
							>
								<option value="">Xác thực email</option>
								<option value="true">✅ Đã xác thực</option>
								<option value="false">⚠️ Chưa xác thực</option>
							</Form.Select>
						</div>
						<div className="col-md-2">
							<Form.Select
								value={pendingFilters.sortBy}
								onChange={(e) => setPendingFilters({ ...pendingFilters, sortBy: e.target.value })}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="username">Tên</option>
								<option value="postsCount">Số bài viết</option>
								<option value="commentsCount">Số bình luận</option>
							</Form.Select>
						</div>
						<div className="col-md-2 d-flex gap-2">
							<button className="btn btn-primary w-100" onClick={applyFilters} type="button">
								Tìm
							</button>
							<button className="btn btn-outline-secondary w-100" onClick={resetFilters} type="button">
								Đặt lại
							</button>
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
			<div className="mb-3">
				<div className="d-flex justify-content-between align-items-center mb-2">
					<small className="text-muted">
						Hiển thị {users.length} / {pagination.total} người dùng
					</small>
					<div className="d-flex align-items-center">
						<span className="me-2">Mỗi trang:</span>
						<Form.Select
							size="sm"
							style={{ width: 100 }}
							value={filters.limit}
							onChange={(e) => {
								const newLimit = Number(e.target.value) || 20;
								setSelectedUsers([]);
								setFilters(prev => ({ ...prev, limit: newLimit, page: 1 }));
								setPendingFilters(prev => ({ ...prev, limit: newLimit }));
							}}
						>
							<option value="10">10</option>
							<option value="20">20</option>
							<option value="50">50</option>
							<option value="100">100</option>
							<option value="500">500</option>
						</Form.Select>
					</div>
				</div>
			</div>
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
											checked={selectedUsers.length === users.length && users.length > 0}
										/>
									</th>
									<th>STT</th>
									<th>Hành động</th>
									<th>Ảnh đại diện</th>
									<th>Thông tin</th>
									<th>Khoa - Lớp</th>
									<th>Vai trò</th>
									<th>Xác thực</th>
									<th>Bài viết</th>
									<th>Bình luận</th>
									<th>Hoạt động gần đây</th>
									<th>Trạng thái</th>
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
															onClick={() => handleShowModal(user)}
														>
															<i className="bi bi-eye me-2 text-info"></i>
															Xem chi tiết
														</button>
													</li>
													<li>
														<button
															className="dropdown-item"
															onClick={() => handleUpdateRole(user._id, user.role)}
														>
															<i className="bi bi-person-badge me-2 text-primary"></i>
															Cập nhật vai trò
														</button>
													</li>
													<li><hr className="dropdown-divider" /></li>
													{user.isBanned ? (
														<li>
															<button
																className="dropdown-item text-success"
																onClick={() => handleUnban(user._id)}
															>
																<i className="bi bi-unlock me-2"></i>
																Bỏ cấm
															</button>
														</li>
													) : (
														<li>
															<button
																className="dropdown-item text-warning"
																onClick={() => handleBan(user._id)}
															>
																<i className="bi bi-ban me-2"></i>
																Cấm
															</button>
														</li>
													)}
													<li>
														<button
															className="dropdown-item text-danger"
															onClick={() => handleDelete(user._id)}
														>
															<i className="bi bi-trash me-2"></i>
															Xóa
														</button>
													</li>
												</ul>
											</div>
										</td>
										<td>
											<img
												src={user.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
												alt={user.username}
												style={{ width: "40px", height: "40px", borderRadius: "50%" }}
											/>
										</td>
										<td>
											<ul>
												<li><strong>Tên:</strong> {user.displayName || '—'} </li>
												<li><strong>Username:</strong> {user.username}</li>
												<li><strong>Email:</strong> {user.email}</li>
												<li><strong>Phone:</strong> {user.phone || '—'}</li>
											</ul>
										</td>
										<td>
											{user.faculty} - {user.class}
										</td>
									
										<td>
										<span className={`badge ${user.role === 'admin' ? 'bg-danger' : user.role === 'mod' ? 'bg-warning' : 'bg-secondary'}`}>
												{user.role}
											</span>
										</td>
										<td>
											{user.emailVerified ? (
												<span className="badge bg-success" title="Email đã xác thực">✓</span>
											) : (
												<span className="badge bg-warning" title="Email chưa xác thực">⚠</span>
											)}
										</td>
										<td>{user.postsCount || 0}</td>
										<td>{user.commentsCount || 0}</td>
										<td>{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '—'}</td>
										<td>
											{user.isBanned ? (
												<span className="badge bg-danger">Bị cấm</span>
											) : (
												<span className="badge bg-success">Hoạt động</span>
											)}
											{user.isOnline && <span className="badge bg-info ms-2">Online</span>}
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
									src={selectedUser.avatarUrl || "https://ui-avatars.com/api/?background=random&name=user"}
									alt={selectedUser.username}
									style={{ width: "150px", height: "150px", borderRadius: "50%" }}
									className="mb-3"
								/>
								<h5>{selectedUser.displayName || selectedUser.username}</h5>
								<span className={`badge ${selectedUser.role === 'admin' ? 'bg-danger' : selectedUser.role === 'mod' ? 'bg-warning' : 'bg-secondary'}`}>
									{selectedUser.role}
								</span>
								<span className="d-block mt-2">
									<Link to={`/user/${selectedUser.username}`} target="_blank" rel="noopener noreferrer">
										Xem trang cá nhân
									</Link>
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
											<td>
												{selectedUser.email}
												{selectedUser.emailVerified ? (
													<span className="badge bg-success ms-2" title="Email đã xác thực">✓ Đã xác thực</span>
												) : (
													<span className="badge bg-warning ms-2" title="Email chưa xác thực">⚠ Chưa xác thực</span>
												)}
											</td>
										</tr>
										<tr>
											<td><strong>Phone:</strong></td>
											<td>{selectedUser.phone || '—'}</td>
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
											<td><strong>Likes nhận được:</strong></td>
											<td>{selectedUser.stats?.likesReceived ?? 0}</td>
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
												{selectedUser.bannedUntil && (
													<span className="badge bg-warning ms-2">Đến: {new Date(selectedUser.bannedUntil).toLocaleString()}</span>
												)}
											</td>
										</tr>
										<tr>
											<td><strong>Ngày tạo:</strong></td>
											<td>{new Date(selectedUser.createdAt).toLocaleString()}</td>
										</tr>
										<tr>
											<td><strong>Hoạt động gần nhất:</strong></td>
											<td>{selectedUser.lastSeen ? new Date(selectedUser.lastSeen).toLocaleString() : '—'}</td>
										</tr>
										<tr>
											<td><strong>Cài đặt email:</strong></td>
											<td>{selectedUser.settings?.emailNotifications ? 'Bật' : 'Tắt'}</td>
										</tr>
										<tr>
											<td><strong>Cài đặt push:</strong></td>
											<td>{selectedUser.settings?.pushNotifications ? 'Bật' : 'Tắt'}</td>
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

			{/* Pagination */}
			<div className="mt-3">

				{pagination.pages > 1 && (
					<div className="d-flex justify-content-center">
						<Pagination>
							<Pagination.First onClick={() => goToPage(1)} disabled={pagination.page === 1} />
							<Pagination.Prev onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} />
							{Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
								<Pagination.Item key={p} active={p === pagination.page} onClick={() => goToPage(p)}>
									{p}
								</Pagination.Item>
							))}
							<Pagination.Next onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.pages} />
							<Pagination.Last onClick={() => goToPage(pagination.pages)} disabled={pagination.page === pagination.pages} />
						</Pagination>
					</div>
				)}
			</div>
		</div>
	);
};

export default UserAdmin;
