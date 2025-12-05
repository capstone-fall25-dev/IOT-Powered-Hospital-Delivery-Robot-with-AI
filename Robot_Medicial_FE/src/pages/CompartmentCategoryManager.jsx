// src/pages/CompartmentCategoryManagerPage.jsx
import { useEffect, useState } from "react";
import {
  getAllCategoryCompartment,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/categotiresCompartmentService";
import { useNavigate } from "react-router-dom";
import styles from "@/assets/styles/CompartmentCategoryManager.module.css";

export default function CompartmentCategoryManagerPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", description: "" });
  const [mode, setMode] = useState("create");
  const [showModal, setShowModal] = useState(false);

  const [toast, setToast] = useState({ show: false, type: "", message: "", onConfirm: null });

  useEffect(() => {
    loadCategories();
  }, []);

  const showToast = (type, message, onConfirm = null) => {
    setToast({ show: true, type, message, onConfirm });
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getAllCategoryCompartment();
      setRows(data || []);
    } catch (err) {
      showToast("error", err.message || "Không thể tải danh sách danh mục!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setFormLoading(true);
    const payload = { name: form.name.trim(), description: form.description.trim() };

    try {
      if (mode === "create") {
        await createCategory(payload);
        showToast("success", "Tạo danh mục thành công!");
      } else {
        await updateCategory(form.id, payload);
        showToast("success", "Cập nhật danh mục thành công!");
      }
      setForm({ id: null, name: "", description: "" });
      setMode("create");
      setShowModal(false);
      loadCategories();
    } catch (err) {
      showToast("error", err.message || "Có lỗi xảy ra!");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (row) => {
    setForm({ id: row.id, name: row.name, description: row.description || "" });
    setMode("edit");
    setShowModal(true);
  };

  const handleDelete = (id) => {
    showToast("confirm", "Bạn có chắc chắn muốn xóa danh mục này không?", async () => {
      try {
        await deleteCategory(id);
        showToast("success", "Xóa danh mục thành công!");
        loadCategories();
      } catch (err) {
        showToast("error", err.message || "Không thể xóa danh mục này!");
      }
    });
  };

  const openCreateModal = () => {
    setForm({ id: null, name: "", description: "" });
    setMode("create");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ id: null, name: "", description: "" });
    setMode("create");
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Toast Modal */}
        {toast.show && (
          <div className={styles.toastOverlay} onClick={() => setToast({ show: false })}>
            <div className={styles.toast} onClick={e => e.stopPropagation()}>
              <div className={`${styles.toastHeader} ${styles[toast.type]}`}>
                {toast.type === "success" && "✓ Thành công"}
                {toast.type === "error" && "✕ Lỗi"}
                {toast.type === "confirm" && "⚠ Xác nhận xóa"}
              </div>
              <div className={styles.toastMessage}>{toast.message}</div>
              {toast.type === "confirm" ? (
                <div className={styles.toastButtons}>
                  <button className={styles.toastBtnConfirm} onClick={() => { toast.onConfirm?.(); setToast({ show: false }); }}>
                    Xóa ngay
                  </button>
                  <button className={styles.toastBtnCancel} onClick={() => setToast({ show: false })}>
                    Hủy
                  </button>
                </div>
              ) : (
                <div className={styles.toastButtons}>
                  <button className={styles.toastBtnCancel} onClick={() => setToast({ show: false })}>
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {mode === "create" ? "➕ Tạo danh mục mới" : "✏️ Chỉnh sửa danh mục"}
                </h2>
                <button className={styles.modalClose} onClick={closeModal}>✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Tên danh mục <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={styles.input}
                    placeholder="Nhập tên danh mục..."
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={styles.textarea}
                    placeholder="Mô tả chi tiết (không bắt buộc)"
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" onClick={closeModal} className={styles.btnCancel} disabled={formLoading}>
                    Hủy
                  </button>
                  <button type="submit" disabled={formLoading} className={styles.btnPrimary}>
                    {formLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang xử lý...
                      </>
                    ) : mode === "create" ? "✓ Tạo danh mục" : "✓ Cập nhật"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            📁 Quản lý danh mục ngăn chứa
          </h1>
          <div className={styles.headerActions}>
            <button onClick={openCreateModal} className={styles.btnCreate}>
              ➕ Tạo mới
            </button>
            <button onClick={() => navigate("/dashboard")} className={styles.btnBack}>
              Quay lại
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              📋 Danh sách danh mục ({rows.length})
            </h2>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4}>
                        <div className="h-16 flex items-center gap-6 px-6">
                          <div className={`${styles.skeleton} h-4 w-12 rounded`}></div>
                          <div className={`${styles.skeleton} h-4 w-56 rounded`}></div>
                          <div className={`${styles.skeleton} h-4 w-80 rounded flex-1`}></div>
                          <div className={`${styles.skeleton} h-4 w-32 rounded`}></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyRow}>
                      📭 Chưa có danh mục nào. Nhấn "Tạo mới" để bắt đầu!
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>#{row.id}</td>
                      <td className="font-semibold">🏷️ {row.name}</td>
                      <td>{row.description || <span className="text-gray-400 italic">—</span>}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button onClick={() => handleEdit(row)} className={styles.btnEdit}>
                            ✏️ Sửa
                          </button>
                          <button onClick={() => handleDelete(row.id)} className={styles.btnDelete}>
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

