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

export const getActiveUsers = async (limit = 10) => {
  const response = await fetch(`${API_BASE}/users/active?limit=${limit}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};

export const getOnlineUsers = async (limit = 50) => {
  const response = await fetch(`${API_BASE}/users/online?limit=${limit}`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
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
export const getPostsByCategory = async (slug) => {
  const response = await fetch(`${API_BASE}/posts/category/${slug}`, {
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
export const getAllPosts = async () => {
  const response = await fetch(`${API_BASE}/posts`, {
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

export const getFeaturedPosts = async () => {
  const response = await fetch(`${API_BASE}/posts/featured`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};
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
export const getAllUsers = async (token) => {
  const response = await fetch(`${API_BASE}/admin/users`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
  });
  return handleResponse(response);
};
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
