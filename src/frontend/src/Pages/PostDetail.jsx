import React, { useEffect, useState } from "react";
import Layout from '../Components/Layout';
import { useParams } from "react-router-dom";
import { getPostBySlug } from "../Utils/api";

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await getPostBySlug(slug);
        setPost(data);
        setError(null);
      } catch (err) {
        setError("Không tìm thấy bài viết hoặc có lỗi xảy ra.");
        setPost(null);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  return (
      <div className="container mt-4">
        <h2 className="mb-4">Chi tiết bài viết</h2>
        {loading ? (
          <div className="alert alert-info">Đang tải bài viết...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : post ? (
          <div className="card mb-4">
            <div className="card-header">
              <h4>{post.title}</h4>
              <span className="badge bg-primary ms-2">{post.categoryId?.title || post.categoryId}</span>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <span className="me-3"><i className="bi bi-person-circle me-1"></i>{post.authorId?.username || post.authorId}</span>
                <span className="me-3"><i className="bi bi-clock me-1"></i>{new Date(post.createdAt).toLocaleString()}</span>
                <span className="me-3"><i className="bi bi-eye me-1"></i>{post.views} lượt xem</span>
                <span className="me-3"><i className="bi bi-chat-dots me-1"></i>{post.commentsCount} bình luận</span>
                <span className="me-3"><i className="bi bi-hand-thumbs-up me-1"></i>{post.likesCount} thích</span>
              </div>
              <div className="mb-3 text-muted">{post.excerpt}</div>
              <div className="mb-3">{post.content}</div>
              {post.tags && post.tags.length > 0 && (
                <div className="mb-2">
                  <strong>Thẻ:</strong> {post.tags.join(", ")}
                </div>
              )}
              {post.attachments && post.attachments.length > 0 && (
                <div className="mb-2">
                  <strong>Đính kèm:</strong>
                  <ul>
                    {post.attachments.map((file, idx) => (
                      <li key={idx}><a href={file.storageUrl || file} target="_blank" rel="noopener noreferrer">{file.filename || file}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">Không có dữ liệu bài viết.</div>
        )}
      </div>
  );
}
