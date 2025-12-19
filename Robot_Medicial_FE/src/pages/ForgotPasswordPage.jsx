import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/assets/styles/forgotPassword.module.css";
import { requestForgotPassword, verifyForgotPassword } from "@/services/authService";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    async function onSubmitEmail(e) {
        e.preventDefault();
        setError("");

        if (!isValidEmail(email)) {
            setError("Email không hợp lệ");
            return;
        }

        try {
            setSending(true);
            await requestForgotPassword(email);
            setDone(true);
        } catch (err) {
            setError(err.message || "Gửi email thất bại");
        } finally {
            setSending(false);
        }
    }

    async function onSubmitOtp(e) {
        e.preventDefault();
        setError("");

        if (!otp) {
            setError("Vui lòng nhập OTP");
            return;
        }

        try {
            setSending(true);
            const res = await verifyForgotPassword({
                email,
                otp,
            });
            const token = res?.token;

            if (!token) {
                throw new Error("Không nhận được token xác thực");
            }
            navigate("/forgot-password-change", {
                state: {
                    token
                },
            });
        } catch (err) {
            setError(err.message || "OTP không hợp lệ");
        } finally {
            setSending(false);
        }
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
                            {/* =================== STEP 1 — SEND EMAIL =================== */}
                            <div className={styles.header}>
                                <span className={styles.heroIcon}>
                                    <i className="bi bi-key-fill"></i>
                                </span>
                                <h4 className={styles.pageTitle}>Quên Mật Khẩu</h4>
                            </div>

                            <p className={styles.subtitle}>
                                Nhập email đã đăng ký để nhận OTP.
                            </p>

                            <form onSubmit={onSubmitEmail} noValidate>
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
                                    {sending ? "Đang xử lý..." : "Gửi OTP"}
                                </button>
                            </form>

                            <div className="text-center mt-3">
                                <a
                                    className={styles.backLink}
                                    href="#"
                                    onClick={handleBackToLogin}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại đăng nhập
                                </a>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* =================== STEP 2 — ENTER OTP =================== */}
                            <div className={styles.header}>
                                <span className={styles.heroIcon}>
                                    <i className="bi bi-shield-check"></i>
                                </span>
                                <h4 className={styles.pageTitle}>Nhập mã OTP</h4>
                            </div>

                            <p className={styles.subtitle}>
                                Mã OTP đã được gửi đến email <strong>{masked(email)}</strong>.
                                Vui lòng kiểm tra.
                            </p>

                            <form onSubmit={onSubmitOtp}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        <i className="bi bi-lock me-1"></i>
                                        Mã OTP
                                    </label>
                                    <input
                                        type="text"
                                        className={`${styles.formControl} ${error ? styles.formControlError : ''}`}
                                        placeholder="Nhập mã OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
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
                                    disabled={!otp}
                                >
                                    Xác nhận OTP
                                </button>
                            </form>

                            <div className="text-center mt-3">
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={() => {
                                        setDone(false);
                                        setOtp("");
                                        setError("");
                                    }}
                                >
                                    <i className="bi bi-arrow-repeat me-1"></i>
                                    Gửi email khác
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
