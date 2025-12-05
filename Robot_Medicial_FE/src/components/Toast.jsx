// src/components/Toast.jsx
// Component Toast dùng chung cho toàn hệ thống
// Nhận toast và showToast từ props (từ useToast hook ở component cha)
import styles from "@/assets/styles/toast.module.css";

export default function Toast({ toast, showToast }) {
    if (!toast || !toast.show) return null;

    return (
        <div className={`${styles.toastContainer} ${toast.show ? styles.show : ""}`}>
            <div className={`${styles.toast} ${styles[toast.type]}`}>
                <div className={styles.toastIcon}>
                    {toast.type === "success" && <i className="bi bi-check-lg"></i>}
                    {toast.type === "error" && <i className="bi bi-x-lg"></i>}
                    {toast.type === "warning" && <i className="bi bi-exclamation-lg"></i>}
                    {toast.type === "info" && <i className="bi bi-info-lg"></i>}
                </div>
                <div className={styles.toastMessage}>{toast.message}</div>
                <button
                    className={styles.toastClose}
                    onClick={() => showToast && showToast("", "")}
                    aria-label="Đóng thông báo"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

