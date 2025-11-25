// src/pages/Login.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext"; 
import logo from '@/assets/image/logo.png';
import styles from '@/assets/styles/login.module.css';

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [showPwd, setShowPwd] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const pwdRef = useRef(null);
  const { login } = useAuth(); 

  function onKeyUp(e) {
    if (e.getModifierState) setCapsLock(!!e.getModifierState("CapsLock"));
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!form.password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      const userData = await login(form.email, form.password);
      
      console.log("Login thành công:", userData);
      
      // Redirect dựa trên role
      if (userData.role === "admin" || userData.role === "doctor") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      setError(err.message || "Đăng nhập thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
        <div className={styles.glass}>
          <div className="p-4 p-md-5">

            {/* =================== LOGO =================== */}
            <div className={styles.logoContainer}>
              <img 
                src={logo} 
                alt="MedFleet Logo" 
                className={styles.logoImg}
              />
              <div className={styles.brandInfo}>
                <div className={styles.brandName}>SEP490_G35</div>
                <div className={styles.brandSubtitle}>Quản lý xe bệnh viện</div>
              </div>
            </div>

            {/* =================== TITLE =================== */}
            <h5 className={styles.pageTitle}>Đăng nhập hệ thống</h5>

            {/* =================== FORM =================== */}
            <form onSubmit={handleSubmit} noValidate>

              {/* Email */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <i className="bi bi-envelope me-1"></i>
                  Email
                </label>
                <div className="position-relative">
                  <input
                    name="email"
                    type="email"
                    className={styles.formControl}
                    placeholder="Nhập email của bạn"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.formLabel}>
                    <i className="bi bi-lock me-1"></i>
                    Mật khẩu
                  </label>
                  {capsLock && (
                    <span className={styles.capsLockBadge}>
                      <i className="bi bi-capslock me-1"></i>
                      CapsLock
                    </span>
                  )}
                </div>

                <div className="position-relative">
                  <input
                    ref={pwdRef}
                    onKeyUp={onKeyUp}
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    className={styles.formControl}
                    placeholder="Nhập mật khẩu"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPwd(s => !s)}
                    aria-label="Hiện/ẩn mật khẩu"
                  >
                    <i className={`bi ${showPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className={styles.actionsRow}>
                <div className={styles.rememberMe}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                  />
                  <label className={styles.checkboxLabel} htmlFor="remember">
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <a 
                  className={styles.forgotLink}
                  href=""
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/forgot-password");
                  }}
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Error Alert */}
              {error && (
                <div className={styles.errorAlert}>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button 
                disabled={loading} 
                type="submit" 
                className={styles.btnTeal}
              >
                {loading && (
                  <span 
                    className="spinner-border spinner-border-sm me-2" 
                    role="status" 
                    aria-hidden="true"
                  ></span>
                )}
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

            </form>

          </div>
        </div>
    </div>
  );
}