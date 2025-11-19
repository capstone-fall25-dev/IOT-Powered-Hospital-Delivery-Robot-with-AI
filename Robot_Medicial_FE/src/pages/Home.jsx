import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import vehicle1 from "../assets/image/vehicle-1.jpg";
import vehicle2 from "../assets/image/vehicle-2.jpg";
import logoMain from "../assets/image/logo-main.png";
import styles from "../assets/styles/landing.module.css";

export default function MedFleetLanding() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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

    const year = new Date().getFullYear();

    const scrollToSection = (sectionId) => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div
            style={{
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                color: "#0b1324",
                background: `radial-gradient(1200px 600px at 15% 10%, rgba(76,225,198,.18), transparent 60%),
                   radial-gradient(900px 500px at 90% 5%, rgba(76,225,198,.12), transparent 60%),
                   linear-gradient(180deg, #f6faf9 0%, #eef6f5 15%, #e9f3f1 35%, #e8f0ee 100%)`,
                scrollBehavior: 'smooth',
            }}
        >
            {/* Navbar */}
            <nav className={`navbar navbar-expand-lg py-3 bg-transparent sticky-top ${scrolled ? styles.scrolled : ''}`}>
                <div className="container-lg">
                    <a
                        className={`navbar-brand d-flex align-items-center gap-2 ${styles.navbarBrand}`}
                        href="/dashboard"
                    >
                        <img 
                            src={logoMain} 
                            alt="MediGo Logo" 
                            style={{ height: '60px', width: 'auto' }} 
                        />
                        <span>MediGo</span>
                    </a>
                    <button
                        className={`navbar-toggler border-0 ${styles.navbarToggler}`}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#nav"
                        aria-controls="nav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className={`navbar-toggler-icon ${styles.navbarTogglerIcon}`}></span>
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
                                        className={`rounded-circle ${styles.userAvatar}`}
                                        onClick={() => navigate("/dashboard")}
                                    />
                                </li>
                            ) : (
                                <li className="nav-item ms-lg-2">
                                    <a className={`btn ${styles.linkLogin} rounded-pill px-3`} href="/login">
                                        Đăng nhập
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Hero section */}
            <header className={`${styles.hero} pt-5 pb-5 text-center text-lg-start`}>
                <div className="container-lg">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-6 order-2 order-lg-1">
                            <span className={styles.chip}>Giải pháp cho bệnh viện</span>
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
                                    className={`btn btn-outline-success ${styles.ctaOutline} btn-lg rounded-pill px-4`}
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
                            <div className={`${styles.glass} ${styles.rounded2xl} p-2 ${styles.shadowSoft}`}>
                                <div className={`ratio ratio-16x9 ${styles.rounded2xl} overflow-hidden`}>
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
                            <div className={`${styles.glass} p-4 p-md-5 ${styles.vehicleCard} ${styles.rounded2xl} h-100`}>
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
                            <div className={`${styles.glass} p-4 p-md-5 ${styles.vehicleCard} ${styles.rounded2xl} h-100`}>
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
                            <div className={`${styles.glass} p-4 p-md-5 ${styles.vehicleCard} ${styles.rounded2xl} h-100`}>
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
                            <div className={`${styles.glass} p-4 p-md-5 ${styles.vehicleCard} ${styles.rounded2xl} h-100`}>
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
                        <div className="row g-4 w-100 justify-content-center">
                            <div className="col-lg-4">
                                <div className={`${styles.glass} p-4 ${styles.rounded2xl} member h-100`}>
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&auto=format&fit=crop" alt="Lê Mạnh Cường" />
                                        <div>
                                            <h6 className="mb-1">Lê Mạnh Cường</h6>
                                            <div className="text-muted">Trưởng nhóm - Kiểm thử & Đảm bảo chất lượng</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className={`${styles.glass} p-4 ${styles.rounded2xl} member h-100`}>
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&auto=format&fit=crop" alt="Lê Ánh Dương" />
                                        <div>
                                            <h6 className="mb-1">Lê Ánh Dương</h6>
                                            <div className="text-muted">Front-end & AI</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row g-4 w-100">
                            <div className="col-lg-4">
                                <div className={`${styles.glass} p-4 ${styles.rounded2xl} member h-100`}>
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&auto=format&fit=crop" alt="Nguyễn Viết Nam" />
                                        <div>
                                            <h6 className="mb-1">Nguyễn Viết Nam</h6>
                                            <div className="text-muted">Back-end & IoT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className={`${styles.glass} p-4 ${styles.rounded2xl} member h-100`}>
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" alt="Lã Tùng Dương" />
                                        <div>
                                            <h6 className="mb-1">Lã Tùng Dương</h6>
                                            <div className="text-muted">Back-end & IoT</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className={`${styles.glass} p-4 ${styles.rounded2xl} member h-100`}>
                                    <div className="d-flex align-items-center gap-3">
                                        <img className="avatar" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop" alt="Lương Quang Vũ" />
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
                    <div className={`${styles.glass} contact-card p-4 p-lg-5`}>
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
                        © <span>{year}</span> MediGo. Tất cả quyền được bảo lưu.
                    </div>
                    <div className={`small text-muted ${styles.muted}`}>Điều khoản • Bảo mật</div>
                </div>
            </footer>
        </div>
    );
}