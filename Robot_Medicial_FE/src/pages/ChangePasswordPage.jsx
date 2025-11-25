// src/pages/ChangePasswordPage.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";
import { changePassword } from "@/services/authService";

export default function ChangePasswordPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [currentPwd, setCurrentPwd] = useState("");
    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [show, setShow] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    // Strength rules
    const rules = useMemo(() => ([
        { key: "len", label: "Ít nhất 8 ký tự", ok: pwd.length >= 8 },
        { key: "upper", label: "Có chữ hoa", ok: /[A-ZÀ-Ỵ]/.test(pwd) },
        { key: "lower", label: "Có chữ thường", ok: /[a-zà-ÿ]/.test(pwd) },
        { key: "num", label: "Có số", ok: /\d/.test(pwd) },
        { key: "sym", label: "Ký tự đặc biệt", ok: /[^\w\s]/.test(pwd) },
    ]), [pwd]);

    const allOk = rules.every(r => r.ok);
    const match = pwd && pwd2 && pwd === pwd2;
    const canSubmit = allOk && match && currentPwd && !submitting;

    function strengthLevel() {
        const n = rules.filter(r => r.ok).length;
        if (n <= 2) return { label: "Yếu", variant: "danger", width: "25%" };
        if (n === 3) return { label: "Trung bình", variant: "warning", width: "60%" };
        if (n >= 4) return { label: "Mạnh", variant: "success", width: "100%" };
        return { label: "", variant: "secondary", width: "0%" };
    }

    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError("");

        try {
            const result = await changePassword({
                currentPassword: currentPwd,
                newPassword: pwd,
                confirmPassword: pwd2,
            });

            setSubmitting(false);
            setDone(true);

            // Redirect về user profile sau 2 giây
            setTimeout(() => {
                navigate("/user-profile");
            }, 2000);
        } catch (err) {
            setSubmitting(false);
            setError(err.message || "Đổi mật khẩu thất bại");
        }
    }

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            minHeight: '100vh',
            background: `radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                  radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                  linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%)`
        }}>
            <style>{`
                :root{--teal:#0d9488;--ink:#0f172a}
                .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);}
                .rounded-2xl{border-radius:22px}
                .btn-teal{background:linear-gradient(135deg, #0d9488 0%, #0891b2 100%);border:none;color:white;font-weight:700;transition:all 0.3s}
                .btn-teal:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(13,148,136,0.3)}
                .btn-teal:disabled{opacity:0.6;cursor:not-allowed;transform:none}
                .title{font-weight:800; letter-spacing:.2px; color:#0b1432}
                .subtitle{color:#3f556e}
                .hero-emoji{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg, #0d9488, #0891b2);color:#fff}
                .rule i{width:18px}
                .form-control:focus{border-color:#0d9488;box-shadow:0 0 0 0.2rem rgba(13,148,136,0.15)}
            `}</style>

            <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <div className="glass rounded-2xl p-4 p-md-5" style={{ width: '100%', maxWidth: 520 }}>
                    {!done ? (
                        <>
                            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                <span className="hero-emoji">
                                    <i className="bi bi-key"></i>
                                </span>
                                <h4 className="title mb-0">Đổi Mật Khẩu</h4>
                            </div>
                            <p className="subtitle text-center mb-4">
                                Tạo mật khẩu mới đủ mạnh để bảo vệ tài khoản của bạn.
                            </p>

                            {/* Error Alert */}
                            {error && (
                                <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    <div>{error}</div>
                                </div>
                            )}

                            <form onSubmit={onSubmit} noValidate>
                                {/* Current Password */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-lock me-1" style={{ color: '#0d9488' }}></i>
                                        Mật khẩu hiện tại <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type={show ? 'text' : 'password'}
                                        className="form-control form-control-lg rounded-pill"
                                        placeholder="Nhập mật khẩu hiện tại"
                                        value={currentPwd}
                                        onChange={e => {
                                            setCurrentPwd(e.target.value);
                                            setError("");
                                        }}
                                        autoComplete="current-password"
                                    />
                                </div>

                                {/* New Password */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-lock-fill me-1" style={{ color: '#0d9488' }}></i>
                                        Mật khẩu mới <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type={show ? 'text' : 'password'}
                                        className="form-control form-control-lg rounded-pill"
                                        placeholder="Tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt"
                                        value={pwd}
                                        onChange={e => {
                                            setPwd(e.target.value);
                                            setError("");
                                        }}
                                        autoComplete="new-password"
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="mb-2">
                                    <label className="form-label">
                                        <i className="bi bi-shield-check me-1" style={{ color: '#0d9488' }}></i>
                                        Xác nhận mật khẩu mới <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type={show ? 'text' : 'password'}
                                        className={`form-control form-control-lg rounded-pill ${pwd2 && !match ? 'is-invalid' : ''}`}
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={pwd2}
                                        onChange={e => {
                                            setPwd2(e.target.value);
                                            setError("");
                                        }}
                                        autoComplete="new-password"
                                    />
                                    {pwd2 && !match && (
                                        <div className="invalid-feedback">
                                            <i className="bi bi-x-circle me-1"></i>
                                            Mật khẩu không khớp
                                        </div>
                                    )}
                                </div>

                                {/* Show Password Toggle */}
                                <div className="form-check mb-3">
                                    <input
                                        id="showPwd"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={show}
                                        onChange={e => setShow(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="showPwd">
                                        <i className="bi bi-eye me-1"></i>
                                        Hiển thị mật khẩu
                                    </label>
                                </div>

                                {/* Strength Indicator */}
                                {pwd && (
                                    <div className="mb-3">
                                        <div className="progress" style={{ height: '8px' }} role="progressbar">
                                            <div
                                                className={`progress-bar bg-${strengthLevel().variant}`}
                                                style={{ width: strengthLevel().width, transition: 'width 0.3s ease' }}
                                            ></div>
                                        </div>
                                        <div className="small text-muted mt-1">
                                            Độ mạnh: <strong className={`text-${strengthLevel().variant}`}>
                                                {strengthLevel().label}
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                {/* Rules Checklist */}
                                <div className="row g-2 small mb-4">
                                    {rules.map(r => (
                                        <div key={r.key} className="col-sm-6 rule d-flex align-items-center gap-2">
                                            <i className={`bi ${r.ok ? 'bi-check-circle-fill text-success' : 'bi-dot text-muted'}`}></i>
                                            <span className={r.ok ? 'text-success fw-semibold' : 'text-muted'}>
                                                {r.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Buttons */}
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill"
                                        onClick={() => navigate("/user-profile")}
                                        disabled={submitting}
                                        style={{ borderColor: '#0d9488', color: '#0d9488' }}
                                    >
                                        <i className="bi bi-arrow-left me-1"></i> Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="btn btn-teal rounded-pill px-4"
                                    >
                                        {submitting && (
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        )}
                                        <i className="bi bi-check-lg me-1"></i>
                                        Đổi mật khẩu
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="mb-3">
                                <div
                                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                                        color: 'white',
                                        fontSize: '36px'
                                    }}
                                >
                                    <i className="bi bi-check-lg"></i>
                                </div>
                            </div>
                            <h5 className="fw-bold mb-2">Mật khẩu đã được cập nhật</h5>
                            <p className="subtitle mb-4">
                                Bạn đã đổi mật khẩu thành công. Đang chuyển về trang hồ sơ...
                            </p>
                            <div className="d-flex justify-content-center gap-2">
                                <button
                                    className="btn btn-outline-secondary rounded-pill px-4"
                                    onClick={() => navigate("/user-profile")}
                                    style={{ borderColor: '#0d9488', color: '#0d9488' }}
                                >
                                    <i className="bi bi-person-circle me-1"></i>
                                    Về hồ sơ
                                </button>
                                <button
                                    className="btn btn-teal rounded-pill px-4"
                                    onClick={() => navigate("/dashboard")}
                                >
                                    <i className="bi bi-house-door me-1"></i>
                                    Trang chủ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}