import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
export default function UserProfile() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true; document.body.appendChild(js);

        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
    }, []);
    const navigate = useNavigate(); // Navigation
    const [model, setModel] = useState({
        fullName: "Bác sĩ Nguyễn Văn A",
        email: "doctor@example.com",
        phone: "0901234567",
        org: "Bệnh viện Trung ương",
        bio: "Luôn tận tâm vì sức khỏe bệnh nhân.",
        expYears: 10,
        specialties: ["Hồi sức", "Ngoại tổng quát", "Sản - Phụ khoa", "Nội khoa", "Tim mạch"],
        activeSpecs: new Set(["Hồi sức", "Nội khoa", "Tim mạch"]),
    });

    const [avatar, setAvatar] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState("");

    const fileRef = useRef(null);

    function handleChange(e) {
        const { name, value } = e.target;
        setModel((prev) => ({
            ...prev,
            [name]: name === "expYears" ? Number(value) : value,
        }));
    }

    function toggleSpec(s) {
        setModel((prev) => {
            const next = new Set(prev.activeSpecs);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return { ...prev, activeSpecs: next };
        });
    }

    function onPickFile() {
        fileRef.current?.click();
    }

    function onFile(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => setAvatar(reader.result);
        reader.readAsDataURL(f);
    }

    function isValid() {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email);
        const phoneOk = /^\d{9,11}$/.test(model.phone.trim());
        return emailOk && phoneOk && model.fullName.trim().length > 3;
    }

    async function onSave() {
        if (!isValid()) {
            setToast("❗ Vui lòng kiểm tra lại thông tin bắt buộc.");
            return;
        }
        setSaving(true);
        setToast("");
        await new Promise((r) => setTimeout(r, 900)); // mô phỏng API
        setSaving(false);
        setToast("✅ Đã lưu thông tin thành công!");
    }


    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            minHeight: '100vh',
            background: `radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                  radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                  linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%)`
        }}>
            <style>{`
        :root{--teal:#4CE1C6;--ink:#0f172a}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);}
        .rounded-2xl{border-radius:22px}
        .title{font-weight:800; letter-spacing:.2px; color:#0b1432}
        .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
        .btn-teal:hover{filter:brightness(1.05)}
        .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
        .avatar{width:104px;height:104px;border-radius:999px;background:#eaf7f4;display:grid;place-items:center;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08)}
        .avatar img{width:100%;height:100%;object-fit:cover}
        .spec{border:1px dashed rgba(15,23,42,.12)}
        .spec.active{border:1px solid rgba(20,226,193,.55); background:rgba(20,226,193,.18)}
      `}</style>

            <div className="container py-4 py-md-5">
                <div className="glass rounded-2xl p-3 p-md-4 p-lg-5">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                        <div className="d-flex align-items-center gap-2">
                            <span className="chip"><i className="bi bi-person-gear me-1"></i> Hồ sơ</span>
                            <h4 className="title mb-0">Thông Tin Người Dùng</h4>
                        </div>
                        <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate("/change-password")}><i className="bi bi-shield-lock me-1"></i> Đổi Mật Khẩu</button>
                    </div>

                    <div className="row g-4">
                        {/* Left: Avatar */}
                        <div className="col-lg-3">
                            <div className="d-flex flex-column align-items-center gap-2">
                                <div className="avatar">
                                    {avatar ? <img src={avatar} alt="avatar" /> : <i className="bi bi-person fs-1 text-muted"></i>}
                                </div>
                                <div className="text-center small text-muted">Ảnh đại diện giúp hồ sơ chuyên nghiệp hơn.</div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-light rounded-pill" onClick={onPickFile}><i className="bi bi-upload me-1"></i> Thay ảnh</button>
                                    {avatar && <button className="btn btn-outline-danger rounded-pill" onClick={() => setAvatar(null)}><i className="bi bi-x-circle me-1"></i> Gỡ</button>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={onFile} />
                            </div>
                        </div>

                        {/* Right: Form */}
                        <div className="col-lg-9">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Họ và tên</label>
                                    <input name="fullName" className="form-control" value={model.fullName} onChange={handleChange} placeholder="Nhập họ và tên" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email</label>
                                    <input name="email" type="email" className="form-control" value={model.email} onChange={handleChange} placeholder="email@benhvien.vn" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Số điện thoại</label>
                                    <input name="phone" className="form-control" value={model.phone} onChange={handleChange} placeholder="09xxxxxxxx" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Nơi công tác</label>
                                    <input name="org" className="form-control" value={model.org} onChange={handleChange} placeholder="Tên bệnh viện" />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Chuyên khoa</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {model.specialties.map(s => (
                                            <button key={s} type="button" className={`btn btn-sm rounded-pill ${model.activeSpecs.has(s) ? 'btn-success spec active' : 'btn-light spec'}`} onClick={() => toggleSpec(s)}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Tiểu sử</label>
                                    <textarea name="bio" rows={3} className="form-control" value={model.bio} onChange={handleChange} placeholder="Mô tả ngắn về bản thân" />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">Số năm kinh nghiệm</label>
                                    <input name="expYears" type="number" min={0} className="form-control" value={model.expYears} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button disabled={!isValid() || saving} className="btn btn-teal rounded-pill px-4" onClick={onSave}>
                                    {saving ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : <i className="bi bi-save2 me-1"></i>}
                                    Lưu Thông Tin
                                </button>
                            </div>

                            {toast && (
                                <div className="alert alert-success mt-3 py-2"><i className="bi bi-check2-circle me-2"></i>{toast}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
