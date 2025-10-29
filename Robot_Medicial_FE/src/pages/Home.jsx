import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import vehicle1 from '../assets/image/vehicle-1.jpg';
import vehicle2 from '../assets/image/vehicle-2.jpg';

export default function MedFleetLanding() {

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    useEffect(() => {
        // Inject Bootstrap CSS
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        // Inject Google Font
        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        // Inject Bootstrap JS for navbar toggler
        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true;
        document.body.appendChild(js);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(font);
            document.body.removeChild(js);
        };
    }, []);

    const year = new Date().getFullYear();

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            color: '#0b1324',
            background: `radial-gradient(1200px 600px at 15% 10%, rgba(76,225,198,.18), transparent 60%),
                   radial-gradient(900px 500px at 90% 5%, rgba(76,225,198,.12), transparent 60%),
                   linear-gradient(180deg, #f6faf9 0%, #eef6f5 15%, #e9f3f1 35%, #e8f0ee 100%)`
        }}>
            {/* Inline styles for custom tokens & utilities */}
            <style>{`
        :root{--teal:#4CE1C6;--teal-dark:#16b2a0;--ink:#0f172a}
        .glass{background:rgba(255,255,255,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.6);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
        .shadow-soft{box-shadow:0 20px 40px rgba(2,6,23,.06)}
        .navbar-brand{font-weight:800;letter-spacing:.2px}
        .app-badge{width:36px;height:36px;display:inline-grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,#0ea5a5,#14e2c1);color:#fff;font-weight:800}
        .hero h1{font-weight:900;font-size:clamp(2rem,3.5vw + 1rem,4rem);line-height:1.05;color:#0b1432}
        .hero .accent{color:var(--teal);text-shadow:0 1px 0 rgba(255,255,255,.6)}
        .hero .sub{color:#1f2a44;opacity:.9}
        .cta-primary{background:var(--teal);border:none;color:#052a2b;font-weight:700}
        .cta-primary:hover{background:#39d7bf;color:#052a2b}
        .cta-outline{border-color:#bdece4;color:#0d3b3a}
        .vehicle-card{min-height:280px}
        .vehicle-card h3{font-weight:800}
        .rounded-2xl{border-radius:28px}
        .member .avatar{width:80px;height:80px;border-radius:999px;object-fit:cover}
        .member h6{font-weight:700}
        .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
        footer{color:#1f2a44}
        .link-login{background:linear-gradient(120deg,#14e2c1,#0ea5a5);border:none;color:#052a2b;font-weight:700}
        .link-login:hover{filter:brightness(1.05)}
        .muted{opacity:.85}
      `}</style>

            {/* NAVBAR */}
            <nav className="navbar navbar-expand-lg py-3 bg-transparent sticky-top">
                <div className="container-lg">
                    <a className="navbar-brand d-flex align-items-center gap-2" href="/dashboard">
                        <span className="app-badge"><span>▶︎</span></span>
                        <span>SEP490_G35</span>
                        <small className="text-muted fw-semibold">• Quản lý xe bệnh viện</small>
                    </a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-controls="nav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="nav">
                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-3">
                            <li className="nav-item"><a className="nav-link" href="#features">Tính năng</a></li>
                            <li className="nav-item"><a className="nav-link" href="#about">Giới thiệu</a></li>
                            <li className="nav-item"><a className="nav-link" href="#contact">Liên hệ</a></li>
                            {isLoggedIn ? (
                                <li className="nav-item ms-lg-2">
                                    <img
                                        src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                                        alt="avatar"
                                        className="rounded-circle"
                                        style={{ width: 42, height: 42, cursor: "pointer", border: "2px solid #14e2c1" }}
                                        onClick={() => navigate("/dashboard")}
                                    />
                                </li>
                            ) : (
                                <li className="nav-item ms-lg-2">
                                    <a className="btn link-login rounded-pill px-3" href="/login">
                                        Đăng nhập
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <header className="hero pt-4 pb-5 pb-lg-0">
                <div className="container-lg">
                    <div className="row align-items-center g-4 g-xl-5">
                        <div className="col-lg-6">
                            <span className="chip">Giải pháp cho bệnh viện</span>
                            <h1 className="mt-3 mb-3">Điều phối đội xe <span className="accent">nhanh</span><br />&amp; <span className="accent">an toàn</span></h1>
                            <p className="sub fs-5 pe-lg-5">Tập trung lịch xe, phân ca tài xế, bảo trì và giám sát theo thời gian thực trong một nền tảng duy nhất.</p>
                            <div className="d-flex gap-3 mt-4">

                                <a className="btn btn-outline-secondary cta-outline btn-lg rounded-pill px-4" href="#features">Xem tính năng</a>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="glass rounded-2xl p-2 shadow-soft">
                                <div className="ratio ratio-16x9 rounded-2xl overflow-hidden">
                                    <iframe src="" title="Demo thao tác điều lệnh & theo dõi trực tiếp" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                                </div>
                                <div className="text-center small text-muted py-2">Demo thao tác điều lệnh &amp; theo dõi trực tiếp (0:45)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* FEATURES */}
            <section id="features" className="py-4 py-lg-5">
                <div className="container-lg">
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="glass p-4 p-lg-5 vehicle-card rounded-2xl h-100">
                                <h3 className="mb-1">Xe cấp cứu A1</h3>
                                <div className="text-muted">Sẵn sàng 24/7 &nbsp;•&nbsp; 51A-123.45</div>
                                <div className="my-4">
                                    <img className="w-100 rounded-3" src={vehicle1} alt="Xe cấp cứu A1" />
                                </div>
                                <a href="#" className="link-dark fw-semibold">Xem chi tiết</a>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="glass p-4 p-lg-5 vehicle-card rounded-2xl h-100">
                                <h3 className="mb-1">Xe nội viện B2</h3>
                                <div className="text-muted">Sẵn sàng | Liên khoa</div>
                                <div className="my-4">
                                    <img className="w-100 rounded-3" alt="Xe nội viện B2" src="https://vov.vn/sites/default/files/styles/large/public/2022-10/z3819504049937_f97025099a0f867e6a259ce0c9f814c7.jpg" />
                                </div>
                                <a href="#" className="link-dark fw-semibold">Xem chi tiết</a>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="glass p-4 p-lg-5 vehicle-card rounded-2xl h-100">
                                <h3 className="mb-1">Xe vận chuyển C3</h3>
                                <div className="text-muted">Đi tỉnh • Thu phí theo km</div>
                                <div className="my-4">
                                    <img className="w-100 rounded-3" alt="Xe vận chuyển C3" src={vehicle2} />
                                </div>
                                <a href="#" className="link-dark fw-semibold">Xem chi tiết</a>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="glass p-4 p-lg-5 vehicle-card rounded-2xl h-100">
                                <h3 className="mb-1">Trung tâm điều lệnh</h3>
                                <p className="text-muted mb-4">Bảng điều khiển theo thời gian thực, định vị GPS & tối ưu hóa lộ trình.</p>
                                <ul className="mb-4">
                                    <li>Phân ca tự động cho tài xế</li>
                                    <li>Nhắc lịch bảo trì & đăng kiểm</li>
                                    <li>Cảnh báo quá tốc độ / dừng đỗ</li>
                                </ul>
                                <a href="#" className="link-dark fw-semibold">Khám phá bảng điều khiển</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TEAM */}
            <section id="about" className="py-5">
                <div className="container-lg">
                    <div className="text-center mb-4">
                        <h2 className="fw-black">Thành viên dự án</h2>
                        <p className="muted">Đội ngũ tận tâm xây dựng MedFleet</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop" alt="Lê Mạnh Cường" />
                                    <div>
                                        <h6 className="mb-1">Lê Mạnh Cường</h6>
                                        <div className="text-muted">Trưởng nhóm phát triển</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&auto=format&fit=crop" alt="Nguyễn Thị Mai" />
                                    <div>
                                        <h6 className="mb-1">Nguyễn Thị Mai</h6>
                                        <div className="text-muted">Nhà thiết kế UI/UX</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&auto=format&fit=crop" alt="Trần Văn Minh" />
                                    <div>
                                        <h6 className="mb-1">Trần Văn Minh</h6>
                                        <div className="text-muted">Kỹ sư Front‑end</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" alt="Phạm Hồng Anh" />
                                    <div>
                                        <h6 className="mb-1">Phạm Hồng Anh</h6>
                                        <div className="text-muted">Kỹ sư Back‑end</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" alt="Đặng Quốc Huy" />
                                    <div>
                                        <h6 className="mb-1">Đặng Quốc Huy</h6>
                                        <div className="text-muted">Kiểm thử & Đảm bảo chất lượng</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-lg-4">
                            <div className="glass p-4 rounded-2xl member h-100">
                                <div className="d-flex align-items-center gap-3">
                                    <img className="avatar" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&auto=format&fit=crop" alt="Nguyễn Bảo Nam" />
                                    <div>
                                        <h6 className="mb-1">Nguyễn Bảo Nam</h6>
                                        <div className="text-muted">Triển khai & Hỗ trợ kỹ thuật</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="pb-5">
                <div className="container-lg">
                    <div className="glass p-4 p-lg-5 rounded-2xl">
                        <div className="row align-items-center g-4">
                            <div className="col-lg-8">
                                <h4 className="mb-2">Liên hệ tư vấn</h4>
                                <div className="text-muted">Email: <a href="mailto:demo@medfleet.example">demo@medfleet.example</a> — Hotline: 0123 456 789</div>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <a href="#signup" className="btn btn-dark rounded-pill px-4">Đặt lịch demo</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-4">
                <div className="container-lg d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <div className="small">© <span>{year}</span> MedFleet. All rights reserved.</div>
                    <div className="small text-muted">Điều khoản • Bảo mật</div>
                </div>
            </footer>
        </div>
    );
}
