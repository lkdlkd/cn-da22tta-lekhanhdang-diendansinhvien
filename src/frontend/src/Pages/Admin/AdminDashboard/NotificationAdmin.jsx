import React, { useEffect, useState } from "react";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { 
	getAllNotificationsAdmin, 
	deleteMultipleNotifications,
	deleteUserNotifications,
	sendBulkNotifications,
	getNotificationsStats
} from "../../../Utils/api";

const NotificationAdmin = () => {
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [showSendModal, setShowSendModal] = useState(false);
	const [selectedNotification, setSelectedNotification] = useState(null);
	const [selectedNotifications, setSelectedNotifications] = useState([]);
	const [stats, setStats] = useState(null);
	
	// Filters
	const [filters, setFilters] = useState({
		userId: "",
		type: "",
		read: "",
		page: 1,
		limit: 20,
		sortBy: "createdAt",
		order: "desc"
	});
	
	// Send notification form
	const [sendForm, setSendForm] = useState({
		userIds: "",
		type: "info",
		message: ""
	});
	
	const token = localStorage.getItem("token");
	
	// Fetch notifications with filters
	const fetchNotifications = async () => {
		setLoading(true);
		try {
			const params = {};
			if (filters.userId) params.userId = filters.userId;
			if (filters.type) params.type = filters.type;
			if (filters.read !== "") params.read = filters.read;
			params.page = filters.page;
			params.limit = filters.limit;
			params.sortBy = filters.sortBy;
			params.order = filters.order;
			
			const data = await getAllNotificationsAdmin(token, params);
			setNotifications(data.data || []);
		} catch (err) {
			toast.error("Lỗi khi tải danh sách thông báo");
		}
		setLoading(false);
	};
	
	// Fetch statistics
	const fetchStats = async () => {
		try {
			const data = await getNotificationsStats(token);
			setStats(data);
		} catch (err) {
			console.error("Lỗi khi tải thống kê");
		}
	};
	
	useEffect(() => {
		fetchNotifications();
		fetchStats();
		// eslint-disable-next-line
	}, [filters]);
	
	// Select all notifications
	const handleSelectAll = (e) => {
		if (e.target.checked) {
			setSelectedNotifications(notifications.map(n => n._id));
		} else {
			setSelectedNotifications([]);
		}
	};
	
	// Select single notification
	const handleSelectNotification = (notificationId) => {
		if (selectedNotifications.includes(notificationId)) {
			setSelectedNotifications(selectedNotifications.filter(id => id !== notificationId));
		} else {
			setSelectedNotifications([...selectedNotifications, notificationId]);
		}
	};
	
	// Show notification detail modal
	const handleShowModal = (notification) => {
		setSelectedNotification(notification);
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setSelectedNotification(null);
	};

	// Bulk delete
	const handleBulkDelete = async () => {
		if (selectedNotifications.length === 0) {
			toast.warning("Vui lòng chọn ít nhất một thông báo");
			return;
		}
		
		const result = await Swal.fire({
			title: "Xác nhận",
			text: `Xóa ${selectedNotifications.length} thông báo đã chọn?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		
		if (result.isConfirmed) {
			try {
				await deleteMultipleNotifications(token, selectedNotifications);
				toast.success("Xóa thông báo thành công!");
				setSelectedNotifications([]);
				fetchNotifications();
				fetchStats();
			} catch (err) {
				toast.error(`Lỗi: ${err.message}`);
			}
		}
	};
	
	// Delete user notifications
	const handleDeleteUserNotifications = async () => {
		const { value: userId } = await Swal.fire({
			title: "Xóa thông báo của người dùng",
			input: "text",
			inputLabel: "Nhập User ID",
			inputPlaceholder: "User ID...",
			showCancelButton: true,
			confirmButtonText: "Xóa",
			cancelButtonText: "Hủy",
			customClass: { container: 'swal-on-modal' }
		});
		
		if (userId) {
			try {
				await deleteUserNotifications(token, userId);
				toast.success("Xóa thông báo thành công!");
				fetchNotifications();
				fetchStats();
			} catch (err) {
				toast.error(`Lỗi: ${err.message}`);
			}
		}
	};
	
	// Send bulk notifications
	const handleSendNotifications = async () => {
		if (!sendForm.userIds || !sendForm.message) {
			toast.warning("Vui lòng điền đầy đủ thông tin");
			return;
		}
		
		const userIds = sendForm.userIds.split(",").map(id => id.trim()).filter(id => id);
		
		try {
			await sendBulkNotifications(token, userIds, sendForm.type, sendForm.message);
			toast.success("Gửi thông báo thành công!");
			setShowSendModal(false);
			setSendForm({ userIds: "", type: "info", message: "" });
			fetchNotifications();
			fetchStats();
		} catch (err) {
			toast.error(`Lỗi: ${err.message}`);
		}
	};

	return (
		<div className="">
			<h2 className="mb-4">Quản lý thông báo</h2>
			{/* Statistics */}
			{stats && (
				<div className="row mb-4">
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Tổng thông báo</h5>
								<h3>{stats.totalNotifications || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Chưa đọc</h5>
								<h3 className="text-warning">{stats.unreadNotifications || 0}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Đã đọc</h5>
								<h3 className="text-success">{(stats.totalNotifications || 0) - (stats.unreadNotifications || 0)}</h3>
							</div>
						</div>
					</div>
					<div className="col-md-3">
						<div className="card text-center">
							<div className="card-body">
								<h5>Loại thông báo</h5>
								<h3 className="text-primary">{stats.notificationsByType?.length || 0}</h3>
							</div>
						</div>
					</div>
				</div>
			)}
			
			{/* Actions */}
			<div className="row mb-4">
				<div className="col-md-12">
					<button className="btn btn-primary me-2" onClick={() => setShowSendModal(true)}>
						Gửi thông báo
					</button>
					<button className="btn btn-warning" onClick={handleDeleteUserNotifications}>
						Xóa thông báo của user
					</button>
				</div>
			</div>
			
			{/* Filters */}
			<div className="card mb-4">
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-3">
							<Form.Control
								type="text"
								placeholder="User ID..."
								value={filters.userId}
								onChange={(e) => setFilters({...filters, userId: e.target.value, page: 1})}
							/>
						</div>
						<div className="col-md-3">
							<Form.Select
								value={filters.type}
								onChange={(e) => setFilters({...filters, type: e.target.value, page: 1})}
							>
								<option value="">Tất cả loại</option>
								<option value="info">Info</option>
								<option value="like">Like</option>
								<option value="comment">Comment</option>
								<option value="reply">Reply</option>
								<option value="system">System</option>
							</Form.Select>
						</div>
						<div className="col-md-3">
							<Form.Select
								value={filters.read}
								onChange={(e) => setFilters({...filters, read: e.target.value, page: 1})}
							>
								<option value="">Tất cả</option>
								<option value="false">Chưa đọc</option>
								<option value="true">Đã đọc</option>
							</Form.Select>
						</div>
						<div className="col-md-3">
							<Form.Select
								value={filters.sortBy}
								onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
							>
								<option value="createdAt">Ngày tạo</option>
								<option value="read">Trạng thái</option>
							</Form.Select>
						</div>
					</div>
				</div>
			</div>
			
			{/* Bulk actions */}
			{selectedNotifications.length > 0 && (
				<div className="alert alert-info d-flex justify-content-between align-items-center">
					<span>Đã chọn {selectedNotifications.length} thông báo</span>
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
											checked={selectedNotifications.length === notifications.length && notifications.length > 0}
										/>
									</th>
									<th>STT</th>
									<th>Người nhận</th>
									<th>Loại</th>
									<th>Nội dung</th>
									<th>Trạng thái</th>
									<th>Ngày tạo</th>
									<th>Hành động</th>
								</tr>
							</thead>
							<tbody>
								{notifications.map((notification, idx) => (
									<tr key={notification._id}>
										<td>
											<Form.Check 
												type="checkbox"
												checked={selectedNotifications.includes(notification._id)}
												onChange={() => handleSelectNotification(notification._id)}
											/>
										</td>
										<td>{(filters.page - 1) * filters.limit + idx + 1}</td>
										<td>{notification.userId?.username || "N/A"}</td>
										<td>
											<span className={`badge ${
												notification.type === 'like' ? 'bg-danger' : 
												notification.type === 'comment' ? 'bg-primary' : 
												notification.type === 'reply' ? 'bg-info' : 
												notification.type === 'system' ? 'bg-warning' : 'bg-secondary'
											}`}>
												{notification.type}
											</span>
										</td>
										<td>
											<div style={{maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
												{notification.data?.message || JSON.stringify(notification.data)}
											</div>
										</td>
										<td>
											{notification.read ? (
												<span className="badge bg-success">Đã đọc</span>
											) : (
												<span className="badge bg-warning">Chưa đọc</span>
											)}
										</td>
										<td>{new Date(notification.createdAt).toLocaleDateString()}</td>
										<td>
											<button
												className="btn btn-info btn-sm"
												onClick={() => handleShowModal(notification)}
											>
												Xem
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					</div>
				</div>
			)}

			{/* Modal hiển thị thông tin thông báo */}
			<Modal show={showModal} onHide={handleCloseModal} centered size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Chi tiết thông báo</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedNotification && (
						<div>
							<div className="row mb-3">
								<div className="col-md-6">
									<p><strong>Người nhận:</strong> {selectedNotification.userId?.username || "N/A"}</p>
									<p><strong>Email:</strong> {selectedNotification.userId?.email || "N/A"}</p>
								</div>
								<div className="col-md-6">
									<p><strong>Loại:</strong> <span className="badge bg-primary">{selectedNotification.type}</span></p>
									<p>
										<strong>Trạng thái:</strong> 
										{selectedNotification.read ? (
											<span className="badge bg-success ms-2">Đã đọc</span>
										) : (
											<span className="badge bg-warning ms-2">Chưa đọc</span>
										)}
									</p>
								</div>
							</div>
							<div className="mb-3">
								<p><strong>Ngày tạo:</strong> {new Date(selectedNotification.createdAt).toLocaleString()}</p>
								{selectedNotification.readAt && (
									<p><strong>Ngày đọc:</strong> {new Date(selectedNotification.readAt).toLocaleString()}</p>
								)}
							</div>
							<div className="mb-3">
								<strong>Dữ liệu:</strong>
								<pre 
									style={{
										padding: "10px", 
										background: "#f8f9fa", 
										borderRadius: "5px",
										marginTop: "10px",
										maxHeight: "300px",
										overflow: "auto"
									}}
								>
									{JSON.stringify(selectedNotification.data, null, 2)}
								</pre>
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
			
			{/* Modal gửi thông báo */}
			<Modal show={showSendModal} onHide={() => setShowSendModal(false)} centered>
				<Modal.Header closeButton>
					<Modal.Title>Gửi thông báo</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group className="mb-3">
							<Form.Label>User IDs (phân cách bằng dấu phẩy)</Form.Label>
							<Form.Control
								type="text"
								placeholder="userId1, userId2, userId3..."
								value={sendForm.userIds}
								onChange={(e) => setSendForm({...sendForm, userIds: e.target.value})}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Loại thông báo</Form.Label>
							<Form.Select
								value={sendForm.type}
								onChange={(e) => setSendForm({...sendForm, type: e.target.value})}
							>
								<option value="info">Info</option>
								<option value="system">System</option>
								<option value="warning">Warning</option>
							</Form.Select>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Label>Nội dung</Form.Label>
							<Form.Control
								as="textarea"
								rows={3}
								placeholder="Nhập nội dung thông báo..."
								value={sendForm.message}
								onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
							/>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<button className="btn btn-secondary" onClick={() => setShowSendModal(false)}>
						Hủy
					</button>
					<button className="btn btn-primary" onClick={handleSendNotifications}>
						Gửi
					</button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};

export default NotificationAdmin;
