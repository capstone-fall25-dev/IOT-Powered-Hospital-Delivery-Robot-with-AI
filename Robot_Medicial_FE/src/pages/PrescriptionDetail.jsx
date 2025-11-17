// src/pages/PrescriptionDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getPrescriptionById,
    addPrescriptionItem,
    updatePrescriptionItem,
    deletePrescriptionItem,
} from "@/services/prescriptionServices";
import { getAllMedicines } from "@/services/medicineService";
import styles from "@/assets/styles/prescriptionDetail.module.css";

const statusLabel = (status) => {
    switch (status) {
        case "pending": return "Chờ duyệt";
        case "approved": return "Đã duyệt";
        case "dispensed": return "Đã cấp phát";
        case "canceled": return "Đã hủy";
        default: return status;
    }
};

const statusBadgeClass = (status) => {
    switch (status) {
        case "pending": return styles.badgePending;
        case "approved": return styles.badgeApproved;
        case "dispensed": return styles.badgeDispensed;
        case "canceled": return styles.badgeCanceled;
        default: return "";
    }
};

export default function PrescriptionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [medicines, setMedicines] = useState([]);
    const [itemForm, setItemForm] = useState({
        id: null,
        medicineId: "",
        quantity: 1,
        dosage: "",
        instructions: "",
    });
    const [itemSaving, setItemSaving] = useState(false);

    const isEditItem = !!itemForm.id;

    const loadDetail = async () => {
        const pres = await getPrescriptionById(id);
        setData(pres);
    };

    useEffect(() => {
        async function load() {
            try {
                await Promise.all([
                    loadDetail(),
                    (async () => {
                        const meds = await getAllMedicines();
                        setMedicines(meds);
                    })(),
                ]);
            } catch (err) {
                console.error(err);
                alert("Không tải được chi tiết đơn thuốc");
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const resetItemForm = () => {
        setItemForm({
            id: null,
            medicineId: "",
            quantity: 1,
            dosage: "",
            instructions: "",
        });
    };

    const handleEditItem = (item) => {
        setItemForm({
            id: item.id,
            medicineId: item.medicineId?.toString() || "",
            quantity: item.quantity,
            dosage: item.dosage || "",
            instructions: item.instructions || "",
        });
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Bạn có chắc muốn xóa thuốc này khỏi đơn?")) return;
        try {
            await deletePrescriptionItem(id, itemId);
            await loadDetail();
        } catch (err) {
            console.error(err);
            alert("Không thể xóa thuốc khỏi đơn");
        }
    };

    const handleSubmitItem = async (e) => {
        e.preventDefault();
        if (!itemForm.medicineId || !itemForm.quantity) return;

        setItemSaving(true);
        try {
            const payload = {
                medicineId: Number(itemForm.medicineId),
                quantity: Number(itemForm.quantity),
                dosage: itemForm.dosage,
                instructions: itemForm.instructions,
            };

            if (isEditItem) {
                await updatePrescriptionItem(id, itemForm.id, payload);
            } else {
                await addPrescriptionItem(id, payload);
            }

            await loadDetail();
            resetItemForm();
        } catch (err) {
            console.error(err);
            alert("Không thể lưu thuốc trong đơn");
        } finally {
            setItemSaving(false);
        }
    };

    if (loading || !data) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <div className="spinner-border text-primary"></div>
                    <p className={styles.loadingText}>Đang tải thông tin đơn thuốc...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-10">

                        {/* =================== HEADER ==================== */}
                        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
                            <div className="flex-grow-1">
                                <button 
                                    className={styles.btnBack}
                                    onClick={() => navigate(-1)}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                                
                                <h4 className={`${styles.pageTitle} mt-3 mb-2`}>
                                    Đơn thuốc {data.prescriptionCode}
                                </h4>
                                
                                <div className={styles.pageSubtitle}>
                                    Bệnh nhân: <strong>{data.patientName}</strong> (ID: {data.patientId})
                                </div>
                                
                                <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                                    <span className={statusBadgeClass(data.status)}>
                                        {statusLabel(data.status)}
                                    </span>
                                    <small className="text-muted">
                                        Tạo lúc: {new Date(data.createdAt).toLocaleString("vi-VN")}
                                    </small>
                                </div>
                            </div>
                            
                            <button
                                className={styles.btnEdit}
                                onClick={() => navigate(`/prescriptions/${id}/edit`)}
                            >
                                <i className="bi bi-pencil-square me-1"></i>
                                Chỉnh sửa đơn
                            </button>
                        </div>

                        {/* =================== MEDICINE LIST ==================== */}
                        <div className={`${styles.glass} p-3 p-md-4 mb-3`}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className={styles.sectionHeader}>Danh sách thuốc trong đơn</h5>
                            </div>
                            
                            <div className="table-responsive">
                                <table className={`table ${styles.table} align-middle mb-0`}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Thuốc</th>
                                            <th>Số lượng</th>
                                            <th>Liều dùng</th>
                                            <th>Hướng dẫn</th>
                                            <th className="text-end">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items && data.items.length > 0 ? (
                                            data.items.map((item, idx) => (
                                                <tr key={item.id}>
                                                    <td>{idx + 1}</td>
                                                    <td className="fw-semibold">
                                                        {item.medicineName || item.medicineCode || `ID ${item.medicineId}`}
                                                    </td>
                                                    <td>{item.quantity}</td>
                                                    <td>{item.dosage || "—"}</td>
                                                    <td>{item.instructions || "—"}</td>
                                                    <td>
                                                        <div className="d-flex justify-content-end gap-1">
                                                            <button
                                                                className={styles.btnEditItem}
                                                                onClick={() => handleEditItem(item)}
                                                                title="Sửa"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                            <button
                                                                className={styles.btnDelete}
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                title="Xóa"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className={styles.emptyState}>
                                                    <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                                    Chưa có thuốc nào trong đơn
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* =================== ADD/EDIT ITEM FORM ==================== */}
                        <div className={`${styles.glass} p-3 p-md-4`}>
                            <h5 className={styles.sectionHeader}>
                                {isEditItem ? "Chỉnh sửa thuốc trong đơn" : "Thêm thuốc vào đơn"}
                            </h5>
                            
                            <form onSubmit={handleSubmitItem}>
                                <div className="row g-4">
                                    {/* Thuốc */}
                                    <div className="col-md-4">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Thuốc <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select ${styles.formSelect}`}
                                            value={itemForm.medicineId}
                                            onChange={(e) =>
                                                setItemForm((f) => ({ ...f, medicineId: e.target.value }))
                                            }
                                            required
                                        >
                                            <option value="">— Chọn thuốc —</option>
                                            {medicines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({m.medicineCode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Số lượng */}
                                    <div className="col-md-2">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Số lượng <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            className={`form-control ${styles.formControl}`}
                                            value={itemForm.quantity}
                                            onChange={(e) =>
                                                setItemForm((f) => ({ ...f, quantity: e.target.value }))
                                            }
                                            required
                                        />
                                    </div>

                                    {/* Liều dùng */}
                                    <div className="col-md-3">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Liều dùng
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${styles.formControl}`}
                                            value={itemForm.dosage}
                                            onChange={(e) =>
                                                setItemForm((f) => ({ ...f, dosage: e.target.value }))
                                            }
                                            placeholder="VD: 1 viên x 2 lần/ngày"
                                        />
                                    </div>

                                    {/* Hướng dẫn */}
                                    <div className="col-md-3">
                                        <label className={`form-label ${styles.formLabel}`}>
                                            Hướng dẫn
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${styles.formControl}`}
                                            value={itemForm.instructions}
                                            onChange={(e) =>
                                                setItemForm((f) => ({ ...f, instructions: e.target.value }))
                                            }
                                            placeholder="VD: Uống sau ăn"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className={styles.btnTeal}
                                        disabled={itemSaving}
                                    >
                                        {itemSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle me-1"></i>
                                                {isEditItem ? "Lưu thay đổi" : "Thêm thuốc"}
                                            </>
                                        )}
                                    </button>
                                    
                                    {isEditItem && (
                                        <button
                                            type="button"
                                            className={styles.btnCancel}
                                            onClick={resetItemForm}
                                        >
                                            <i className="bi bi-x-circle me-1"></i>
                                            Hủy chỉnh sửa
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}