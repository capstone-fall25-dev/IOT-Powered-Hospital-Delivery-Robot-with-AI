import React, { useState } from "react";

export default function DoctorProfileProvisionForm({ initialData = {}, onCancel, onSave }) {
    const [form, setForm] = useState({
        fullName: initialData.fullName || "",
        displayName: initialData.displayName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        licenseNumber: initialData.licenseNumber || "",
        clinicHospital: initialData.clinicHospital || "",
        specialties: initialData.specialties || [],
        degrees: initialData.degrees || "",
        yearsExperience: initialData.yearsExperience || "",
        languages: initialData.languages || [],
        bio: initialData.bio || "",
        availabilityNote: initialData.availabilityNote || "",
        isActive: typeof initialData.isActive === "boolean" ? initialData.isActive : true,
        role: initialData.role || "doctor",
        photoFile: null,
        certifications: initialData.certifications || [],
        username: initialData.username || "",
        password: "",
        confirmPassword: "",
        autoGeneratePassword: true,
        showPassword: false,
        sendCredentialsEmail: true,
    });

    const [generatedPassword, setGeneratedPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const specialtiesOptions = [
        "Nội khoa",
        "Ngoại tổng quát",
        "Sản - Phụ khoa",
        "Nhi khoa",
        "Tim mạch",
        "Da liễu",
        "Khác",
    ];

    const languageOptions = ["Tiếng Việt", "English", "中文", "ภาษาไทย"];

    function generatePassword(len = 12) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_+";
        let out = "";
        for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
        return out;
    }

    function passwordStrength(pw) {
        if (!pw) return "empty";
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return "Very weak";
        if (score === 2) return "Weak";
        if (score === 3) return "Medium";
        if (score === 4) return "Strong";
        return "Very strong";
    }

    function validate() {
        const e = {};
        if (!form.fullName.trim()) e.fullName = "Tên đầy đủ là bắt buộc";
        if (!form.email.trim()) e.email = "Email là bắt buộc";
        if (form.email && (form.email.indexOf("@") === -1 || form.email.split("@").length !== 2))
            e.email = "Email không hợp lệ";
        if (!form.licenseNumber.trim()) e.licenseNumber = "Số giấy phép hành nghề là bắt buộc";
        if (!form.username.trim()) e.username = "Tên đăng nhập (username) là bắt buộc";
        if (form.username && form.username.length < 4) e.username = "Username ít nhất 4 ký tự";

        if (!form.autoGeneratePassword) {
            if (!form.password) e.password = "Mật khẩu là bắt buộc (hoặc bật auto-generate)";
            if (form.password && form.password.length < 8)
                e.password = "Mật khẩu nên có ít nhất 8 ký tự";
            if (form.password !== form.confirmPassword)
                e.confirmPassword = "Mật khẩu xác nhận không khớp";
        }

        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const eobj = validate();
        setErrors(eobj);
        if (Object.keys(eobj).length) return;

        setSubmitting(true);
        try {
            let finalPassword = form.password;
            if (form.autoGeneratePassword) {
                finalPassword = generatePassword(12);
                setGeneratedPassword(finalPassword);
            }

            const payload = {
                ...form,
                specialties: form.specialties,
                languages: form.languages,
                account: {
                    username: form.username,
                    password: finalPassword,
                    sendCredentialsEmail: form.sendCredentialsEmail,
                },
            };

            if (onSave) await onSave(payload);
        } catch (err) {
            setErrors({ submit: err?.message || "Lỗi khi lưu thông tin" });
        } finally {
            setSubmitting(false);
        }
    }

    function handleChange(field, value) {
        setForm((s) => ({ ...s, [field]: value }));
    }

    function toggleArrayValue(field, value) {
        setForm((s) => {
            const arr = s[field] || [];
            if (arr.includes(value)) return { ...s, [field]: arr.filter((x) => x !== value) };
            return { ...s, [field]: [...arr, value] };
        });
    }

    function handleFileChange(field, file) {
        setForm((s) => ({ ...s, [field]: file }));
    }

    function handleGenerateNow() {
        const pw = generatePassword(12);
        setGeneratedPassword(pw);
        setForm((s) => ({ ...s, password: pw, confirmPassword: pw, autoGeneratePassword: true }));
    }

    return (
        <div className="container my-5">
            <div className="card shadow border-0">
                <div className="card-header bg-teal text-white d-flex justify-content-between align-items-center">
                    <div>
                        <h4 className="mb-0" style={{ color: "black" }}>Cập nhật thông tin Bác sĩ</h4>
                        <small style={{ color: "black" }}>Điền thông tin bổ sung khi cấp tài khoản cho bác sĩ</small>
                    </div>
                    <span className={`badge ${form.isActive ? "bg-success" : "bg-secondary"}`}>
                        {form.isActive ? "Active" : "Inactive"}
                    </span>
                </div>

                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-4">
                            {/* Cột trái */}
                            <div className="col-lg-8">
                                {/* Tên */}
                                <div className="mb-3">
                                    <label className="form-label">Tên đầy đủ</label>
                                    <input
                                        value={form.fullName}
                                        onChange={(e) => handleChange("fullName", e.target.value)}
                                        className="form-control"
                                    />
                                    {errors.fullName && <div className="text-danger small">{errors.fullName}</div>}
                                </div>

                                {/* Email + Phone */}
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Email</label>
                                        <input
                                            value={form.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                            className="form-control"
                                        />
                                        {errors.email && <div className="text-danger small">{errors.email}</div>}
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Số điện thoại</label>
                                        <input
                                            value={form.phone}
                                            onChange={(e) => handleChange("phone", e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                {/* Account section */}
                                <div className="card border mb-3">
                                    <div className="card-header bg-light fw-bold">Tài khoản đăng nhập</div>
                                    <div className="card-body">
                                        <div className="mb-3">
                                            <label className="form-label">Tên đăng nhập</label>
                                            <input
                                                value={form.username}
                                                onChange={(e) => handleChange("username", e.target.value)}
                                                className="form-control"
                                            />
                                            {errors.username && <div className="text-danger small">{errors.username}</div>}
                                        </div>

                                        <div className="form-check form-switch mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={form.autoGeneratePassword}
                                                onChange={(e) =>
                                                    handleChange("autoGeneratePassword", e.target.checked)
                                                }
                                            />
                                            <label className="form-check-label">Tự tạo mật khẩu ngẫu nhiên</label>
                                        </div>

                                        {!form.autoGeneratePassword && (
                                            <>
                                                <div className="row">
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label">Mật khẩu</label>
                                                        <input
                                                            type={form.showPassword ? "text" : "password"}
                                                            value={form.password}
                                                            onChange={(e) => handleChange("password", e.target.value)}
                                                            className="form-control"
                                                        />
                                                        {errors.password && (
                                                            <div className="text-danger small">{errors.password}</div>
                                                        )}
                                                        <div className="small text-muted">
                                                            Độ mạnh: {passwordStrength(form.password)}
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label">Xác nhận mật khẩu</label>
                                                        <input
                                                            type={form.showPassword ? "text" : "password"}
                                                            value={form.confirmPassword}
                                                            onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                                            className="form-control"
                                                        />
                                                        {errors.confirmPassword && (
                                                            <div className="text-danger small">
                                                                {errors.confirmPassword}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {form.autoGeneratePassword && (
                                            <div className="mb-3">
                                                <label className="form-label">Mật khẩu (tự tạo)</label>
                                                <div className="input-group">
                                                    <input
                                                        readOnly
                                                        value={generatedPassword || "(Chưa tạo)"}
                                                        className="form-control"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={handleGenerateNow}
                                                    >
                                                        Tạo mới
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={form.sendCredentialsEmail}
                                                onChange={(e) =>
                                                    handleChange("sendCredentialsEmail", e.target.checked)
                                                }
                                            />
                                            <label className="form-check-label small">
                                                Gửi thông tin tài khoản tới email bác sĩ
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin khác */}
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Cơ sở / Bệnh viện</label>
                                        <input
                                            value={form.clinicHospital}
                                            onChange={(e) => handleChange("clinicHospital", e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Chuyên khoa</label>
                                    <div className="row">
                                        {specialtiesOptions.map((s) => (
                                            <div className="col-md-4" key={s}>
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={form.specialties.includes(s)}
                                                        onChange={() => toggleArrayValue("specialties", s)}
                                                    />
                                                    <label className="form-check-label">{s}</label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Kinh nghiệm (năm)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.yearsExperience}
                                            onChange={(e) => handleChange("yearsExperience", e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Ghi chú lịch khám</label>
                                    <input
                                        value={form.availabilityNote}
                                        onChange={(e) => handleChange("availabilityNote", e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            {/* Cột phải */}
                            <div className="col-lg-4">
                                <div className="card p-3 mb-3 text-center">
                                    <div
                                        className="mx-auto rounded-circle bg-light d-flex align-items-center justify-content-center mb-2"
                                        style={{ width: "120px", height: "120px" }}
                                    >
                                        {form.photoFile ? (
                                            <img
                                                src={URL.createObjectURL(form.photoFile)}
                                                alt="avatar"
                                                className="rounded-circle img-fluid"
                                            />
                                        ) : (
                                            <span className="text-muted small">Chưa có ảnh</span>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange("photoFile", e.target.files?.[0])}
                                        className="form-control"
                                    />
                                </div>

                                <div className="card p-3 mb-3">
                                    <div className="form-check form-switch mb-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={(e) => handleChange("isActive", e.target.checked)}
                                        />
                                        <label className="form-check-label">Kích hoạt tài khoản</label>
                                    </div>

                                    <label className="form-label">Vai trò</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => handleChange("role", e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="doctor">Bác sĩ</option>
                                        <option value="consultant">Consultant</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="card p-3">
                                    <div className="small text-muted">Preview</div>
                                    <div className="fw-bold">{form.fullName || "—"}</div>
                                    <div className="text-muted small">{form.clinicHospital || "—"}</div>
                                    <div className="small mt-2">{form.specialties.join(", ") || "—"}</div>
                                    <div className="small mt-2">
                                        Username: <span className="fw-semibold">{form.username || "—"}</span>
                                    </div>
                                    {generatedPassword && (
                                        <div className="small mt-1 text-muted">
                                            Password: <span className="fw-semibold">{generatedPassword}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-4">
                            <div>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="btn btn-outline-secondary me-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary"
                                >
                                    {submitting ? "Đang lưu..." : "Lưu và cấp tài khoản"}
                                </button>
                            </div>
                            {errors.submit && <div className="text-danger small">{errors.submit}</div>}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
