// src/pages/UserProfile.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/utils/authContext";
import { getMyProfile, updateMyProfile } from "@/services/authService";

export default function UserProfile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");
    const [error, setError] = useState("");

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
            
            setModel(prev => ({
                ...prev,
                fullName: data.fullName || "",
                email: data.email || "",
                role: data.role || "",
            }));
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
        setModel((prev) => {
            const next = new Set(prev.activeSpecs);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return { ...prev, activeSpecs: next };
        });
    };

    const onPickFile = () => {
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
            setToast("✅ Đã lưu thông tin thành công!");
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
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                background: `radial-gradient(1200px 600px at 15% 10%, rgba(76, 225, 198, .18), transparent 60%),
                            radial-gradient(900px 500px at 90% 5%, rgba(76, 225, 198, .12), transparent 60%),
                            linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%)`
            }}>
                <div className="spinner-border" style={{ color: '#0d9488' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            minHeight: '100vh',
            background: `radial-gradient(1200px 600px at 15% 10%, rgba(76, 225, 198, .18), transparent 60%),
                        radial-gradient(900px 500px at 90% 5%, rgba(76, 225, 198, .12), transparent 60%),
                        linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%)`
        }}>
            <style>{`
                :root{--teal:#0d9488;--ink:#0f172a}
                
                /* ✨ GLASS CARD - ĐỒNG BỘ THEME */
                .glass-profile {
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(13, 148, 136, 0.12);
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
                    border-radius: 5px;
                    position: relative;
                    overflow: hidden;
                }
                
                .glass-profile::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, rgba(13, 148, 136, 0.5) 0%, rgba(8, 145, 178, 0.5) 100%);
                }
                
                /* GIỮ NGUYÊN TẤT CẢ STYLING BÊN TRONG */
                .title{font-weight:800; letter-spacing:.2px; color:#0b1432}
                .btn-teal{background:linear-gradient(135deg, #0d9488 0%, #0891b2 100%);border:none;color:white;font-weight:700;transition:all 0.3s}
                .btn-teal:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(13,148,136,0.3)}
                .btn-teal:disabled{opacity:0.6;cursor:not-allowed;transform:none}
                .chip{display:inline-block;padding:.3rem .75rem;border-radius:999px;background:rgba(13,148,136,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
                .avatar{width:104px;height:104px;border-radius:999px;background:linear-gradient(135deg, rgba(13,148,136,0.1) 0%, rgba(8,145,178,0.1) 100%);display:grid;place-items:center;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);border:3px solid rgba(13,148,136,0.2)}
                .avatar img{width:100%;height:100%;object-fit:cover}
                .spec{border:1px dashed rgba(15,23,42,.12);transition:all 0.2s}
                .spec.active{border:1px solid rgba(13,148,136,.55); background:rgba(13,148,136,.18);color:#0d3b3a}
                .spec:hover{transform:translateY(-2px)}
                .form-control:focus{border-color:#0d9488;box-shadow:0 0 0 0.2rem rgba(13,148,136,0.15)}
                .role-badge{background:rgba(13,148,136,0.15);color:#0d3b3a;padding:0.4rem 1rem;border-radius:999px;font-weight:600;font-size:0.9rem}
            `}</style>

            <div className="container py-4 py-md-5">
                {/* ✨ ĐỔI CLASS: glass → glass-profile */}
                <div className="glass-profile p-3 p-md-4 p-lg-5">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="chip">
                                <i className="bi bi-person-gear me-1"></i> Hồ sơ
                            </span>
                            <h4 className="title mb-0">Thông Tin Cá Nhân</h4>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                            <span className="role-badge">
                                <i className="bi bi-shield-check me-1"></i>
                                {getRoleDisplay(model.role)}
                            </span>
                            <button 
                                className="btn btn-outline-secondary rounded-pill" 
                                onClick={() => navigate("/change-password")}
                                style={{ borderColor: '#0d9488', color: '#0d9488' }}
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
                                <div className="avatar">
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
                                    <button disabled
                                        className="btn btn-light rounded-pill w-100" 
                                        onClick={onPickFile}
                                        style={{ borderColor: '#e2e8f0' }}
                                    >
                                        <i className="bi bi-upload me-1"></i> Thay ảnh
                                    </button>
                                    {avatar && (
                                        <button 
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
                                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "N/A"}
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
                                        placeholder="Nhập họ và tên"
                                        style={{ borderRadius: '12px' }}
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
                                    <input disabled
                                        name="phone" 
                                        className="form-control" 
                                        value={model.phone} 
                                        onChange={handleChange} 
                                        placeholder="09xxxxxxxx"
                                        style={{ borderRadius: '12px' }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-building me-2" style={{ color: '#0d9488' }}></i>
                                        Nơi công tác
                                    </label>
                                    <input disabled
                                        name="org" 
                                        className="form-control" 
                                        value={model.org} 
                                        onChange={handleChange} 
                                        placeholder="Tên bệnh viện"
                                        style={{ borderRadius: '12px' }}
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
                                                className={`btn btn-sm rounded-pill ${model.activeSpecs.has(s) ? 'btn-success spec active' : 'btn-light spec'}`} 
                                                onClick={() => toggleSpec(s)}
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
                                    <textarea disabled
                                        name="bio" 
                                        rows={3} 
                                        className="form-control" 
                                        value={model.bio} 
                                        onChange={handleChange} 
                                        placeholder="Mô tả ngắn về bản thân"
                                        style={{ borderRadius: '12px' }}
                                    />
                                    <small className="text-muted">Tính năng này sẽ được phát triển sau</small>
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">
                                        <i className="bi bi-award me-2" style={{ color: '#0d9488' }}></i>
                                        Số năm kinh nghiệm
                                    </label>
                                    <input disabled
                                        name="expYears" 
                                        type="number" 
                                        min={0} 
                                        className="form-control" 
                                        value={model.expYears} 
                                        onChange={handleChange}
                                        style={{ borderRadius: '12px' }}
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

                            {/* Save Button */}
                            <div className="d-flex justify-content-end mt-4">
                                <button 
                                    disabled={!isValid() || saving} 
                                    className="btn btn-teal rounded-pill px-4 py-2" 
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}