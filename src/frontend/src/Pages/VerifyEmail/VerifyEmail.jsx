import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { verifyEmailToken } from '../../Utils/api';

export function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Đang xác thực email của bạn...');
    const token = searchParams.get('token');
    const hasVerified = useRef(false);

    useEffect(() => {
        const verifyToken = async () => {
            // Prevent double API call (React StrictMode in development)
            if (hasVerified.current) return;
            hasVerified.current = true;

            if (!token) {
                setStatus('error');
                setMessage('Link xác thực không hợp lệ. Vui lòng kiểm tra lại email của bạn.');
                return;
            }

            try {
                const data = await verifyEmailToken(token);

                if (data.success) {
                    setStatus('success');
                    setMessage(data.message || 'Xác thực email thành công! Đang chuyển đến trang đăng nhập...');
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Xác thực thất bại. Vui lòng thử lại.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            }
        };

        verifyToken();
    }, [token, navigate]);

    return (
        <React.Fragment>
            <Helmet>
                <title>Xác thực email - Diễn đàn Sinh viên</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <div className="py-5" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-6 col-lg-5">
                            <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
                                <div className="card-body p-5 text-center">
                                    {status === 'verifying' && (
                                        <>
                                            <div className="mb-4">
                                                <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                                                    <span className="visually-hidden">Đang xác thực...</span>
                                                </div>
                                            </div>
                                            <h2 className="mb-3">Đang xác thực email</h2>
                                            <p className="text-muted">{message}</p>
                                        </>
                                    )}

                                    {status === 'success' && (
                                        <>
                                            <div className="mb-4">
                                                <div
                                                    className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center"
                                                    style={{ width: '80px', height: '80px' }}
                                                >
                                                    <i className="material-icons text-success" style={{ fontSize: '48px' }}>success</i>
                                                </div>
                                            </div>
                                            <h2 className="text-success mb-3">Xác thực thành công!</h2>
                                            <p className="text-muted mb-4">{message}</p>
                                            <button
                                                className="btn btn-primary btn-lg px-5"
                                                onClick={() => navigate('/login')}
                                                style={{ borderRadius: '50px' }}
                                            >
                                                Đăng nhập ngay
                                            </button>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="mb-4">
                                                <div
                                                    className="rounded-circle bg-danger bg-opacity-10 d-inline-flex align-items-center justify-content-center"
                                                    style={{ width: '80px', height: '80px' }}
                                                >
                                                    <i className="material-icons text-danger" style={{ fontSize: '48px' }}>error</i>
                                                </div>
                                            </div>
                                            <h2 className="text-danger mb-3">Xác thực thất bại</h2>
                                            <p className="text-muted mb-4">{message}</p>
                                            <div className="d-grid gap-2">
                                                <button
                                                    className="btn btn-primary btn-lg"
                                                    onClick={() => navigate('/register')}
                                                    style={{ borderRadius: '50px' }}
                                                >
                                                    Quay lại đăng ký
                                                </button>
                                                <button
                                                    className="btn btn-outline-secondary btn-lg"
                                                    onClick={() => navigate('/login')}
                                                    style={{ borderRadius: '50px' }}
                                                >
                                                    Đến trang đăng nhập
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
