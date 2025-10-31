import React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./Context/AuthContext";
import Home from "./Pages/Home";
import { Login } from "./Pages/Login/Login";
import { Register } from "./Pages/Register/register";
import Layout from "./Components/Layout";
import LayoutAdmin from "./Components/LayoutAdmin";
import AdminDashboard from "./Pages/Admin/AdminDashboard/AdminDashboard";
import CategoryAdmin from "./Pages/Admin/AdminDashboard/CategoryDashboard";
import UserAdmin from "./Pages/Admin/AdminDashboard/UserAdmin"; 
import PostAdmin from "./Pages/Admin/AdminDashboard/PostAdmin";
import CommentAdmin from "./Pages/Admin/AdminDashboard/CommentAdmin";
import NotificationAdmin from "./Pages/Admin/AdminDashboard/NotificationAdmin";
import PostDetail from "./Components/PostDetail";
import Profile from "./Pages/Profile/Profile";
import CategoryPosts from "./Pages/Category/CategoryPosts";
import Categories from "./Pages/Category/Categories";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing Page - hiển thị khi chưa có token */}
          {/* Routes không có Layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* <Route path="/" element={<Home />} /> */}


          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/category" element={<Categories />} />
            <Route path="/category/:slug" element={<CategoryPosts />} />
            <Route path="/profile" element={<Profile />} />
          </Route>


          {/* Routes cho Admin Layout */}
          <Route
            path="/admin"
            element={
              <AuthContext.Consumer>
                {({ auth }) =>
                  auth.token && auth.role === "admin" ? (
                    <Layout />
                  ) : (
                    <Navigate to="/404" />
                  )
                }
              </AuthContext.Consumer>
            }
          >
            <Route index element={<AdminDashboard />} />
            {/* <Route index element={<AdminDashboard />} /> */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<CategoryAdmin />} />
            <Route path="/admin/users" element={<UserAdmin />} />
            <Route path="/admin/posts" element={<PostAdmin />} />
            <Route path="/admin/comments" element={<CommentAdmin />} />
            <Route path="/admin/notifications" element={<NotificationAdmin />} />
            {/* <Route path="/admin/users" element={<UserAdmin />} />
            <Route path="/admin/documents" element={<DocumentAdmin />} />
            <Route path="/admin/categories" element={<CategoryAdmin />} />
            <Route path="/admin/orders" element={<OrderAdmin />} /> */}
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;