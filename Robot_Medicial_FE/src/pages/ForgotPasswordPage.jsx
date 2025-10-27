import { useEffect, useState } from "react";

/**
 * MedFleet • Forgot Password Screen (React + Bootstrap)
 * Tone: teal/seafoam + glass; matches other MedFleet screens
 */
export default function ForgotPassword() {
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

    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState();


    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(undefined);

        if (!isValidEmail(email)) {
            setError("Email không hợp lệ");
            return;
        }

        setSending(true);
        // Giả lập request — thay bằng API thật khi có
        await new Promise((r) => setTimeout(r, 900));
        setSending(false);
        setDone(true);
    }

    function masked(em) {
        if (!em.includes("@")) return em;
        const [u, d] = em.split("@");
        const vis = u.slice(0, Math.max(2, Math.min(4, u.length)));
        return `${vis}${"*".repeat(Math.max(2, u.length - vis.length))}@${d}`;
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
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.8);box-shadow:0 20px 60px rgba(15,23,42,.10);}
        .rounded-2xl{border-radius:22px}
        .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
        .btn-teal:hover{filter:brightness(1.05)}
        .title{font-weight:800; letter-spacing:.2px; color:#0b1432}
        .subtitle{color:#3f556e}
        .hero-emoji{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0ea5a5,#14e2c1);color:#fff}
      `}</style>

            <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <div className="glass rounded-2xl p-4 p-md-5" style={{ width: '100%', maxWidth: 460 }}>
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <span className="hero-emoji"><i className="bi bi-key"></i></span>
                        <h4 className="title mb-0">Quên Mật Khẩu</h4>
                    </div>
                    {!done ? (
                        <>
                            <p className="subtitle text-center mb-4">Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.</p>
                            <form onSubmit={onSubmit} noValidate>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input type="email" className={`form-control form-control-lg rounded-pill ${error ? 'is-invalid' : ''}`} placeholder="nhapemail@benhvien.vn" value={email} onChange={e => setEmail(e.target.value)} />
                                    {error && <div className="invalid-feedback">{error}</div>}
                                </div>
                                <button className="btn btn-teal w-100 rounded-pill py-2" type="submit" disabled={sending || !email}>
                                    {sending && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
                                    Xác nhận
                                </button>
                            </form>
                            <div className="text-center mt-3">
                                <a className="small text-decoration-none" href="#">← Quay lại đăng nhập</a>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="display-6 mb-2">📬</div>
                            <h5 className="fw-bold">Vui lòng kiểm tra email</h5>
                            <p className="subtitle">Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <strong>{masked(email)}</strong>.</p>
                            <div className="d-grid gap-2 mt-3">
                                <button className="btn btn-outline-secondary rounded-pill" onClick={() => { setDone(false); }}>Gửi lại email khác</button>
                                <a className="btn btn-teal rounded-pill" href="#">Quay lại đăng nhập</a>
                            </div>
                            <div className="small text-muted mt-3">Không thấy email? Kiểm tra thư mục Spam/Quảng cáo.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
