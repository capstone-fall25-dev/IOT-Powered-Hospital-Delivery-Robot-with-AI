import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import vehicle1 from "../assets/image/vehicle-1.jpg";
import vehicle2 from "../assets/image/vehicle-2.jpg";

export default function MedFleetLanding() {
    // Quản lý trạng thái đăng nhập, cuộn trang và section đang active
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const navigate = useNavigate();

    // Kiểm tra token đăng nhập từ localStorage
    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    // Xử lý hiệu ứng cuộn cho navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Theo dõi section active cho navigation
    useEffect(() => {
        const sections = ['features', 'about', 'contact'];
        const handleScrollSpy = () => {
            let current = '';
            const scrollPos = window.scrollY + 100;

            sections.forEach(section => {
                const el = document.getElementById(section);
                if (el && el.offsetTop <= scrollPos) {
                    current = section;
                }
            });

            setActiveSection(current);
        };

        window.addEventListener("scroll", handleScrollSpy);
        handleScrollSpy();
        return () => window.removeEventListener("scroll", handleScrollSpy);
    }, []);

    // Tải Bootstrap CSS/JS và font Google
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href =
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src =
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true;
        document.body.appendChild(js);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(font);
            document.body.removeChild(js);
        };
    }, []);

    const year = new Date().getFullYear();

    // Chức năng cuộn mượt đến section
    const scrollToSection = (sectionId) => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div
            style={{
                fontFamily:
                    'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                color: "#0b1324",
                background: `radial-gradient(1200px 600px at 15% 10%, rgba(76,225,198,.18), transparent 60%),
                   radial-gradient(900px 500px at 90% 5%, rgba(76,225,198,.12), transparent 60%),
                   linear-gradient(180deg, #f6faf9 0%, #eef6f5 15%, #e9f3f1 35%, #e8f0ee 100%)`,
                scrollBehavior: 'smooth',
            }}
        >
            <style>{`
        :root{--teal:#4CE1C6;--teal-dark:#16b2a0;--ink:#0f172a}
        .glass{background:rgba(255,255,255,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:4px}
        .shadow-soft{box-shadow:0 20px 40px rgba(2,6,23,.06)}
        .navbar-brand{font-weight:800;letter-spacing:.2px}
        .app-badge{width:36px;height:36px;display:inline-grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,#0ea5a5,#14e2c1);color:#fff;font-weight:800}
        
        /* NAVBAR SCROLL EFFECT */
        .navbar {
            transition: all 0.3s ease-in-out;
        }
        
        .navbar.scrolled {
            background: rgba(255,255,255,.85) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(15,23,42,.08);
            margin: 0;
            max-width: 100%;
            width: 100%;
        }
        
        .navbar.scrolled .navbar-brand,
        .navbar.scrolled .nav-link {
            transition: all 0.2s ease;
        }

        /* ACTIVE NAV LINK */
        .nav-link {
            transition: all 0.2s ease;
            position: relative;
        }
        .nav-link.active {
            color: var(--teal) !important;
            font-weight: 600;
        }
        .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--teal);
            border-radius: 1px;
        }

        .hero h1{font-weight:900;font-size:clamp(2rem,3.5vw + 1rem,4rem);line-height:1.05;color:#0b1432}
        .hero .accent{color:var(--teal);text-shadow:0 1px 0 rgba(255,255,255,.6)}
        .hero .sub{color:#1f2a44;opacity:.9}
        .cta-primary{background:var(--teal);border:none;color:#052a2b;font-weight:700}
        .cta-primary:hover{background:#39d7bf;color:#052a2b}
        .cta-outline{border-color:#bdece4;color:#0d3b3a}
        .vehicle-card{min-height:280px}
        .vehicle-card h3{font-weight:800}
        .vehicle-card img{width:100%;height:auto;object-fit:cover}
        .rounded-2xl{border-radius:8px}
        .member .avatar{width:80px;height:80px;border-radius:999px;object-fit:cover}
        .member h6{font-weight:700}
        .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
        footer{color:#1f2a44}
        .link-login{background:linear-gradient(120deg,#14e2c1,#0ea5a5);border:none;color:#052a2b;font-weight:700}
        .link-login:hover{filter:brightness(1.05)}
        .muted{opacity:.85}
        .navbar-toggler{background-color:rgba(20,226,193,0.2);border-radius:10px}
        .navbar-toggler-icon{filter:invert(1)}

        /* Contact card - dạng khối, không bo góc, border mỏng */
        .contact-card {
            border-radius: 0 !important;
            border: 1px solid rgba(255, 255, 255, 0.1); /* Giảm border xuống mức tối thiểu */
            padding: 2rem !important; /* Tăng padding nhẹ cho thoáng */
        }

        /* Team member cards - border ít hơn, giữ bo góc nhẹ */
        .member .glass {
            border: 1px solid rgba(255, 255, 255, 0.05); /* Border mờ nhất có thể */
            border-radius: 4px; /* Bo góc rất nhẹ, gần vuông */
        }

        /* Heading styles for better bold and layout */
        .section-heading {
            font-weight: 800; /* Bold cho h2 */
            color: #0b1432;
            margin-bottom: 1rem;
            text-align: center;
        }
        .section-subheading {
            font-weight: 600; /* Semibold cho sub */
            color: #1f2a44;
            opacity: 0.9;
            margin-bottom: 2rem;
            text-align: center;
        }
        .card-heading {
            font-weight: 800; /* Bold cho h3 trong card */
            color: #0b1432;
            margin-bottom: 0.5rem;
        }
        .contact-heading {
            font-weight: 700; /* Bold cho h2 contact */
            color: #0b1432;
            margin-bottom: 1rem;
            text-align: left;
        }

        /* Responsive tweaks */
        @media (max-width: 992px) {
          .hero { text-align:center; }
          .hero .col-lg-6:first-child { order:2; }
          .hero .col-lg-6:last-child { order:1; }
          .navbar.scrolled { max-width: 100%; border-radius: 0; }
          .contact-heading { text-align: center; }
          .nav-link::after { display: none; } /* Ẩn underline trên mobile nếu cần */
        }
        @media (max-width: 768px) {
          .hero h1 { font-size:2rem; }
          .hero .sub { font-size:1rem; }
          .member .avatar { width:64px; height:64px; }
          .glass { padding:1.25rem; }
          .vehicle-card img { height:auto; }
          .contact-card { padding: 1.5rem !important; } /* Responsive padding cho mobile */
        }
      `}</style>

            {/* Navbar chính */}
            <nav className={`navbar navbar-expand-lg py-3 bg-transparent sticky-top ${scrolled ? 'scrolled' : ''}`}>
                <div className="container-lg">
                    <a
                        className="navbar-brand d-flex align-items-center gap-2"
                        href="/dashboard"
                    >
                        <span className="app-badge">
                            <span>▶︎</span>
                        </span>
                        <span>SEP490_G35</span>
                    </a>
                    <button
                        className="navbar-toggler border-0"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#nav"
                        aria-controls="nav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="nav">
                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-3">
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
                                    href="#features"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('features');
                                    }}
                                >
                                    Tính năng
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
                                    href="#about"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('about');
                                    }}
                                >
                                    Giới thiệu
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
                                    href="#contact"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('contact');
                                    }}
                                >
                                    Liên hệ
                                </a>
                            </li>
                            {isLoggedIn ? (
                                <li className="nav-item ms-lg-2">
                                    <img
                                        src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                                        alt="avatar"
                                        className="rounded-circle"
                                        style={{
                                            width: 42,
                                            height: 42,
                                            cursor: "pointer",
                                            border: "2px solid #14e2c1",
                                        }}
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

            {/* Hero section */}
            <header className="hero pt-5 pb-5 text-center text-lg-start">
                <div className="container-lg">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-6 order-2 order-lg-1">
                            <span className="chip">Giải pháp cho bệnh viện</span>
                            <h1 className="mt-3 mb-3">
                                Điều phối xe <span className="accent">nhanh</span>
                                <br />
                                &amp; <span className="accent">an toàn</span>
                            </h1>
                            <p className="sub fs-5 pe-lg-5">
                                Quản lý lịch trình xe y tế, phân công giao hàng đồ ăn & thuốc men và theo dõi vị trí thời gian thực với định vị GPS trên bản đồ.
                            </p>
                            <div className="d-flex gap-3 mt-4 justify-content-center justify-content-lg-start">
                                <a
                                    className="btn btn-outline-success cta-outline btn-lg rounded-pill px-4"
                                    href="#features"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('features');
                                    }}
                                >
                                    Xem tính năng
                                </a>
                            </div>
                        </div>
                        <div className="col-lg-6 order-1 order-lg-2">
                            <div className="glass rounded-2xl p-2 shadow-soft">
                                <div className="ratio ratio-16x9 rounded-2xl overflow-hidden">
                                    <iframe
                                        src=""
                                        title="Demo thao tác điều lệnh & theo dõi trực tiếp"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="text-center small text-muted py-2">
                                    Demo thao tác điều lệnh &amp; theo dõi trực tiếp
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features section */}
            <section id="features" className="py-4 py-lg-5">
                <div className="container-lg">
                    <div className="text-center mb-4">
                        <h2 className="section-heading">Tính năng nổi bật</h2>
                        <p className="section-subheading fs-5">Giao hàng y tế thông minh với định vị GPS và bản đồ thời gian thực</p>
                    </div>
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="glass p-4 p-md-5 vehicle-card rounded-2xl h-100">
                                <h3 className="card-heading mb-1">Lập kế hoạch lộ trình</h3>
                                <div className="text-muted">
                                    Vẽ bản đồ tùy chỉnh &nbsp;•&nbsp; Tối ưu hóa đường đi
                                </div>
                                <div className="my-4">
                                    <img
                                        className="w-100 rounded-3"
                                        src={vehicle1}
                                        alt="Lập kế hoạch lộ trình"
                                    />
                                </div>
                                <a href="#" className="link-dark fw-semibold">
                                    Xem chi tiết
                                </a>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="glass p-4 p-md-5 vehicle-card rounded-2xl h-100">
                                <h3 className="card-heading mb-1">Theo dõi di chuyển</h3>
                                <div className="text-muted">Thời gian thực | Theo bản đồ</div>
                                <div className="my-4">
                                    <img
                                        className="w-100 rounded-3"
                                        alt="Theo dõi di chuyển"
                                        src="https://vov.vn/sites/default/files/styles/large/public/2022-10/z3819504049937_f97025099a0f867e6a259ce0c9f814c7.jpg"
                                    />
                                </div>
                                <a href="#" className="link-dark fw-semibold">
                                    Xem chi tiết
                                </a>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="glass p-4 p-md-5 vehicle-card rounded-2xl h-100">
                                <h3 className="card-heading mb-1">Định vị GPS</h3>
                                <div className="text-muted">Di chuyển theo vị trí • Cập nhật liên tục</div>
                                <div className="my-4">
                                    <img
                                        className="w-100 rounded-3"
                                        alt="Định vị GPS"
                                        src={vehicle2}
                                    />
                                </div>
                                <a href="#" className="link-dark fw-semibold">
                                    Xem chi tiết
                                </a>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="glass p-4 p-md-5 vehicle-card rounded-2xl h-100">
                                <h3 className="card-heading mb-1">Giao hàng y tế</h3>
                                <p className="text-muted mb-4">
                                    Phân công giao thuốc, thiết bị & mẫu bệnh phẩm an toàn, nhanh chóng.
                                </p>
                                <div className="my-4">
                                    <img
                                        className="w-100 rounded-3"
                                        alt="Giao hàng y tế"
                                        src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                                    />
                                </div>
                                <ul className="mb-4">
                                    <li>Xác nhận nhận hàng tự động</li>
                                    <li>Theo dõi tình trạng hàng hóa</li>
                                    <li>Báo cáo giao hàng đầy đủ</li>
                                </ul>
                                <a href="#" className="link-dark fw-semibold">
                                    Khám phá giao hàng
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About/Team section */}
            <section id="about" className="py-5">
                <div className="container-lg">
                    <div className="text-center mb-4">
                        <h2 className="section-heading">Thành viên dự án</h2>
                        <p className="section-subheading">Đội ngũ tận tâm xây dựng</p>
                    </div>

                    <div className="row g-4 justify-content-center">
                        {/* Hàng đầu: 2 thành viên */}
                        <div className="row g-4 w-100 justify-content-center">
                            <div className="col-lg-4">
                                <div className="glass p-4 rounded-2xl member h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&auto=format&fit=crop" />
                                        <div>
                                            <h6 className="mb-1">Lê Mạnh Cường</h6>
                                            <div className="text-muted">Trưởng nhóm - Kiểm thử & Đảm bảo chất lượng</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="glass p-4 rounded-2xl member h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&auto=format&fit=crop" />
                                        <div>
                                            <h6 className="mb-1">Lê Ánh Dương</h6>
                                            <div className="text-muted">Front-end & AI</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hàng dưới: 3 thành viên */}
                        <div className="row g-4 w-100">
                            <div className="col-lg-4">
                                <div className="glass p-4 rounded-2xl member h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&auto=format&fit=crop" />
                                        <div>
                                            <h6 className="mb-1">Nguyễn Viết Nam</h6>
                                            <div className="text-muted">Back-end & IoT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="glass p-4 rounded-2xl member h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" />
                                        <div>
                                            <h6 className="mb-1">Lã Tùng Dương</h6>
                                            <div className="text-muted">Back-end & IoT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="glass p-4 rounded-2xl member h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" />
                                        <div>
                                            <h6 className="mb-1">Lương Quang Vũ</h6>
                                            <div className="text-muted">Back-end & IoT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact section */}
            <section id="contact" className="pb-5">
                <div className="container-lg">
                    <div className="glass contact-card p-4 p-lg-5">
                        <div className="row align-items-center g-4 text-center text-lg-start">
                            <div className="col-lg-8">
                                <h2 className="contact-heading">Liên hệ tư vấn</h2>
                                <div className="text-muted">
                                    Email:{" "}
                                    <a href="mailto:demo@medfleet.example">
                                        demo@medfleet.example
                                    </a>{" "}
                                    — Hotline: 0123 456 789
                                </div>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <a href="#signup" className="btn btn-dark rounded-pill px-4">
                                    Đặt lịch demo
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-4">
                <div className="container-lg d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 text-center text-md-start">
                    <div className="small">
                        © <span>{year}</span> SEP490_G35. Tất cả quyền được bảo lưu.
                    </div>
                    <div className="small text-muted">Điều khoản • Bảo mật</div>
                </div>
            </footer>
        </div>
    );
}