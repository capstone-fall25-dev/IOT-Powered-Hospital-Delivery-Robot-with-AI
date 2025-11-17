import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/assets/styles/forgotPassword.module.css";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError("");

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

    function handleBackToLogin(e) {
        e.preventDefault();
        navigate("/login");
    }

    return (
        <div className={styles.page}>
                <div className={styles.glass}>
                    <div className="p-4 p-md-5">

                        {!done ? (
                            <>
                                {/* =================== HEADER =================== */}
                                <div className={styles.header}>
                                    <span className={styles.heroIcon}>
                                        <i className="bi bi-key-fill"></i>
                                    </span>
                                    <h4 className={styles.pageTitle}>Quên Mật Khẩu</h4>
                                </div>

                                <p className={styles.subtitle}>
                                    Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
                                </p>

                                {/* =================== FORM =================== */}
                                <form onSubmit={onSubmit} noValidate>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            <i className="bi bi-envelope me-1"></i>
                                            Email
                                        </label>
                                        <input 
                                            type="email" 
                                            className={`${styles.formControl} ${error ? styles.formControlError : ''}`}
                                            placeholder="nhapemail@benhvien.vn" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                        />
                                        {error && (
                                            <div className={styles.errorFeedback}>
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {error}
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        className={styles.btnTeal}
                                        type="submit" 
                                        disabled={sending || !email}
                                    >
                                        {sending && (
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        )}
                                        {sending ? "Đang xử lý..." : "Xác nhận"}
                                    </button>
                                </form>

                                <div className="text-center mt-3">
                                    <a 
                                        className={styles.backLink}
                                        href="#" 
                                        onClick={handleBackToLogin}
                                    >
                                        <i className="bi bi-arrow-left"></i>
                                        Quay lại đăng nhập
                                    </a>
                                </div>
                            </>
                        ) : (
                            /* =================== SUCCESS STATE =================== */
                            <div className={styles.successContainer}>
                                <span className={styles.successEmoji}>📬</span>
                                
                                <h5 className={styles.successTitle}>
                                    Vui lòng kiểm tra email
                                </h5>
                                
                                <p className={styles.successMessage}>
                                    Chúng tôi đã gửi liên kết đặt lại mật khẩu đến{" "}
                                    <strong>{masked(email)}</strong>.
                                </p>

                                <div className={styles.buttonGroup}>
                                    <button 
                                        className={styles.btnSecondary}
                                        onClick={() => setDone(false)}
                                    >
                                        <i className="bi bi-envelope me-2"></i>
                                        Gửi lại email khác
                                    </button>
                                    
                                    <button 
                                        className={styles.btnTeal}
                                        onClick={handleBackToLogin}
                                    >
                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                        Quay lại đăng nhập
                                    </button>
                                </div>

                                <div className={styles.helpText}>
                                    <i className="bi bi-info-circle me-1"></i>
                                    Không thấy email? Kiểm tra thư mục Spam/Quảng cáo.
                                </div>
                            </div>
                        )}

                    </div>
                </div>
        </div>
    );
}