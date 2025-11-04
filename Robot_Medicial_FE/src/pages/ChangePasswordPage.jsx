import { useEffect, useMemo, useState } from "react";

/**
 * MedFleet • Reset Password Screen (React + Bootstrap)
 * Tone: teal/seafoam + glass; consistent with other screens
 */
export default function ResetPassword() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true; document.body.appendChild(js);

        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
    }, []);

    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [show, setShow] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    // strength rules
    const rules = useMemo(() => ([
        { key: "len", label: "Ít nhất 8 ký tự", ok: pwd.length >= 8 },
        { key: "upper", label: "Có chữ hoa", ok: /[A-ZÀ-Ỵ]/.test(pwd) },
        { key: "lower", label: "Có chữ thường", ok: /[a-zà-ÿ]/.test(pwd) },
        { key: "num", label: "Có số", ok: /\d/.test(pwd) },
        { key: "sym", label: "Ký tự đặc biệt", ok: /[^\w\s]/.test(pwd) },
    ]), [pwd]);

    const allOk = rules.every(r => r.ok);
    const match = pwd && pwd2 && pwd === pwd2;
    const canSubmit = allOk && match && !submitting;

    function strengthLevel() {
        const n = rules.filter(r => r.ok).length;
        if (n <= 2) return { label: "Yếu", variant: "danger", width: "25%" };
        if (n === 3) return { label: "Trung bình", variant: "warning", width: "60%" };
        if (n >= 4) return { label: "Mạnh", variant: "success", width: "100%" };
        return { label: "", variant: "secondary", width: "0%" };
    }

    async function onSubmit(e) {
        e.preventDefault(); if (!canSubmit) return; setSubmitting(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 900));
        setSubmitting(false); setDone(true);
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
        :root{--teal:#4CE1C6;--ink:#0f172a}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);}
        .rounded-2xl{border-radius:22px}
        .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
        .btn-teal:hover{filter:brightness(1.05)}
        .title{font-weight:800; letter-spacing:.2px; color:#0b1432}
        .subtitle{color:#3f556e}
        .hero-emoji{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0ea5a5,#14e2c1);color:#fff}
        .rule i{width:18px}
      `}</style>

            <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <div className="glass rounded-2xl p-4 p-md-5" style={{ width: '100%', maxWidth: 520 }}>
                    {!done ? (
                        <>
                            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                <span className="hero-emoji"><i className="bi bi-key"></i></span>
                                <h4 className="title mb-0">Đặt Lại Mật Khẩu</h4>
                            </div>
                            <p className="subtitle text-center mb-4">Tạo mật khẩu mới đủ mạnh để bảo vệ tài khoản.</p>

                            <form onSubmit={onSubmit} noValidate>
                                <div className="mb-3">
                                    <label className="form-label">Mật khẩu mới</label>
                                    <input type={show ? 'text' : 'password'} className="form-control form-control-lg rounded-pill" placeholder="Tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt" value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="new-password" />
                                </div>
                                <div className="mb-2">
                                    <label className="form-label">Xác nhận mật khẩu mới</label>
                                    <input type={show ? 'text' : 'password'} className={`form-control form-control-lg rounded-pill ${pwd2 && !match ? 'is-invalid' : ''}`} value={pwd2} onChange={e => setPwd2(e.target.value)} autoComplete="new-password" />
                                    {pwd2 && !match && <div className="invalid-feedback">Mật khẩu không khớp</div>}
                                </div>

                                {/* Show password toggle */}
                                <div className="form-check mb-3">
                                    <input id="showPwd" className="form-check-input" type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
                                    <label className="form-check-label" htmlFor="showPwd">Hiển thị mật khẩu</label>
                                </div>

                                {/* Strength indicator */}
                                <div className="mb-3">
                                    <div className="progress" role="progressbar" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={5}>
                                        <div className={`progress-bar bg-${strengthLevel().variant}`} style={{ width: strengthLevel().width }}></div>
                                    </div>
                                    <div className="small text-muted mt-1">Độ mạnh: <strong>{strengthLevel().label}</strong></div>
                                </div>

                                {/* Rules checklist */}
                                <div className="row g-2 small mb-4">
                                    {rules.map(r => (
                                        <div key={r.key} className="col-sm-6 rule d-flex align-items-center gap-2">
                                            <i className={`bi ${r.ok ? 'bi-check-circle-fill text-success' : 'bi-dot text-muted'}`}></i>
                                            <span className={r.ok ? 'text-success' : ''}>{r.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="d-flex align-items-center justify-content-between">
                                    <a className="btn btn-outline-secondary rounded-pill" href="#"><i className="bi bi-arrow-left me-1"></i> Quay lại</a>
                                    <button type="submit" disabled={!canSubmit} className="btn btn-teal rounded-pill px-4">
                                        {submitting && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                                        Đặt lại mật khẩu
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="display-6 mb-2">🔐</div>
                            <h5 className="fw-bold">Mật khẩu đã được cập nhật</h5>
                            <p className="subtitle">Bạn có thể dùng mật khẩu mới để đăng nhập.</p>
                            <a className="btn btn-teal rounded-pill px-4" href="/login">Đăng nhập</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}