import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError("Vui lòng nhập email");
            return;
        }
        setError("");
        setLoading(true);

        try {
            // ✅ Giả lập API xác nhận email
            await new Promise((r) => setTimeout(r, 1000));

            alert("✅ Đã gửi mã xác nhận / link đặt lại mật khẩu tới email của bạn!");
            navigate("/reset-password?mode=forgot");
        } catch (err) {
            setError("❌ Không thể gửi xác nhận, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-vh-100 d-flex align-items-center justify-content-center"
            style={{
                background: "linear-gradient(180deg, #f1f9ff 0%, #ffffff 100%)",
                fontFamily: "Inter, sans-serif",
            }}
        >
            <div
                className="card shadow-lg border-0 p-5"
                style={{
                    maxWidth: "480px",
                    width: "100%",
                    borderRadius: "20px",
                }}
            >
                <h3 className="fw-bold text-primary text-center mb-3">
                    🔑 Quên Mật Khẩu
                </h3>
                <p className="text-muted text-center mb-4">
                    Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label fw-semibold">Email</label>
                        <input
                            type="email"
                            className="form-control form-control-lg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nhapemail@benhvien.vn"
                        />
                        {error && (
                            <div className="text-danger small mt-2">{error}</div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 rounded-pill"
                        disabled={loading}
                    >
                        {loading ? "Đang gửi..." : "Xác nhận"}
                    </button>

                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-link text-decoration-none"
                            onClick={() => navigate("/")}
                        >
                            ← Quay lại đăng nhập
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
