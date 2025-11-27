// src/pages/ForgotPasswordChangePage.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyForgotPassword } from "@/services/authService";
import styles from "@/assets/styles/changePassword.module.css";

export default function ForgotPasswordChangePage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Nhận email + otp từ trang OTP
    const email = location.state?.email;
    const otp = location.state?.otp;

    // Nếu user vào thẳng trang => văng ra forgot
    useEffect(() => {
        if (!email || !otp) {
            navigate("/forgot-password");
        }
    }, [email, otp]);

    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [show, setShow] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [done, setDone] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // RULES PASSWORD
    const rules = useMemo(
        () => [
            { key: "len", label: "Ít nhất 8 ký tự", ok: pwd.length >= 8 },
            { key: "upper", label: "Có chữ hoa", ok: /[A-ZÀ-Ỵ]/.test(pwd) },
            { key: "lower", label: "Có chữ thường", ok: /[a-zà-ÿ]/.test(pwd) },
            { key: "num", label: "Có số", ok: /\d/.test(pwd) },
            { key: "sym", label: "Ký tự đặc biệt", ok: /[^\w\s]/.test(pwd) },
        ],
        [pwd]
    );

    const allOk = rules.every((r) => r.ok);
    const match = pwd && pwd2 && pwd === pwd2;
    const canSubmit = allOk && match && !submitting;

    function strengthLevel() {
        const n = rules.filter((r) => r.ok).length;
        if (n <= 2) return { label: "Yếu", variant: "danger", width: "25%" };
        if (n === 3) return { label: "Trung bình", variant: "warning", width: "60%" };
        if (n >= 4) return { label: "Mạnh", variant: "success", width: "100%" };
        return { label: "", variant: "secondary", width: "0%" };
    }

    // AUTO redirect khi done
    useEffect(() => {
        if (done) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        navigate("/login");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [done]);

    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;

        try {
            setSubmitting(true);

            await verifyForgotPassword({
                email,
                otp,
                newPassword: pwd,
            });

            setDone(true);

        } catch (err) {
            setError(err.message || "Đặt lại mật khẩu thất bại");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={`container py-5 ${styles.container}`}>
                <div className={`${styles.glass} p-4 p-md-5`}>

                    {!done ? (
                        <>
                            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                <span className={styles.heroEmoji}>
                                    <i className="bi bi-shield-lock-fill"></i>
                                </span>
                                <h4 className={`${styles.title} mb-0`}>
                                    Đặt mật khẩu mới
                                </h4>
                            </div>

                            <p className={`${styles.subtitle} text-center mb-4`}>
                                Nhập mật khẩu mới để hoàn tất đặt lại tài khoản.
                            </p>

                            {error && (
                                <div className="alert alert-danger d-flex align-items-center mb-3">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={onSubmit} noValidate>

                                {/* PASSWORD */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-lock-fill me-1"></i>
                                        Mật khẩu mới <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type={show ? "text" : "password"}
                                        className={`form-control form-control-lg rounded-pill ${styles.formControl}`}
                                        placeholder="Tối thiểu 8 ký tự..."
                                        value={pwd}
                                        onChange={(e) => {
                                            setPwd(e.target.value);
                                            setError("");
                                        }}
                                    />
                                </div>

                                {/* CONFIRM */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-shield-check me-1"></i>
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        type={show ? "text" : "password"}
                                        className={`form-control form-control-lg rounded-pill ${styles.formControl} ${pwd2 && !match ? "is-invalid" : ""
                                            }`}
                                        placeholder="Nhập lại mật khẩu"
                                        value={pwd2}
                                        onChange={(e) => {
                                            setPwd2(e.target.value);
                                            setError("");
                                        }}
                                    />
                                    {pwd2 && !match && (
                                        <div className="invalid-feedback">
                                            <i className="bi bi-x-circle me-1"></i>
                                            Mật khẩu không khớp
                                        </div>
                                    )}
                                </div>

                                {/* SHOW */}
                                <div className="form-check mb-3">
                                    <input
                                        id="showPwd"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={show}
                                        onChange={(e) => setShow(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="showPwd">
                                        <i className="bi bi-eye me-1"></i>
                                        Hiển thị mật khẩu
                                    </label>
                                </div>

                                {/* STRENGTH BAR */}
                                {pwd && (
                                    <div className="mb-3">
                                        <div className="progress" style={{ height: "8px" }}>
                                            <div
                                                className={`progress-bar bg-${strengthLevel().variant}`}
                                                style={{ width: strengthLevel().width }}
                                            ></div>
                                        </div>
                                        <small>
                                            Độ mạnh:
                                            <b
                                                className={`text-${strengthLevel().variant}`}
                                            >
                                                {" "}
                                                {strengthLevel().label}
                                            </b>
                                        </small>
                                    </div>
                                )}

                                {/* RULES */}
                                <div className="row g-2 small mb-4">
                                    {rules.map((r) => (
                                        <div
                                            key={r.key}
                                            className="col-sm-6 d-flex align-items-center gap-2"
                                        >
                                            <i
                                                className={`bi ${r.ok
                                                    ? "bi-check-circle-fill text-success"
                                                    : "bi-dot text-muted"
                                                    }`}
                                            ></i>
                                            <span className={r.ok ? "text-success" : "text-muted"}>
                                                {r.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="d-flex justify-content-between mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill px-4"
                                        onClick={() => navigate(-1)}
                                    >
                                        <i className="bi bi-arrow-left me-1"></i>
                                        Quay lại
                                    </button>

                                    <button
                                        type="submit"
                                        className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                        disabled={!canSubmit}
                                    >
                                        {submitting && (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                        )}
                                        Xác nhận
                                    </button>
                                </div>

                            </form>
                        </>
                    ) : (
                        // SUCCESS UI
                        <div className="text-center">
                            <div className="mb-3">
                                <div className={styles.successIcon}>
                                    <i className="bi bi-check-lg"></i>
                                </div>
                            </div>

                            <h5 className="fw-bold mb-2">
                                Đặt lại mật khẩu thành công
                            </h5>
                            <p className={`${styles.subtitle} mb-3`}>
                                Bạn có thể dùng mật khẩu mới để đăng nhập.
                            </p>

                            <div className="mb-4">
                                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                    <i className="bi bi-clock-history"></i>
                                    <span className="text-muted small">
                                        Chuyển sang trang đăng nhập sau{" "}
                                        <strong>{countdown}</strong> giây
                                    </span>
                                </div>
                                <div
                                    className="progress mx-auto"
                                    style={{ height: "6px", maxWidth: "300px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${(countdown / 60) * 100}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <button
                                className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                onClick={() => navigate("/login")}
                            >
                                <i className="bi bi-box-arrow-in-right me-1"></i>
                                Đăng nhập
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
