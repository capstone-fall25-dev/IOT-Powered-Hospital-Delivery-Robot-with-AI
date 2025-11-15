import { useEffect, useState } from "react";
import { getMedicine } from "@/services/medicineService";
import { useParams, useNavigate } from "react-router-dom";
import styles from '@/assets/styles/medicinesManagement.module.css';

export default function MedicineDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        getMedicine(id)
            .then((medicine) => {
                setData(medicine);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Lỗi khi lấy chi tiết thuốc:", err);
                setError("Không thể tải thông tin thuốc");
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-fluid py-4">
                    <div className="container-lg">
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                            <p className="mt-3 text-muted">Đang tải thông tin thuốc...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.page}>
                <div className="container-fluid py-4">
                    <div className="container-lg">
                        <div className={`glass ${styles.glass} ${styles.rounded2xl} p-5 text-center`}>
                            <i className="bi bi-exclamation-triangle fs-1 text-warning d-block mb-3"></i>
                            <h5>{error || "Không tìm thấy thuốc"}</h5>
                            <button 
                                className="btn btn-outline-secondary rounded-pill mt-3"
                                onClick={() => navigate("/medicines")}
                            >
                                <i className="bi bi-arrow-left me-1"></i> Quay lại danh sách
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const statusInfo = data.status === 0 
        ? { text: "Sẵn sàng", class: "bg-success-subtle text-success" }
        : { text: "Hết hạn", class: "bg-danger-subtle text-danger" };

    return (
        <div className={styles.page}>
            <div className="container-fluid py-4">
                <div className="container-lg">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.chip}>
                                <i className="bi bi-capsule me-1"></i>
                            </span>
                            <h4 className="mb-0 fw-bold">Chi tiết thuốc</h4>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                            <button 
                                className="btn btn-outline-secondary rounded-pill" 
                                onClick={() => navigate("/medicines")}
                            >
                                <i className="bi bi-arrow-left me-1"></i> Quay lại
                            </button>
                            <button 
                                className={`btn ${styles.btnTeal} rounded-pill`}
                                onClick={() => navigate(`/medicines/edit/${id}`)}
                            >
                                <i className="bi bi-pencil me-1"></i> Chỉnh sửa
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={`glass ${styles.glass} ${styles.rounded2xl} p-4 p-md-5`}>
                        {/* Medicine Code & Status Badge */}
                        <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom">
                            <div>
                                <h5 className="mb-1 fw-bold text-primary">{data.name}</h5>
                                <p className="text-muted mb-0">
                                    <i className="bi bi-upc-scan me-1"></i>
                                    Mã thuốc: <span className="fw-semibold">{data.medicineCode}</span>
                                </p>
                            </div>
                            <span className={`badge ${statusInfo.class} fs-6 px-3 py-2`}>
                                {statusInfo.text}
                            </span>
                        </div>

                        {/* Information Grid */}
                        <div className="row g-4">
                            {/* Danh mục */}
                            <div className="col-md-6">
                                <div className="d-flex align-items-start gap-3">
                                    <div className={`${styles.chip} fs-5`}>
                                        <i className="bi bi-grid"></i>
                                    </div>
                                    <div>
                                        <label className="text-muted small mb-1">Danh mục</label>
                                        <p className="mb-0 fw-semibold">{data.categoryName || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Đơn vị */}
                            <div className="col-md-6">
                                <div className="d-flex align-items-start gap-3">
                                    <div className={`${styles.chip} fs-5`}>
                                        <i className="bi bi-box"></i>
                                    </div>
                                    <div>
                                        <label className="text-muted small mb-1">Đơn vị</label>
                                        <p className="mb-0 fw-semibold">{data.unit || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Số lượng tồn */}
                            <div className="col-md-6">
                                <div className="d-flex align-items-start gap-3">
                                    <div className={`${styles.chip} fs-5`}>
                                        <i className="bi bi-boxes"></i>
                                    </div>
                                    <div>
                                        <label className="text-muted small mb-1">Số lượng tồn kho</label>
                                        <p className="mb-0 fw-semibold fs-5 text-primary">
                                            {data.stockQuantity} <span className="fs-6 text-muted">{data.unit}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Hạn sử dụng */}
                            <div className="col-md-6">
                                <div className="d-flex align-items-start gap-3">
                                    <div className={`${styles.chip} fs-5`}>
                                        <i className="bi bi-calendar-event"></i>
                                    </div>
                                    <div>
                                        <label className="text-muted small mb-1">Hạn sử dụng</label>
                                        <p className="mb-0 fw-semibold">
                                            {data.expiryDate 
                                                ? new Date(data.expiryDate).toLocaleDateString("vi-VN")
                                                : "Không có thông tin"
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mô tả */}
                            <div className="col-12">
                                <div className="d-flex align-items-start gap-3">
                                    <div className={`${styles.chip} fs-5`}>
                                        <i className="bi bi-file-text"></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <label className="text-muted small mb-1">Mô tả</label>
                                        <p className="mb-0">
                                            {data.description || <span className="text-muted fst-italic">Không có mô tả</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info Section */}
                        <div className="mt-4 pt-4 border-top">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <small className="text-muted d-block">Ngày tạo</small>
                                    <span className="fw-semibold">
                                        {data.createdAt 
                                            ? new Date(data.createdAt).toLocaleDateString("vi-VN")
                                            : "-"
                                        }
                                    </span>
                                </div>
                                <div className="col-md-4">
                                    <small className="text-muted d-block">Cập nhật lần cuối</small>
                                    <span className="fw-semibold">
                                        {data.updatedAt 
                                            ? new Date(data.updatedAt).toLocaleDateString("vi-VN")
                                            : "-"
                                        }
                                    </span>
                                </div>
                                <div className="col-md-4">
                                    <small className="text-muted d-block">ID Thuốc</small>
                                    <span className="fw-semibold">#{data.id}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2 justify-content-end mt-4 pt-3 border-top">
                            <button 
                                className="btn btn-outline-danger rounded-pill px-4"
                                onClick={() => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${data.name}"?`)) {
                                        // Thêm logic xóa ở đây
                                        alert("Chức năng xóa sẽ được triển khai");
                                    }
                                }}
                            >
                                <i className="bi bi-trash me-1"></i> Xóa thuốc
                            </button>
                            <button 
                                className={`btn ${styles.btnTeal} rounded-pill px-4`}
                                onClick={() => navigate(`/medicines/edit/${id}`)}
                            >
                                <i className="bi bi-pencil me-1"></i> Chỉnh sửa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}