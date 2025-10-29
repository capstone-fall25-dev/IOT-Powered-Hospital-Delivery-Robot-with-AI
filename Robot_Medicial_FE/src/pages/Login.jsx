import { useEffect, useRef, useState } from "react";
import logo from '../assets/image/logo.jpg';
import { useNavigate } from "react-router-dom";
export default function MedFleetLogin() {


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
        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js) };
    }, []);

    const [form, setForm] = useState({ username: "", password: "", remember: true });
    const [showPwd, setShowPwd] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const pwdRef = useRef(null);

    function onKeyUp(e) { if (e.getModifierState) setCapsLock(!!e.getModifierState("CapsLock")); }
    function handleChange(e) { const { name, value, type, checked } = e.target; setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }

    async function onSubmit(e) {
        e.preventDefault(); setError("");
        if (!form.username.trim() || !form.password) { setError("Vui lòng nhập đầy đủ Tài khoản & Mật khẩu"); return; }
        setSubmitting(true);
        // Fake login delay; replace with API call
        await new Promise(r => setTimeout(r, 50));
        if (form.username !== 'admin' || form.password !== '123') {
            setError("Thông tin đăng nhập chưa đúng. Gợi ý: admin / medfleet");
            setSubmitting(false); return;
        }
        setSubmitting(false);
        navigate("/");
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
        .glass{background:rgba(255,255,255,.80);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.75);box-shadow:0 16px 48px rgba(15,23,42,.10);}
        .rounded-2xl{border-radius:22px}
        .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
        .btn-teal:hover{filter:brightness(1.05)}
        .top-accent{height:4px;background:linear-gradient(90deg,#0ea5a5,#4CE1C6);border-radius:22px 22px 0 0}
        .field-icon{position:absolute;right:.75rem;top:50%;transform:translateY(-50%);opacity:.6}
        .brand-badge{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;color:white;font-weight:900;background:linear-gradient(135deg,#0ea5a5,#14e2c1)}
        .muted{color:#3f556e;opacity:.9}
      `}</style>

            <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <div className="glass rounded-2xl" style={{ width: '100%', maxWidth: 440 }}>
                    <div className="top-accent"></div>
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
                                <input name="username" className="form-control form-control-lg rounded-pill ps-3" placeholder="Tên đăng nhập hoặc email" value={form.username} onChange={handleChange} autoComplete="username" />
                                <i className="bi bi-person field-icon"></i>
                            </div>
                            {/* Password */}
                            <div className="mb-3 position-relative">
                                <label className="form-label d-flex justify-content-between align-items-center">Mật khẩu {capsLock && <span className="badge text-bg-warning">CapsLock</span>}</label>
                                <input ref={pwdRef} onKeyUp={onKeyUp} type={showPwd ? 'text' : 'password'} name="password" className="form-control form-control-lg rounded-pill ps-3 pe-5" placeholder="••••••••" value={form.password} onChange={handleChange} autoComplete="current-password" />
                                <button type="button" className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none" onClick={() => setShowPwd(s => !s)} aria-label="Hiện/ẩn mật khẩu"><i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i></button>
                            </div>
                            {/* Remember + Forgot */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="remember" name="remember" checked={form.remember} onChange={handleChange} />
                                    <label className="form-check-label" htmlFor="remember">Ghi nhớ</label>
                                </div>
                                <a className="small text-decoration-none" href="/forgot-password">Quên mật khẩu?</a>
                            </div>

                            {error && <div className="alert alert-danger py-2">{error}</div>}

                            <button disabled={submitting} type="submit" className="btn btn-teal w-100 rounded-pill py-2">
                                {submitting ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                Đăng nhập
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
