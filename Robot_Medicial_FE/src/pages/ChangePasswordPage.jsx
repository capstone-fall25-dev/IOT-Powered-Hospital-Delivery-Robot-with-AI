import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ChangePasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode") || "change"; // "change" | "forgot"

    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const validate = () => {
        const e = {};
        if (mode === "change" && !form.currentPassword)
            e.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
        if (!form.newPassword) e.newPassword = "Vui lòng nhập mật khẩu mới";
        else if (form.newPassword.length < 8)
            e.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
        if (form.newPassword !== form.confirmPassword)
            e.confirmPassword = "Mật khẩu xác nhận không khớp";
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const eobj = validate();
        setErrors(eobj);
        if (Object.keys(eobj).length) return;

        try {
            setSubmitting(true);

            // Giả lập API đổi/đặt lại mật khẩu
            await new Promise((r) => setTimeout(r, 1000));

            if (mode === "forgot") alert("✅ Đặt lại mật khẩu thành công!");
            else alert("✅ Đổi mật khẩu thành công!");

            navigate("/user-info");
        } catch (err) {
            setErrors({ submit: "Thao tác thất bại, vui lòng thử lại." });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="min-vh-100 py-5 d-flex align-items-center"
            style={{
                background: "linear-gradient(180deg, #f8f9fa 0%, #eef2f7 100%)",
            }}
        >
            <div className="container">
                <div
                    className="card shadow-lg border-0 mx-auto p-5"
                    style={{ maxWidth: "600px", borderRadius: "20px" }}
                >
                    <h3 className="fw-bold text-primary text-center mb-4">
                        {mode === "forgot" ? "🔑 Đặt Lại Mật Khẩu" : "🔒 Đổi Mật Khẩu"}
                    </h3>

                    <form onSubmit={handleSubmit}>
                        {mode === "change" && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold">
                                    Mật khẩu hiện tại
                                </label>
                                <input
                                    type={showPw ? "text" : "password"}
                                    className="form-control form-control-lg"
                                    value={form.currentPassword}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            currentPassword: e.target.value,
                                        })
                                    }
                                />
                                {errors.currentPassword && (
                                    <div className="text-danger small mt-1">
                                        {errors.currentPassword}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Mật khẩu mới
                            </label>
                            <input
                                type={showPw ? "text" : "password"}
                                className="form-control form-control-lg"
                                value={form.newPassword}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        newPassword: e.target.value,
                                    })
                                }
                            />
                            {errors.newPassword && (
                                <div className="text-danger small mt-1">
                                    {errors.newPassword}
                                </div>
                            )}
                            <div className="small text-muted mt-1">
                                Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt.
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Xác nhận mật khẩu mới
                            </label>
                            <input
                                type={showPw ? "text" : "password"}
                                className="form-control form-control-lg"
                                value={form.confirmPassword}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        confirmPassword: e.target.value,
                                    })
                                }
                            />
                            {errors.confirmPassword && (
                                <div className="text-danger small mt-1">
                                    {errors.confirmPassword}
                                </div>
                            )}
                        </div>

                        <div className="form-check form-switch mb-4">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={showPw}
                                onChange={(e) => setShowPw(e.target.checked)}
                                id="showPwToggle"
                            />
                            <label
                                htmlFor="showPwToggle"
                                className="form-check-label small text-muted"
                            >
                                Hiển thị mật khẩu
                            </label>
                        </div>

                        {errors.submit && (
                            <div className="text-danger small mb-3">
                                {errors.submit}
                            </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center">
                            <button
                                type="button"
                                className="btn btn-outline-secondary px-4"
                                onClick={() => navigate("/user-info")}
                            >
                                ← Quay lại
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-success px-4"
                            >
                                {submitting
                                    ? "Đang lưu..."
                                    : mode === "forgot"
                                        ? "Đặt lại mật khẩu"
                                        : "Đổi mật khẩu"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
