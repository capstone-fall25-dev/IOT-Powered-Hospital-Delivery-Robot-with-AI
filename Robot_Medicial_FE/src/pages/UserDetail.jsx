import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UserInfo({ initialData = {}, onSave }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: initialData.fullName || "Bác sĩ Nguyễn Văn A",
        email: initialData.email || "doctor@example.com",
        phone: initialData.phone || "0901234567",
        clinicHospital: initialData.clinicHospital || "Bệnh viện Trung ương",
        specialties: initialData.specialties || ["Nội khoa"],
        yearsExperience: initialData.yearsExperience || 10,
        bio: initialData.bio || "Luôn tận tâm vì sức khỏe bệnh nhân.",
        photo: initialData.photo || null,
    });

    const specialtiesOptions = [
        "Nội khoa",
        "Ngoại tổng quát",
        "Sản - Phụ khoa",
        "Nhi khoa",
        "Tim mạch",
        "Da liễu",
        "Khác",
    ];

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setForm((prev) => ({ ...prev, photo: URL.createObjectURL(file) }));
    };

    return (
        <div
            className="min-vh-100 py-5"
            style={{
                background: "linear-gradient(180deg, #f8f9fa 0%, #eef2f7 100%)",
            }}
        >
            <div className="container-lg">
                <div
                    className="card shadow-lg border-0 mx-auto p-4"
                    style={{
                        maxWidth: "950px",
                        borderRadius: "20px",
                        background: "#fff",
                    }}
                >
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="fw-bold text-primary mb-0">
                            👨‍⚕️ Thông Tin Người Dùng
                        </h3>
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => navigate("/change-password")}
                        >
                            🔑 Đổi Mật Khẩu
                        </button>
                    </div>

                    <div className="row g-4">
                        {/* Left column */}
                        <div className="col-md-4 text-center">
                            <div
                                className="position-relative mx-auto mb-3"
                                style={{
                                    width: "150px",
                                    height: "150px",
                                }}
                            >
                                <img
                                    src={
                                        form.photo ||
                                        "https://cdn-icons-png.flaticon.com/512/9131/9131529.png"
                                    }
                                    alt="Avatar"
                                    className="rounded-circle shadow"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                                <label
                                    htmlFor="upload"
                                    className="btn btn-sm btn-light border position-absolute bottom-0 start-50 translate-middle-x"
                                    style={{
                                        borderRadius: "30px",
                                        boxShadow: "0 0 6px rgba(0,0,0,0.1)",
                                    }}
                                >
                                    <i className="bi bi-camera"></i> Thay ảnh
                                </label>
                                <input
                                    id="upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    hidden
                                />
                            </div>

                            <div className="small text-muted fst-italic">
                                Ảnh đại diện giúp hồ sơ chuyên nghiệp hơn.
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="col-md-8">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Họ và tên
                                    </label>
                                    <input
                                        className="form-control form-control-lg"
                                        value={form.fullName}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                fullName: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Email
                                    </label>
                                    <input
                                        className="form-control form-control-lg"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                email: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Số điện thoại
                                    </label>
                                    <input
                                        className="form-control form-control-lg"
                                        value={form.phone}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                phone: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Nơi công tác
                                    </label>
                                    <input
                                        className="form-control form-control-lg"
                                        value={form.clinicHospital}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                clinicHospital: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="form-label fw-semibold">
                                    Chuyên khoa
                                </label>
                                <div className="d-flex flex-wrap gap-2">
                                    {specialtiesOptions.map((opt) => (
                                        <span
                                            key={opt}
                                            className={`badge rounded-pill px-3 py-2 ${form.specialties.includes(opt)
                                                ? "bg-primary text-white"
                                                : "bg-light text-muted border"
                                                }`}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => {
                                                const has = form.specialties.includes(opt);
                                                setForm({
                                                    ...form,
                                                    specialties: has
                                                        ? form.specialties.filter(
                                                            (x) => x !== opt
                                                        )
                                                        : [...form.specialties, opt],
                                                });
                                            }}
                                        >
                                            {opt}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="form-label fw-semibold">
                                    Tiểu sử
                                </label>
                                <textarea
                                    rows="4"
                                    className="form-control form-control-lg"
                                    value={form.bio}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            bio: e.target.value,
                                        })
                                    }
                                ></textarea>
                            </div>

                            <div className="mt-4">
                                <label className="form-label fw-semibold">
                                    Số năm kinh nghiệm
                                </label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg w-50"
                                    min="0"
                                    value={form.yearsExperience}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            yearsExperience: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 text-end">
                        <button
                            className="btn btn-lg btn-success px-4"
                            onClick={() => onSave?.(form)}
                        >
                            💾 Lưu Thông Tin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
