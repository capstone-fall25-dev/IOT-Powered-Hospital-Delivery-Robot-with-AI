import { useEffect, useState } from "react";
import { getMedicine, deleteMedicine } from "@/services/medicineService";
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

    const handleDelete = async () => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${data.name}"?`)) return;
        
        try {
            await deleteMedicine(id);
            alert("Xóa thuốc thành công!");
            navigate("/medicines");
        } catch (err) {
            console.error("Lỗi khi xóa thuốc:", err);
            alert("Không thể xóa thuốc");
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className={styles.loadingContainer}>
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className={styles.loadingText}>Đang tải thông tin thuốc...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className={`${styles.glass} p-5`}>
                                <div className={styles.errorContainer}>
                                    <i className={`bi bi-exclamation-triangle ${styles.errorIcon}`}></i>
                                    <h5 className={styles.errorTitle}>{error || "Không tìm thấy thuốc"}</h5>
                                    <button 
                                        className={styles.btnBack}
                                        onClick={() => navigate("/medicines")}
                                    >
                                        <i className="bi bi-arrow-left me-1"></i>
                                        Quay lại danh sách
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isAvailable = data.status === 0;

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-capsule"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Chi tiết thuốc</h4>
                            </div>

                            <div className="d-flex gap-2 flex-wrap">
                                <button 
                                    className={styles.btnBack}
                                    onClick={() => navigate("/medicines")}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                                <button 
                                    className={styles.btnTeal}
                                    onClick={() => navigate(`/medicines/edit/${id}`)}
                                >
                                    <i className="bi bi-pencil me-1"></i>
                                    Chỉnh sửa
                                </button>
                            </div>
                        </div>

                        {/* =================== MAIN CONTENT ==================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>

                            {/* Medicine Header */}
                            <div className={styles.medicineHeader}>
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                                    <div>
                                        <h5 className={styles.medicineName}>{data.name}</h5>
                                        <p className={`${styles.medicineCode} mb-0`}>
                                            <i className="bi bi-upc-scan me-2"></i>
                                            Mã thuốc: <span className={styles.medicineCodeValue}>{data.medicineCode}</span>
                                        </p>
                                    </div>
                                    <span className={`${isAvailable ? styles.badgeAvailable : styles.badgeExpired} ${styles.badgeLarge}`}>
                                        <i className={`bi ${isAvailable ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
                                        {isAvailable ? "Sẵn sàng" : "Hết hạn"}
                                    </span>
                                </div>
                            </div>

                            {/* Information Grid */}
                            <div className="row g-4">

                                {/* Danh mục */}
                                <div className="col-md-6">
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}>
                                            <i className="bi bi-grid"></i>
                                        </div>
                                        <div>
                                            <label className={styles.infoLabel}>Danh mục</label>
                                            <p className={`${styles.infoValue} mb-0`}>
                                                {data.categoryName || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Đơn vị */}
                                <div className="col-md-6">
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}>
                                            <i className="bi bi-box"></i>
                                        </div>
                                        <div>
                                            <label className={styles.infoLabel}>Đơn vị tính</label>
                                            <p className={`${styles.infoValue} mb-0`}>
                                                {data.unit || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Số lượng tồn */}
                                <div className="col-md-6">
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}>
                                            <i className="bi bi-boxes"></i>
                                        </div>
                                        <div>
                                            <label className={styles.infoLabel}>Số lượng tồn kho</label>
                                            <p className="mb-0">
                                                <span className={styles.stockValue}>{data.stockQuantity}</span>
                                                {" "}
                                                <span className={styles.stockUnit}>{data.unit}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hạn sử dụng */}
                                <div className="col-md-6">
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}>
                                            <i className="bi bi-calendar-event"></i>
                                        </div>
                                        <div>
                                            <label className={styles.infoLabel}>Hạn sử dụng</label>
                                            <p className={`${styles.infoValue} mb-0`}>
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
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}>
                                            <i className="bi bi-file-text"></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <label className={styles.infoLabel}>Mô tả chi tiết</label>
                                            <p className={`mb-0 ${data.description ? styles.description : styles.descriptionEmpty}`}>
                                                {data.description || "Không có mô tả"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Additional Info Section */}
                            <div className={styles.additionalInfo}>
                                <div className="row g-4">
                                    <div className="col-md-4">
                                        <div className={styles.metaItem}>
                                            <small className={styles.metaLabel}>
                                                <i className="bi bi-calendar-plus me-1"></i>
                                                Ngày tạo
                                            </small>
                                            <span className={styles.metaValue}>
                                                {data.createdAt 
                                                    ? new Date(data.createdAt).toLocaleDateString("vi-VN")
                                                    : "-"
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <div className={styles.metaItem}>
                                            <small className={styles.metaLabel}>
                                                <i className="bi bi-clock-history me-1"></i>
                                                Cập nhật lần cuối
                                            </small>
                                            <span className={styles.metaValue}>
                                                {data.updatedAt 
                                                    ? new Date(data.updatedAt).toLocaleDateString("vi-VN")
                                                    : "-"
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <div className={styles.metaItem}>
                                            <small className={styles.metaLabel}>
                                                <i className="bi bi-hash me-1"></i>
                                                ID Thuốc
                                            </small>
                                            <span className={styles.metaValue}>#{data.id}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.actionSection}>
                                <button 
                                    className={`${styles.btnDelete} ${styles.btnLarge}`}
                                    onClick={handleDelete}
                                >
                                    <i className="bi bi-trash me-1"></i>
                                    Xóa thuốc
                                </button>
                                <button 
                                    className={styles.btnTeal}
                                    onClick={() => navigate(`/medicines/edit/${id}`)}
                                >
                                    <i className="bi bi-pencil me-1"></i>
                                    Chỉnh sửa
                                </button>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}