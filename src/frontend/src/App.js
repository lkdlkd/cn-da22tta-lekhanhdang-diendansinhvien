import React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./Context/AuthContext";
import Home from "./Pages/Home";
import { Login } from "./Pages/Login/Login";
import { Register } from "./Pages/Register/register";
import { VerifyEmail } from "./Pages/VerifyEmail/VerifyEmail";
import { ForgotPassword } from "./Pages/ForgotPassword/ForgotPassword";
import { ResetPassword } from "./Pages/ResetPassword/ResetPassword";
import Layout from "./Components/Layout";
import CategoryAdmin from "./Pages/Admin/AdminDashboard/CategoryDashboard";
import UserAdmin from "./Pages/Admin/AdminDashboard/UserAdmin";
import PostAdmin from "./Pages/Admin/AdminDashboard/PostAdmin";
import CommentAdmin from "./Pages/Admin/AdminDashboard/CommentAdmin";
import NotificationsAdmin from "./Pages/Admin/AdminDashboard/NotificationsAdmin";
import PostDetail from "./Components/PostDetail";
import Profile from "./Pages/Profile/Profile";
import MyReports from "./Pages/Profile/MyReports";
import UserProfile from "./Pages/Profile/UserProfile";
import CategoryPosts from "./Pages/Category/CategoryPosts";
import Categories from "./Pages/Category/Categories";
import ReportAdmin from "./Pages/Admin/AdminDashboard/ReportAdmin";
import Documents from "./Pages/Documents/Documents";
import GlobalChat from "./Pages/Forum/GlobaChat";
// import PrivateChat from "./Pages/Forum/PrivateChat";
import ListChat from "./Pages/Forum/ListChat";
import Notifications from "./Pages/Notifications/Notifications";
import ModerationDashboard from "./Pages/Mod/ModerationDashboard";
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing Page - hiển thị khi chưa có token */}
          {/* Routes không có Layout */}

          {/* <Route path="/" element={<Home />} /> */}


          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/category" element={<Categories />} />
            <Route path="/category/:slug" element={<CategoryPosts />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="/forum" element={<GlobalChat />} />
            <Route path="/messages" element={<ListChat />} />
            <Route path="/message/:username" element={<ListChat />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/mod/dashboard" element={<ModerationDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
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
            {/* <Route index element={<AdminDashboard />} /> */}
            {/* <Route index element={<AdminDashboard />} /> */}
            {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
            <Route path="/admin/categories" element={<CategoryAdmin />} />
            <Route path="/admin/users" element={<UserAdmin />} />
            <Route path="/admin/posts" element={<PostAdmin />} />
            <Route path="/admin/comments" element={<CommentAdmin />} />
            <Route path="/admin/notifications-management" element={<NotificationsAdmin />} />
            <Route path="/admin/reports" element={<ReportAdmin />} />
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