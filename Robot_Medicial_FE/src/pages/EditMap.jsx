import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMapById } from "@/services/mapService";
import { apiFetch } from "@/services/api";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";
import styles from "../assets/styles/roomForm.module.css";

export default function EditMap() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await getMapById(id);
                setForm(data);
            } catch (err) {
                console.error("Lỗi tải bản đồ:", err);
                showToast("error", err.message || "Không thể tải thông tin bản đồ");
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;

        try {
            setSubmitting(true);
            
            // Chỉ gửi nameMapFE, các trường khác giữ nguyên từ backend
            // Backend yêu cầu MapName nhưng không cho phép thay đổi, nên gửi giá trị hiện tại
            const updateData = {
                mapName: form.mapName, // Bắt buộc nhưng không thay đổi (backend sẽ validate)
                nameMapFE: form.nameMapFE || "", // Chỉ trường này được edit
                // Các trường khác giữ nguyên từ form hiện tại để không bị mất
                imageName: form.imageName || "",
                width: form.width || null,
                height: form.height || null,
                resolution: form.resolution || null,
                originX: form.originX || null,
                originY: form.originY || null,
                originZ: form.originZ || null,
                mode: form.mode || null,
                negate: form.negate || null,
                occupiedThresh: form.occupiedThresh || null,
                freeThresh: form.freeThresh || null
            };
            
            // Gọi API với JSON vì API nhận [FromBody] MapDto
            // apiFetch tự động thêm API_BASE, nên chỉ cần path tương đối
            await apiFetch(`/Maps/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            showToast("success", "Cập nhật tên bản đồ thành công!");
            setTimeout(() => {
                navigate(`/maps/${id}`);
            }, 1500);
        } catch (err) {
            console.error("Lỗi cập nhật bản đồ:", err);
            showToast("error", err.message || "Không thể cập nhật bản đồ");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <Toast toast={toast} showToast={showToast} />
                <div className="container-xl py-4">
                    <div className="text-center" style={{ padding: '4rem 2rem', color: 'var(--teal-dark)' }}>
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                        </div>
                        <p>Đang tải thông tin bản đồ...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className={styles.page}>
                <Toast toast={toast} showToast={showToast} />
                <div className="container-xl py-4">
                    <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Không tìm thấy bản đồ
                    </div>
                    <button 
                        className="btn btn-outline-secondary mt-3"
                        onClick={() => navigate("/viewlistmap")}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Toast toast={toast} showToast={showToast} />
            <div className="container-xl py-4">

                {/* =================== HEADER ==================== */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                    <h3 className={styles.pageTitle}>
                        <i className="bi bi-pencil-square me-2"></i>
                        Chỉnh sửa bản đồ
                    </h3>

                    <button 
                        className={styles.btnBack}
                        onClick={() => navigate(`/maps/${id}`)}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại
                    </button>
                </div>

                {/* =================== FORM CARD ==================== */}
                <div className={styles.createCard}>
                    <form onSubmit={handleSubmit}>

                        {/* Thông tin cơ bản */}
                        <div className={styles.sectionTitle}>
                            <i className="bi bi-info-circle me-2"></i>
                            Thông tin bản đồ
                        </div>

                        {/* Tên bản đồ (ROS) - Readonly */}
                        <div className="mb-4">
                            <label className={`form-label ${styles.formLabel}`}>
                                <i className="bi bi-file-code me-1"></i>
                                Tên bản đồ (ROS)
                            </label>
                            <input
                                type="text"
                                className={`form-control ${styles.formInput}`}
                                value={form.mapName || ""}
                                readOnly
                                disabled
                                style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                            />
                            <div className={styles.helperText}>
                                <i className="bi bi-lock me-1"></i>
                                Tên bản đồ ROS không thể thay đổi
                            </div>
                        </div>

                        {/* Tên bản đồ (Frontend) - Editable */}
                        <div className="mb-4">
                            <label className={`form-label ${styles.formLabel}`}>
                                <i className="bi bi-tag me-1"></i>
                                Tên hiển thị (Frontend)
                                <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                className={`form-control ${styles.formInput}`}
                                value={form.nameMapFE || ""}
                                onChange={e => setForm({ ...form, nameMapFE: e.target.value })}
                                required
                                maxLength={255}
                                placeholder="Nhập tên hiển thị cho bản đồ"
                            />
                            <div className={styles.helperText}>
                                <i className="bi bi-lightbulb me-1"></i>
                                Tên này sẽ hiển thị trên giao diện người dùng
                            </div>
                        </div>

                        {/* Thông tin kỹ thuật - Readonly */}
                        <div className={styles.sectionTitle}>
                            <i className="bi bi-gear me-2"></i>
                            Thông tin kỹ thuật (Chỉ đọc)
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-arrows-angle-expand me-1"></i>
                                    Kích thước (Width x Height)
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.width && form.height ? `${form.width} x ${form.height}` : "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-rulers me-1"></i>
                                    Độ phân giải (Resolution)
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.resolution || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-geo-alt me-1"></i>
                                    Origin X
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.originX || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-geo-alt me-1"></i>
                                    Origin Y
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.originY || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="col-md-4 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-geo-alt me-1"></i>
                                    Origin Z
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.originZ || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-sliders me-1"></i>
                                    Occupied Threshold
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.occupiedThresh || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className={`form-label ${styles.formLabel}`}>
                                    <i className="bi bi-sliders me-1"></i>
                                    Free Threshold
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${styles.formInput}`}
                                    value={form.freeThresh || "-"}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className={`form-label ${styles.formLabel}`}>
                                <i className="bi bi-calendar me-1"></i>
                                Ngày tạo
                            </label>
                            <input
                                type="text"
                                className={`form-control ${styles.formInput}`}
                                value={form.createdAt ? new Date(form.createdAt).toLocaleString("vi-VN") : "-"}
                                readOnly
                                disabled
                                style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <button 
                                type="button"
                                className={styles.btnBack}
                                onClick={() => navigate(`/maps/${id}`)}
                                disabled={submitting}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Hủy
                            </button>
                            
                            <button 
                                type="submit"
                                className={styles.btnCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-1"></i>
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>

            </div>
        </div>
    );
}

