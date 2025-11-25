// src/pages/UserProfile.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";
import { getMyProfile, updateMyProfile } from "@/services/authService";
import styles from "@/assets/styles/userProfile.module.css";

export default function UserProfile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");
    const [error, setError] = useState("");
    
    // ✨ NEW: Edit mode state
    const [isEditing, setIsEditing] = useState(false);

    const [model, setModel] = useState({
        fullName: "",
        email: "",
        role: "",
        phone: "",
        org: "",
        bio: "",
        expYears: 0,
        specialties: ["Hồi sức", "Ngoại tổng quát", "Sản - Phụ khoa", "Nội khoa", "Tim mạch"],
        activeSpecs: new Set([]),
    });

    // ✨ NEW: Store original data for cancel
    const [originalModel, setOriginalModel] = useState(null);

    const [avatar, setAvatar] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getMyProfile();
            setProfile(data);
            
            const modelData = {
                fullName: data.fullName || "",
                email: data.email || "",
                role: data.role || "",
                phone: "",
                org: "",
                bio: "",
                expYears: 0,
                specialties: ["Hồi sức", "Ngoại tổng quát", "Sản - Phụ khoa", "Nội khoa", "Tim mạch"],
                activeSpecs: new Set([]),
            };
            
            setModel(modelData);
            setOriginalModel(JSON.parse(JSON.stringify(modelData))); // Deep copy
        } catch (err) {
            setError(err.message || "Không thể tải thông tin profile");
            setToast("❌ " + (err.message || "Không thể tải thông tin profile"));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setModel((prev) => ({
            ...prev,
            [name]: name === "expYears" ? Number(value) : value,
        }));
        setError("");
        setToast("");
    };

    const toggleSpec = (s) => {
        if (!isEditing) return; // ✨ Chỉ toggle khi đang edit
        
        setModel((prev) => {
            const next = new Set(prev.activeSpecs);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return { ...prev, activeSpecs: next };
        });
    };

    const onPickFile = () => {
        if (!isEditing) return; // ✨ Chỉ pick khi đang edit
        fileRef.current?.click();
    };

    const onFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => setAvatar(reader.result);
        reader.readAsDataURL(f);
    };

    const isValid = () => {
        return model.fullName.trim().length > 3;
    };

    // ✨ NEW: Enable edit mode
    const startEditing = () => {
        setIsEditing(true);
        setToast("");
        setError("");
    };

    // ✨ NEW: Cancel editing and restore original data
    const cancelEditing = () => {
        setModel(JSON.parse(JSON.stringify(originalModel)));
        setAvatar(null);
        setIsEditing(false);
        setToast("");
        setError("");
    };

    const onSave = async () => {
        if (!isValid()) {
            setToast("❗ Vui lòng kiểm tra lại thông tin bắt buộc.");
            return;
        }

        setSaving(true);
        setToast("");
        setError("");

        try {
            const updateData = {
                fullName: model.fullName,
            };

            const updated = await updateMyProfile(updateData);
            setProfile(updated);
            
            // ✨ Update original model after successful save
            setOriginalModel(JSON.parse(JSON.stringify(model)));
            
            setToast("✅ Đã lưu thông tin thành công!");
            setIsEditing(false); // ✨ Exit edit mode
        } catch (err) {
            setError(err.message || "Cập nhật thất bại");
            setToast("❌ " + (err.message || "Cập nhật thất bại"));
        } finally {
            setSaving(false);
        }
    };

    const getRoleDisplay = (role) => {
        switch (role) {
            case "admin": return "Quản trị viên";
            case "doctor": return "Bác sĩ";
            case "pharmacist": return "Dược sĩ";
            default: return "Người dùng";
        }
    };

    // Loading spinner
    if (loading && !profile) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={`spinner-border ${styles.spinner}`} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container py-4 py-md-5">
                <div className={styles.glass + " p-3 p-md-4 p-lg-5"}>
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={styles.chip}>
                                <i className="bi bi-person-gear me-1"></i> Hồ sơ
                            </span>
                            <h4 className={styles.title + " mb-0"}>Thông Tin Cá Nhân</h4>
                        </div>
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                            <span className={styles.roleBadge}>
                                <i className="bi bi-shield-check me-1"></i>
                                {getRoleDisplay(model.role)}
                            </span>
                            <button 
                                className={`btn ${styles.btnChangePassword} rounded-pill`}
                                onClick={() => navigate("/change-password")}
                            >
                                <i className="bi bi-shield-lock me-1"></i> Đổi Mật Khẩu
                            </button>
                        </div>
                    </div>

                    {/* Alert Messages */}
                    {toast && (
                        <div className={`alert ${toast.includes('✅') ? 'alert-success' : 'alert-warning'} d-flex align-items-center mb-4`} role="alert">
                            <div>{toast}</div>
                        </div>
                    )}

                    <div className="row g-4">
                        {/* Left: Avatar */}
                        <div className="col-lg-3">
                            <div className="d-flex flex-column align-items-center gap-3">
                                <div className={styles.avatar}>
                                    {avatar ? (
                                        <img src={avatar} alt="avatar" />
                                    ) : (
                                        <i className="bi bi-person fs-1" style={{ color: '#0d9488' }}></i>
                                    )}
                                </div>
                                <div className="text-center small text-muted px-2">
                                    Ảnh đại diện giúp hồ sơ chuyên nghiệp hơn.
                                </div>
                                <div className="d-flex flex-column gap-2 w-100">
                                    <button 
                                        disabled={!isEditing}
                                        className="btn btn-light rounded-pill w-100" 
                                        onClick={onPickFile}
                                        style={{ 
                                            borderColor: '#e2e8f0',
                                            opacity: isEditing ? 1 : 0.6,
                                            cursor: isEditing ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <i className="bi bi-upload me-1"></i> Thay ảnh
                                    </button>
                                    {avatar && (
                                        <button 
                                            disabled={!isEditing}
                                            className="btn btn-outline-danger rounded-pill w-100" 
                                            onClick={() => setAvatar(null)}
                                        >
                                            <i className="bi bi-x-circle me-1"></i> Gỡ
                                        </button>
                                    )}
                                </div>
                                <input 
                                    ref={fileRef} 
                                    type="file" 
                                    accept="image/*" 
                                    className="d-none" 
                                    onChange={onFile} 
                                />
                                <div className="w-100 mt-2 p-3 rounded" style={{ background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.1)' }}>
                                    <small className="text-muted d-block mb-1">
                                        <i className="bi bi-envelope me-2" style={{ color: '#0d9488' }}></i>
                                        {model.email}
                                    </small>
                                    <small className="text-muted d-block">
                                        <i className="bi bi-calendar-check me-2" style={{ color: '#0d9488' }}></i>
                                        Gia nhập: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Right: Form */}
                        <div className="col-lg-9">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-person me-2" style={{ color: '#0d9488' }}></i>
                                        Họ và tên <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        name="fullName" 
                                        className="form-control" 
                                        value={model.fullName} 
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="Nhập họ và tên"
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: !isEditing ? '#f1f5f9' : 'white',
                                            cursor: !isEditing ? 'not-allowed' : 'text'
                                        }}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-envelope me-2" style={{ color: '#0d9488' }}></i>
                                        Email
                                    </label>
                                    <input 
                                        name="email" 
                                        type="email" 
                                        className="form-control" 
                                        value={model.email} 
                                        disabled
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                    <small className="text-muted">Email không thể thay đổi</small>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-phone me-2" style={{ color: '#0d9488' }}></i>
                                        Số điện thoại
                                    </label>
                                    <input 
                                        disabled
                                        name="phone" 
                                        className="form-control" 
                                        value={model.phone} 
                                        onChange={handleChange} 
                                        placeholder="09xxxxxxxx"
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-building me-2" style={{ color: '#0d9488' }}></i>
                                        Nơi công tác
                                    </label>
                                    <input 
                                        disabled
                                        name="org" 
                                        className="form-control" 
                                        value={model.org} 
                                        onChange={handleChange} 
                                        placeholder="Tên bệnh viện"
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-12">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-hospital me-2" style={{ color: '#0d9488' }}></i>
                                        Chuyên khoa
                                    </label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {model.specialties.map(s => (
                                            <button 
                                                key={s} 
                                                type="button" 
                                                disabled={!isEditing}
                                                className={`btn btn-sm rounded-pill ${model.activeSpecs.has(s) ? 'btn-success ' + styles.spec + ' active' : 'btn-light ' + styles.spec}`} 
                                                onClick={() => toggleSpec(s)}
                                                style={{
                                                    cursor: isEditing ? 'pointer' : 'not-allowed',
                                                    opacity: isEditing ? 1 : 0.7
                                                }}
                                            >
                                                {model.activeSpecs.has(s) && <i className="bi bi-check-lg me-1"></i>}
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    <small className="text-muted d-block mt-2">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-12">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-card-text me-2" style={{ color: '#0d9488' }}></i>
                                        Tiểu sử
                                    </label>
                                    <textarea 
                                        disabled
                                        name="bio" 
                                        rows={3} 
                                        className="form-control" 
                                        value={model.bio} 
                                        onChange={handleChange} 
                                        placeholder="Mô tả ngắn về bản thân"
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-award me-2" style={{ color: '#0d9488' }}></i>
                                        Số năm kinh nghiệm
                                    </label>
                                    <input 
                                        disabled
                                        name="expYears" 
                                        type="number" 
                                        min={0} 
                                        className="form-control" 
                                        value={model.expYears} 
                                        onChange={handleChange}
                                        style={{ 
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-4 p-3 rounded" style={{ background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)' }}>
                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <small className="text-muted">
                                            <i className="bi bi-clock-history me-2" style={{ color: '#0d9488' }}></i>
                                            <strong>Cập nhật lần cuối:</strong> {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString("vi-VN") : "N/A"}
                                        </small>
                                    </div>
                                    <div className="col-md-6">
                                        <small className="text-muted">
                                            <i className="bi bi-check-circle me-2" style={{ color: '#0d9488' }}></i>
                                            <strong>Trạng thái:</strong> 
                                            <span className={`badge ms-2 ${profile?.isActive ? 'bg-success' : 'bg-danger'}`}>
                                                {profile?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                                            </span>
                                        </small>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                {!isEditing ? (
                                    <button 
                                        className={`btn ${styles.btnEdit} rounded-pill px-4 py-2`}
                                        onClick={startEditing}
                                    >
                                        <i className="bi bi-pencil-square me-2"></i>
                                        Cập nhật hồ sơ
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            className={`btn ${styles.btnCancel} rounded-pill px-4 py-2`}
                                            onClick={cancelEditing}
                                            disabled={saving}
                                        >
                                            <i className="bi bi-x-circle me-2"></i>
                                            Hủy
                                        </button>
                                        <button 
                                            disabled={!isValid() || saving} 
                                            className={`btn ${styles.btnTeal} rounded-pill px-4 py-2`}
                                            onClick={onSave}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Đang lưu...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-save2 me-2"></i>
                                                    Lưu Thông Tin
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}