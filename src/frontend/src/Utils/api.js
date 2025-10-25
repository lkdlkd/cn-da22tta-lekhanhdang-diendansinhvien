const API_BASE = `${process.env.REACT_APP_API_BASE}/api`;
// Helper để thêm header Cache-Control
const withNoStore = (headers = {}) => ({
  ...headers,
  "Cache-Control": "no-store",
  'X-Client-Domain': window.location.host, // Gửi domain của frontend

});

// Helper để xử lý response
const handleResponse = async (response) => {
  // if (!response.ok) {
  //   let errorMessage = "Có lỗi xảy ra";
  //   try {
  //     const contentType = response.headers.get("content-type");
  //     if (contentType && contentType.includes("application/json")) {
  //       const errorData = await response.json();
  //       if (errorData.error) {
  //         errorMessage = errorData.error;
  //       } else if (errorData.message) {
  //         errorMessage = errorData.message;
  //       }
  //     }
  //   } catch (e) {
  //     //  console.error("Error parsing API response:", e);
  //   }

  //   throw new Error(errorMessage);
  // }

  return response.json();
};

// Auth
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
  const response = await fetch(`${API_BASE}/user`, {
    method: "PUT",  
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
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

export const getCategories = async () => {
  const response = await fetch(`${API_BASE}/categories`, {
    method: "GET",
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
};
export const getPostsByCategory = async (categoryId) => {
  const response = await fetch(`${API_BASE}/categories/${categoryId}/posts`, {
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
  const response = await fetch(`${API_BASE}/posts`, {
    method: "POST", 
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updatePost = async (token, postId, data) => {
  const response = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "PUT",
    headers: withNoStore({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(data),
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
export const getAllPosts = async () => {
  const response = await fetch(`${API_BASE}/posts`, {
    method: "GET",  
    headers: withNoStore({
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response);
}
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
