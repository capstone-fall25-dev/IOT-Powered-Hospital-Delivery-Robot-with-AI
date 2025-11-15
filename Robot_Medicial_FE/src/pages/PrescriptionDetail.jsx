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

const styles = (
    <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(900px 500px at 20% 10%, rgba(76,225,198,.16), transparent 60%),radial-gradient(800px 400px at 85% 8%, rgba(76,225,198,.12), transparent 60%),linear-gradient(180deg, #f6faf9 0%, #eef6f5 20%, #e9f3f1 60%, #e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 56px rgba(15,23,42,.08);border-radius:5px}
      .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
      .btn-teal:hover{filter:brightness(1.05)}
    `}</style>
);

const statusLabel = (status) => {
    switch (status) {
        case "pending": return "Chờ duyệt";
        case "approved": return "Đã duyệt";
        case "dispensed": return "Đã cấp phát";
        case "canceled": return "Đã hủy";
        default: return status;
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
        return <div className="page">{styles}<div className="container-lg py-4">Đang tải...</div></div>;
    }

    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                        <button className="btn btn-link px-0" onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </button>
                        <h4 className="fw-bold mt-2 mb-1">
                            Đơn thuốc {data.prescriptionCode}
                        </h4>
                        <div className="text-muted">
                            Bệnh nhân: <strong>{data.patientName}</strong> (ID: {data.patientId})
                        </div>
                        <div className="mt-1">
                            <span className="badge bg-info-subtle text-info me-2">
                                Trạng thái: {statusLabel(data.status)}
                            </span>
                            <small className="text-muted">
                                Tạo lúc: {new Date(data.createdAt).toLocaleString("vi-VN")}
                            </small>
                        </div>
                    </div>
                    <div>
                        <button
                            className="btn btn-outline-primary me-2"
                            onClick={() => navigate(`/prescriptions/${id}/edit`)}
                        >
                            <i className="bi bi-pencil-square"></i> Chỉnh sửa đơn
                        </button>
                    </div>
                </div>

                {/* Danh sách thuốc */}
                <div className="glass p-3 p-md-4 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-semibold mb-0">Danh sách thuốc trong đơn</h5>
                    </div>
                    <div className="table-responsive">
                        <table className="table align-middle">
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
                                            <td>{item.medicineName || item.medicineCode || `ID ${item.medicineId}`}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.dosage}</td>
                                            <td>{item.instructions}</td>
                                            <td className="text-end">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => handleEditItem(item)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted">
                                            Chưa có thuốc nào trong đơn
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Form thêm / sửa thuốc */}
                <div className="glass p-3 p-md-4">
                    <h5 className="fw-semibold mb-3">
                        {isEditItem ? "Chỉnh sửa thuốc trong đơn" : "Thêm thuốc vào đơn"}
                    </h5>
                    <form className="row g-3" onSubmit={handleSubmitItem}>
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Thuốc</label>
                            <select
                                className="form-select"
                                value={itemForm.medicineId}
                                onChange={(e) =>
                                    setItemForm((f) => ({ ...f, medicineId: e.target.value }))
                                }
                            >
                                <option value="">— Chọn thuốc —</option>
                                {medicines.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.medicineCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label fw-semibold">Số lượng</label>
                            <input
                                type="number"
                                min={1}
                                className="form-control"
                                value={itemForm.quantity}
                                onChange={(e) =>
                                    setItemForm((f) => ({ ...f, quantity: e.target.value }))
                                }
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Liều dùng</label>
                            <input
                                className="form-control"
                                value={itemForm.dosage}
                                onChange={(e) =>
                                    setItemForm((f) => ({ ...f, dosage: e.target.value }))
                                }
                                placeholder="VD: 1 viên x 2 lần/ngày"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Hướng dẫn</label>
                            <input
                                className="form-control"
                                value={itemForm.instructions}
                                onChange={(e) =>
                                    setItemForm((f) => ({ ...f, instructions: e.target.value }))
                                }
                                placeholder="VD: Uống sau ăn"
                            />
                        </div>

                        <div className="col-12 d-flex gap-2 mt-2">
                            <button
                                type="submit"
                                className="btn btn-teal px-4"
                                disabled={itemSaving}
                            >
                                {itemSaving
                                    ? "Đang lưu..."
                                    : isEditItem
                                        ? "Lưu thay đổi"
                                        : "Thêm thuốc"}
                            </button>
                            {isEditItem && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={resetItemForm}
                                >
                                    Hủy chỉnh sửa
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}