import { useEffect, useMemo, useRef, useState } from "react";

export default function DoctorEdit() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"; document.head.appendChild(css);
        const icons = document.createElement("link"); icons.rel = "stylesheet"; icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"; document.head.appendChild(icons);
        const font = document.createElement("link"); font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"; document.head.appendChild(font);
        const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"; js.defer = true; document.body.appendChild(js);
        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
    }, []);

    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.95);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);border-radius:20px}
      .rounded-2xl{border-radius:22px}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .section-title{font-weight:800;color:#0b1432}
      .avatar{width:120px;height:120px;border-radius:999px;background:#eaf7f4;display:grid;place-items:center;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08)}
      .avatar img{width:100%;height:100%;object-fit:cover}
      .fieldset{border:1px solid rgba(2,6,23,.08);border-radius:12px;padding:12px}
      .fieldset legend{font-size:.9rem;font-weight:700;margin:0 10px;background:white;padding:0 6px;color:#334155}
      .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c}
    `}</style>
    );

    const [model, setModel] = useState({
        fullName: "BS. Nguyễn Văn A",
        email: "nguyenvana@example.com",
        phone: "",
        hospital: "Bệnh viện Bạch Mai",
        username: "bsnguyenvana",
        password: "",
        autoPassword: false,
        sendEmail: true,
        active: true,
        role: "Bác sĩ" | "Điều phối" | "Quản trị", // "Bác sĩ" | "Điều phối" | "Quản trị"
        specialty: "Nội khoa",
        avatar: null,
    });

    const [showPwd, setShowPwd] = useState(false);
    const fileRef = useRef(null);

    // Sinh mật khẩu ngẫu nhiên
    function genPassword() {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        let s = "";
        for (let i = 0; i < 12; i++) {
            s += chars[Math.floor(Math.random() * chars.length)];
        }
        return s;
    }

    // Đánh giá độ mạnh mật khẩu
    const strength = useMemo(() => {
        const v = model.password || "";
        let n = 0;
        if (v.length >= 8) n++;
        if (/[A-Z]/.test(v)) n++;
        if (/[a-z]/.test(v)) n++;
        if (/\d/.test(v)) n++;
        if (/[^\w\s]/.test(v)) n++;
        const label = n <= 2 ? "Yếu" : n === 3 ? "Trung bình" : "Mạnh";
        const variant = n <= 2 ? "danger" : n === 3 ? "warning" : "success";
        const width = n <= 2 ? "25%" : n === 3 ? "60%" : "100%";
        return { n, label, variant, width };
    }, [model.password]);

    // Xử lý thay đổi form
    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setModel((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    // Chọn ảnh đại diện
    function pickFile() {
        if (fileRef.current) {
            fileRef.current.click();
        }
    }

    // Load ảnh lên form
    function onFile(e) {
        const f = e.target.files?.[0];
        if (!f) return;

        const r = new FileReader();
        r.onload = () =>
            setModel((m) => ({
                ...m,
                avatar: r.result,
            }));
        r.readAsDataURL(f);
    }

    // Kiểm tra hợp lệ form
    function isValid() {
        const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email);
        const okName = model.fullName.trim().length > 3;
        const okUser = model.username.trim().length > 4;
        return okEmail && okName && okUser;
    }

    // Lưu dữ liệu
    function save() {
        if (!isValid()) return alert("Vui lòng kiểm tra lại các trường bắt buộc.");
        console.log("Dữ liệu gửi đi:", model);
        alert("Lưu thành công!");
    }

    return (
        <div className="page">
            {styles}

            <div className="container-lg py-3 py-md-4">
                <a href="#" className="btn btn-outline-secondary btn-sm rounded-pill mb-3"><i className="bi bi-arrow-left me-1"></i> Quay lại danh sách</a>

                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h4 className="section-title mb-0">Cập nhật thông tin Bác sĩ</h4>
                    <span className="badge text-bg-success">Active</span>
                </div>
                <p className="text-muted mb-3">Điền thông tin bổ sung khi cấp tài khoản cho bác sĩ</p>

                <div className="row g-3 g-lg-4">
                    {/* Left form */}
                    <div className="col-lg-8">
                        <div className="glass p-3 p-md-4 rounded-2xl mb-3">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label">Tên đầy đủ</label>
                                    <input name="fullName" className="form-control" value={model.fullName} onChange={handleChange} placeholder="Họ và tên" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email</label>
                                    <input name="email" type="email" className="form-control" value={model.email} onChange={handleChange} placeholder="email@benhvien.vn" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Số điện thoại</label>
                                    <input name="phone" className="form-control" value={model.phone} onChange={handleChange} placeholder="09xxxxxxxx" />
                                </div>

                                <div className="col-md-12">
                                    <div className="fieldset">
                                        <legend>Tài khoản đăng nhập</legend>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label">Tên đăng nhập</label>
                                                <input name="username" className="form-control" value={model.username} onChange={handleChange} />
                                            </div>
                                            <div className="col-md-6 d-flex align-items-end">
                                                <div className="form-check form-switch">
                                                    <input className="form-check-input" id="autoPwd" type="checkbox" name="autoPassword" checked={model.autoPassword} onChange={handleChange} />
                                                    <label htmlFor="autoPwd" className="form-check-label">Tự tạo mật khẩu ngẫu nhiên</label>
                                                </div>
                                            </div>

                                            <div className="col-md-9">
                                                <label className="form-label">Mật khẩu</label>
                                                <div className="input-group">
                                                    <input type={showPwd ? 'text' : 'password'} name="password" className="form-control" value={model.password} onChange={handleChange} placeholder="Nhập mật khẩu hoặc tạo tự động..." />
                                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwd(s => !s)}>{showPwd ? 'Ẩn' : 'Hiện'}</button>
                                                    <button type="button" className="btn btn-outline-primary" onClick={() => setModel(m => ({ ...m, password: genPassword() }))}><i className="bi bi-stars me-1"></i>Tạo mới</button>
                                                </div>
                                                <div className="progress mt-2" role="progressbar" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={5}>
                                                    <div className={`progress-bar bg-${strength.variant}`} style={{ width: strength.width }}></div>
                                                </div>
                                                <div className="small text-muted mt-1">Độ mạnh: <strong>{strength.label}</strong></div>
                                            </div>
                                            <div className="col-md-3 d-flex align-items-end">
                                                <div className="form-check">
                                                    <input className="form-check-input" id="sendEmail" type="checkbox" name="sendEmail" checked={model.sendEmail} onChange={handleChange} />
                                                    <label htmlFor="sendEmail" className="form-check-label">Gửi thông tin đến email bác sĩ</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Chuyên khoa</label>
                                    <select name="specialty" className="form-select" value={model.specialty} onChange={handleChange}>
                                        {['Nội khoa', 'Ngoại khoa', 'Da liễu', 'Nhi khoa', 'Hồi sức', 'Tim mạch'].map(x => <option key={x} value={x}>{x}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Nơi công tác</label>
                                    <input name="hospital" className="form-control" value={model.hospital} onChange={handleChange} placeholder="Tên bệnh viện" />
                                </div>

                                <div className="col-12 d-flex justify-content-end gap-2">
                                    <a href="#" className="btn btn-outline-secondary rounded-pill"><i className="bi bi-arrow-left me-1"></i> Quay lại</a>
                                    <button disabled={!isValid()} className="btn btn-teal rounded-pill" onClick={save}><i className="bi bi-save2 me-1"></i> Lưu thay đổi</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="col-lg-4">
                        <div className="glass p-3 p-md-4 rounded-2xl mb-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="avatar">{model.avatar ? <img src={model.avatar} alt="avatar" /> : <i className="bi bi-person fs-1 text-muted"></i>}</div>
                                <div>
                                    <div className="mb-2">
                                        <button className="btn btn-light btn-sm rounded-pill me-2" onClick={pickFile}><i className="bi bi-upload me-1"></i> Chọn tệp</button>
                                        <input ref={fileRef} className="d-none" type="file" accept="image/*" onChange={onFile} />
                                        {model.avatar && <button className="btn btn-outline-danger btn-sm rounded-pill" onClick={() => setModel(m => ({ ...m, avatar: null }))}><i className="bi bi-x-circle me-1"></i> Gỡ ảnh</button>}
                                    </div>
                                    <div className="small text-muted">Ảnh có dạng tròn và sẽ tự căn chỉnh.</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-3 p-md-4 rounded-2xl mb-3">
                            <div className="form-check form-switch">
                                <input className="form-check-input" id="active" type="checkbox" name="active" checked={model.active} onChange={handleChange} />
                                <label htmlFor="active" className="form-check-label">Kích hoạt tài khoản</label>
                            </div>
                            <div className="mt-3">
                                <label className="form-label">Vai trò</label>
                                <select name="role" className="form-select" value={model.role} onChange={handleChange}>
                                    <option>Bác sĩ</option>
                                    <option>Điều phối</option>
                                    <option>Quản trị</option>
                                </select>
                            </div>
                        </div>

                        <div className="glass p-3 p-md-4 rounded-2xl">
                            <div className="fw-bold mb-2">Preview</div>
                            <div className="d-flex align-items-start gap-3">
                                <div className="avatar" style={{ width: 64, height: 64 }}>{model.avatar ? <img src={model.avatar} alt="avatar" /> : <i className="bi bi-person fs-4 text-muted"></i>}</div>
                                <div>
                                    <div className="fw-semibold">{model.fullName}</div>
                                    <div className="text-muted small">{model.hospital}</div>
                                    <div className="text-muted small">{model.specialty}</div>
                                    <span className={`badge ${model.active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} border mt-1`}>{model.active ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
