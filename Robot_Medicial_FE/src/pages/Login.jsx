import { useEffect, useRef, useState } from "react";
import logo from '../assets/image/logo.jpg';
import { useNavigate } from "react-router-dom";
import styles from '@/assets/styles/login.module.css';

export default function MedFleetLogin() {
    const [form, setForm] = useState({ username: "", password: "", remember: true });
    const [showPwd, setShowPwd] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const pwdRef = useRef(null);

    function onKeyUp(e) {
        if (e.getModifierState) setCapsLock(!!e.getModifierState("CapsLock"));
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError("");

        if (!form.username.trim() || !form.password) {
            setError("Vui lòng nhập đầy đủ Tài khoản & Mật khẩu");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.username, password: form.password }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Tài khoản hoặc mật khẩu không chính xác!`);
            }

            const data = await res.json();
            sessionStorage.setItem('token', data.token);
            navigate("/dashboard");
        } catch (err) {
            console.error("Lỗi đăng nhập:", err);
            setError(err.message || "Đăng nhập thất bại, vui lòng thử lại!");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            style={{
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                minHeight: '100vh',
                background: `radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                   radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                   linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%)`
            }}
        >
            <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <div className={`${styles.glass} ${styles.rounded2xl}`} style={{ width: '100%', maxWidth: 440 }}>
                    <div className={styles.topAccent}></div>
                    <div className="p-4 p-md-5">
                        <div className="text-center mb-3">
                            <div className="d-inline-flex align-items-center gap-2">
                                <img src={logo} alt="MedFleet Logo" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />
                                <div className="text-start">
                                    <div className="fw-black" style={{ letterSpacing: .2 }}>SEP490_G35</div>
                                    <small className="text-muted">Quản lý xe bệnh viện</small>
                                </div>
                            </div>
                        </div>
                        <h5 className="text-center fw-bold mb-3">Đăng nhập hệ thống</h5>

                        <form onSubmit={onSubmit} noValidate>
                            {/* Username */}
                            <div className="mb-3 position-relative">
                                <label className="form-label">Tài khoản</label>
                                <input
                                    name="username"
                                    className="form-control form-control-lg rounded-pill ps-3"
                                    placeholder="Tên đăng nhập hoặc email"
                                    value={form.username}
                                    onChange={handleChange}
                                    autoComplete="username"
                                />
                                <i className={`bi bi-person ${styles.fieldIcon}`}></i>
                            </div>

                            {/* Password */}
                            <div className="mb-3 position-relative">
                                <label className="form-label d-flex justify-content-between align-items-center">
                                    Mật khẩu {capsLock && <span className="badge text-bg-warning">CapsLock</span>}
                                </label>

                                <input
                                    ref={pwdRef}
                                    onKeyUp={onKeyUp}
                                    type={showPwd ? 'text' : 'password'}
                                    name="password"
                                    className="form-control form-control-lg rounded-pill ps-3 pe-5"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="current-password"
                                />

                                <button
                                    type="button"
                                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none d-flex align-items-center"
                                    onClick={() => setShowPwd(s => !s)}
                                    aria-label="Hiện/ẩn mật khẩu"
                                    style={{ marginTop: "18px" }}
                                >
                                    <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'} fs-5`}></i>
                                </button>
                            </div>


                            {/* Remember + Forgot */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="remember"
                                        name="remember"
                                        checked={form.remember}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="remember">Ghi nhớ</label>
                                </div>
                                <a className="small text-decoration-none" href="/forgot-password">Quên mật khẩu?</a>
                            </div>

                            {error && <div className="alert alert-danger py-2">{error}</div>}

                            <button disabled={submitting} type="submit" className={`${styles.btnTeal} w-100 rounded-pill py-2`}>
                                {submitting && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                                Đăng nhập
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
