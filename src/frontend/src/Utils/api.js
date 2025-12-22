// ============================================
// API CONFIGURATION & HELPERS
// ============================================
const API_BASE = `${process.env.REACT_APP_API_BASE}/api`;

// Helper để thêm header Cache-Control
const withNoStore = (headers = {}) => ({
  ...headers,
  "Cache-Control": "no-store",
  'X-Client-Domain': window.location.host,
});

// Helper để xử lý response
const handleResponse = async (response) => {
  // if (!response.ok) {
  //   const errorData = await response.json();
  //   const error = new Error(errorData.error || "Lỗi từ server");
  //   error.status = response.status;
  //   throw error;
  // }
  return response.json();

};

// ============================================
// AUTH APIs
// ============================================
export const login = async (data) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const register = async (data) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const verifyEmailOTP = async (data) => {
  const response = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};
export const verifyEmailToken = async (token) => {
  const response = await fetch(`${API_BASE}/auth/verify-email?token=${token}`, {
    method: "GET",
    headers: withNoStore({ "Content-Type": "application/json" }),
  });
  return handleResponse(response);
};

export const resendVerificationOTP = async (data) => {
  const response = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email }),
  });
  return handleResponse(response);
};

export const verifyResetCode = async (email, code) => {
  const response = await fetch(`${API_BASE}/auth/verify-reset-code`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, code }),
  });
  return handleResponse(response);
};

export const resetPassword = async (token, newPassword , email = null, code = null) => {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: withNoStore({ "Content-Type": "application/json" }),
    body: JSON.stringify({ token, newPassword, email, code }),
  });
  return handleResponse(response);
};

