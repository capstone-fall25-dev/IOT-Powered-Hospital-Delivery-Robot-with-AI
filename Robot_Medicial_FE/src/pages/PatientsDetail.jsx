import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService } from "@/services/patientService";

export default function PatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);

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

        patientService
            .getPatientById(id)
            .then(setPatient)
            .catch(() => alert("Không thể tải thông tin bệnh nhân"));

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
        };
    }, [id]);

    if (!patient)
        return (
            <div className="text-center mt-5">
                <div className="spinner-border text-success" role="status"></div>
                <p>Đang tải thông tin bệnh nhân...</p>
            </div>
        );

    return (
        <div className="page d-flex flex-column align-items-center py-5">
            <style>{`
        :root { --teal:#4CE1C6; --ink:#0f172a; }
        .page {
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color: #0b1324;
          background: radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),
                      radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),
                      linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);
          min-height: 100vh;
        }
        .glass {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.85);
          box-shadow: 0 18px 56px rgba(15,23,42,.08);
          border-radius: 24px;
        }
        .btn-teal { background: var(--teal); border: none; color: #052a2b; font-weight: 700; }
        .btn-teal:hover { filter: brightness(1.05); }
      `}</style>

            <div className="container glass p-5" style={{ maxWidth: 800 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold">
                        <i className="bi bi-person-vcard me-2 text-success"></i>
                        Thông tin bệnh nhân
                    </h3>
                    <button className="btn btn-teal" onClick={() => navigate("/patient")}>
                        <i className="bi bi-arrow-left-circle me-1"></i> Quay lại
                    </button>
                </div>

                <div className="row g-4">
                    <div className="col-md-6">
                        <p><strong>Mã bệnh nhân:</strong> {patient.patientCode}</p>
                        <p><strong>Họ tên:</strong> {patient.fullName}</p>
                        <p><strong>Giới tính:</strong> {patient.gender === "male" ? "Nam" : "Nữ"}</p>
                        <p><strong>Ngày sinh:</strong> {new Date(patient.dob).toLocaleDateString("vi-VN")}</p>
                        <p><strong>Trạng thái:</strong>
                            <span className="badge bg-success ms-2">{patient.status}</span>
                        </p>
                    </div>

                    <div className="col-md-6">
                        <p><strong>Địa chỉ:</strong> {patient.address}</p>
                        <p><strong>Điện thoại:</strong> {patient.phone}</p>
                        <p><strong>Khoa:</strong> {patient.department}</p>
                        <p><strong>Phòng:</strong> {patient.roomName || patient.roomNumber}</p>
                        <p><strong>Ngày tạo:</strong> {new Date(patient.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                </div>

                <hr className="my-4" />
                <div className="text-center text-muted">
                    <small>Cập nhật gần nhất: {new Date().toLocaleString("vi-VN")}</small>
                </div>
            </div>
        </div>
    );
}