// ============================================
// USER APIs
// ============================================
export const getProfile = async (token) => {
  const response = await fetch(`${API_BASE}/user`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const updateProfile = async (token, data) => {
  const isFormData = data instanceof FormData;
  const headers = withNoStore(
    isFormData 
      ? { Authorization: `Bearer ${token}` } 
      : { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  );
  const response = await fetch(`${API_BASE}/user`, {
    method: "PUT",  
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const getActiveUsers = async (token, limit = 10, onlineOnly = false) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (onlineOnly) {
    params.append('onlineOnly', 'true');
  }
  
  const headers = withNoStore({
    "Content-Type": "application/json",
  });
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}/users/active?${params.toString()}`, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

// API riêng: Lấy chỉ user đang online (không cần có bài viết)
export const getOnlineUsers = async (token, limit = 50) => {
  const headers = withNoStore({
    "Content-Type": "application/json",
  });
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}/users/online?limit=${limit}`, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};
//   const response = await fetch(`${API_BASE}/users/online?limit=${limit}`, {
//     method: "GET",
//     headers: withNoStore({
//       "Content-Type": "application/json",
//     }),
//   });
//   return handleResponse(response);
// };

// Lấy thông tin user theo username (public profile)
export const getUserByUsername = async (username, token) => {
  const headers = withNoStore({
    "Content-Type": "application/json",
  });
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}/users/${username}`, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

// Lấy bài viết của user theo username
export const getUserPosts = async (username, params = {}, token) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = params;
  const queryParams = new URLSearchParams({ page, limit, sortBy, order }).toString();
  
  const headers = withNoStore({
    "Content-Type": "application/json",
  });
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}/users/${username}/posts?${queryParams}`, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

export const changePassword = async (token, data) => {
  const response = await fetch(`${API_BASE}/user/change-password`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

// ============================================
// FORUM STATS API (Public)
// ============================================
export const getForumStats = async () => {
  const response = await fetch(`${API_BASE}/stats/forum`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};

// ============================================
// CATEGORY APIs
// ============================================
export const getCategories = async () => {
  const response = await fetch(`${API_BASE}/categories`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};
export const getPostsByCategory = async (slug, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/posts/category/${slug}?${query}` : `${API_BASE}/posts/category/${slug}`;
  const response = await fetch(url, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};

export const getCategoryById = async (categoryId) => {
  const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};

export const createCategory = async (token, data) => {
  const response = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateCategory = async (token, categoryId, data) => {
  const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteCategory = async (token, categoryId) => {
  const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// POST APIs
// ============================================
export const getAllPosts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/posts?${query}` : `${API_BASE}/posts`;
  const response = await fetch(url, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};

export const getPostBySlug = async (slug) => {
  const response = await fetch(`${API_BASE}/posts/${slug}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};
// chưa dùng đến
// export const getFeaturedPosts = async () => {
//   const response = await fetch(`${API_BASE}/posts/featured`, {
//     method: "GET",
//     headers: withNoStore({
//       "Content-Type": "application/json",
//     }),
//   });
//   return handleResponse(response);
// };
export const createPost = async (token, data) => {
  const isFormData = data instanceof FormData;
  const headers = withNoStore(isFormData ? { Authorization: `Bearer ${token}` } : { "Content-Type": "application/json", Authorization: `Bearer ${token}` });
  const response = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updatePost = async (token, postId, data) => {
  const isFormData = data instanceof FormData;
  const headers = withNoStore(
    isFormData 
      ? { Authorization: `Bearer ${token}` } 
      : { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  );
  const response = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "PUT",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};
export const deletePost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// ADMIN - USER MANAGEMENT APIs
// ============================================
export const deleteUser = async (token, userId) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Ban/Unban user
export const banUser = async (token, userId) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const unbanUser = async (token, userId) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/unban`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Like/Unlike post (cần thêm route trong backend nếu chưa có)
export const likePost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const unlikePost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/posts/${postId}/unlike`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Like/Unlike comment (cần thêm route trong backend nếu chưa có)
export const likeComment = async (token, commentId) => {
  const response = await fetch(`${API_BASE}/comments/${commentId}/like`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const unlikeComment = async (token, commentId) => {
  const response = await fetch(`${API_BASE}/comments/${commentId}/unlike`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// COMMENT APIs
// ============================================
export const createComment = async (token, data) => {
  const isFormData = data instanceof FormData;
  const headers = withNoStore(
    isFormData 
      ? { Authorization: `Bearer ${token}` } 
      : { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  );
  const response = await fetch(`${API_BASE}/comments`, {
    method: "POST",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateComment = async (token, commentId, data) => {
  const isFormData = data instanceof FormData;
  const headers = withNoStore(
    isFormData 
      ? { Authorization: `Bearer ${token}` } 
      : { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  );
  const response = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: "PUT",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteComment = async (token, commentId) => {
  const response = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// NOTIFICATION APIs
// ============================================
export const getNotifications = async (token, limit = 20, skip = 0) => {
  const response = await fetch(`${API_BASE}/notifications?limit=${limit}&skip=${skip}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Alias for getNotifications to match usage in components
export const getMyNotifications = getNotifications;

export const markNotificationAsRead = async (token, notificationId) => {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Alias for markNotificationAsRead
export const markAsRead = markNotificationAsRead;

export const markAllNotificationsAsRead = async (token) => {
  const response = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Alias for markAllNotificationsAsRead
export const markAllAsRead = markAllNotificationsAsRead;

export const deleteNotification = async (token, notificationId) => {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// ADMIN APIs
// ============================================

// ===== ADMIN - CATEGORY MANAGEMENT =====
export const getAllCategoriesWithStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/categories/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getCategoriesStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/categories/summary`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteMultipleCategories = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/categories/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const searchCategories = async (token, keyword, page = 1, limit = 20) => {
  const response = await fetch(`${API_BASE}/admin/categories/search?keyword=${keyword}&page=${page}&limit=${limit}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ===== ADMIN - USER MANAGEMENT =====
export const getAllUsersAdmin = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/admin/users/all?${queryParams}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};


export const banMultipleUsers = async (token, userIds, duration, reason) => {
  const response = await fetch(`${API_BASE}/admin/users/bulk-ban`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ userIds, duration, reason }),
  });
  return handleResponse(response);
};

export const unbanMultipleUsers = async (token, userIds) => {
  const response = await fetch(`${API_BASE}/admin/users/bulk-unban`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ userIds }),
  });
  return handleResponse(response);
};

export const deleteMultipleUsers = async (token, userIds) => {
  const response = await fetch(`${API_BASE}/admin/users/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ userIds }),
  });
  return handleResponse(response);
};

export const updateUserRole = async (token, userId, role) => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ role }),
  });
  return handleResponse(response);
};

export const getUsersStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/users/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ===== ADMIN - POST MANAGEMENT =====
export const getAllPostsAdmin = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/admin/posts/all?${queryParams}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const togglePinPost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/admin/posts/${postId}/pin`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const toggleLockPost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/admin/posts/${postId}/lock`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteMultiplePosts = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/posts/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const movePosts = async (token, postIds, categoryId) => {
  const response = await fetch(`${API_BASE}/admin/posts/move`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ postIds, categoryId }),
  });
  return handleResponse(response);
};

export const getPostsStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/posts/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// SOFT DELETE / RESTORE (ADMIN)
export const softDeletePostAdmin = async (token, postId) => {
  const response = await fetch(`${API_BASE}/admin/posts/${postId}/soft-delete`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const restorePostAdmin = async (token, postId) => {
  const response = await fetch(`${API_BASE}/admin/posts/${postId}/restore`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const bulkSoftDeletePostsAdmin = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/posts/bulk-soft-delete`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const bulkRestorePostsAdmin = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/posts/bulk-restore`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

// ===== ADMIN - COMMENT MANAGEMENT =====
export const getAllCommentsAdmin = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/admin/comments/all?${queryParams}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteCommentAdmin = async (token, commentId) => {
  const response = await fetch(`${API_BASE}/admin/comments/${commentId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteMultipleComments = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/comments/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const getCommentsStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/comments/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ===== ADMIN - NOTIFICATION MANAGEMENT =====
export const getAllNotificationsAdmin = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/admin/notifications/all?${queryParams}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteMultipleNotifications = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/notifications/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const deleteUserNotifications = async (token, userId) => {
  const response = await fetch(`${API_BASE}/admin/notifications/user/${userId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const sendBulkNotifications = async (token, userIds, type, message, data = {}) => {
  const response = await fetch(`${API_BASE}/admin/notifications/bulk-send`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ userIds, type, message, data }),
  });
  return handleResponse(response);
};

export const getNotificationsStats = async (token) => {
  const response = await fetch(`${API_BASE}/admin/notifications/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// REPORT APIs
// ============================================
export const createReport = async (token, targetType, targetId, reason) => {
  const response = await fetch(`${API_BASE}/reports`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ targetType, targetId, reason }),
  });
  return handleResponse(response);
};

export const getMyReports = async (token, page = 1, limit = 20, status = null) => {
  let url = `${API_BASE}/reports?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const cancelReport = async (token, reportId) => {
  const response = await fetch(`${API_BASE}/reports/${reportId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// ADMIN - REPORT APIs
// ============================================
export const getAllReportsAdmin = async (token, page = 1, limit = 20, filters = {}) => {
  let url = `${API_BASE}/admin/reports/all?page=${page}&limit=${limit}`;
  
  if (filters.status) url += `&status=${filters.status}`;
  if (filters.targetType) url += `&targetType=${filters.targetType}`;
  if (filters.keyword) url += `&keyword=${encodeURIComponent(filters.keyword)}`;
  if (filters.sortBy) url += `&sortBy=${filters.sortBy}`;
  if (filters.order) url += `&order=${filters.order}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getReportDetailAdmin = async (token, reportId) => {
  const response = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getReportsByTargetAdmin = async (token, targetType, targetId) => {
  const response = await fetch(`${API_BASE}/admin/reports/target/${targetType}/${targetId}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const updateReportStatusAdmin = async (token, reportId, status, action = null) => {
  const response = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ status, action }),
  });
  return handleResponse(response);
};

export const deleteReportAdmin = async (token, reportId) => {
  const response = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const deleteMultipleReportsAdmin = async (token, ids) => {
  const response = await fetch(`${API_BASE}/admin/reports/bulk-delete`, {
    method: "DELETE",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
};

export const bulkHandleReportsAdmin = async (token, ids, status, action = null) => {
  const response = await fetch(`${API_BASE}/admin/reports/bulk-handle`, {
    method: "POST",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ ids, status, action }),
  });
  return handleResponse(response);
};

export const getReportsStatsAdmin = async (token) => {
  const response = await fetch(`${API_BASE}/admin/reports/stats`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// DOCUMENT LIBRARY APIs
// ============================================
export const getDocumentCategories = async (token) => {
  const response = await fetch(`${API_BASE}/documents/categories`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getDocuments = async (token, params = {}) => {
  const { page = 1, limit = 20, keyword = '', category = '', postCategory = '' } = params;
  const query = new URLSearchParams({ page, limit });
  if (keyword) query.set('keyword', keyword);
  if (category) query.set('category', category);
  if (postCategory) query.set('postCategory', postCategory);

  const response = await fetch(`${API_BASE}/documents?${query.toString()}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// export const getDocumentsByCategory = async (token, category, params = {}) => {
//   const { page = 1, limit = 20, keyword = '' } = params;
//   const q = new URLSearchParams({ page, limit });
//   if (keyword) q.set('keyword', keyword);
//   const response = await fetch(`${API_BASE}/documents/by-category/${category}?${q.toString()}`, {
//     method: "GET",
//     headers: withNoStore({
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     }),
//   });
//   return handleResponse(response);
// };

// export const getDocumentDetail = async (token, id) => {
//   const response = await fetch(`${API_BASE}/documents/${id}`, {
//     method: "GET",
//     headers: withNoStore({
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     }),
//   });
//   return handleResponse(response);
// };

// ============================================
// CHAT APIs
// ============================================
export const getMyConversations = async (token) => {
  const response = await fetch(`${API_BASE}/chat/conversations`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getPrivateChatHistory = async (token, peerId, page = 1, limit = 50) => {
  const response = await fetch(`${API_BASE}/chat/private/${peerId}?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const uploadChatFiles = async (token, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE}/chat/upload`, {
    method: "POST",
    headers: withNoStore({
      Authorization: `Bearer ${token}`,
    }),
    body: formData,
  });
  return handleResponse(response);
};

// ============================================
// GLOBAL CHAT APIs
// ============================================
export const getGlobalChatHistory = async (token, page = 1, limit = 50) => {
  const response = await fetch(`${API_BASE}/chat/global/history?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

export const getOnlineUsersCount = async (token) => {
  const response = await fetch(`${API_BASE}/chat/global/online-count`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// ============================================
// MOD APIs
// ============================================

// Lấy danh sách bài viết chờ duyệt
export const getPendingPosts = async (token, queryParams = '') => {
  const url = queryParams 
    ? `${API_BASE}/mod/posts/pending?${queryParams}`
    : `${API_BASE}/mod/posts/pending`;
  const response = await fetch(url, {
    method: "GET",
    headers: withNoStore({
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Duyệt bài viết
export const approvePost = async (token, postId) => {
  const response = await fetch(`${API_BASE}/mod/posts/${postId}/approve`, {
    method: "PUT",
    headers: withNoStore({
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};

// Từ chối bài viết
export const rejectPost = async (token, postId, reason) => {
  const response = await fetch(`${API_BASE}/mod/posts/${postId}/reject`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
};

// Lấy thống kê moderation
export const getModerationStats = async (token) => {
  const response = await fetch(`${API_BASE}/mod/posts/stats`, {
    method: "GET",
    headers: withNoStore({
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};
