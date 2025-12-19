// src/pages/RobotEdit.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRobotById, updateRobot } from "@/services/robotService";
import { getAllMaps } from "@/services/mapService";
import { getAllCategoryCompartment } from "@/services/categotiresCompartmentService";
import styles from "@/assets/styles/createRobot.module.css"; // DÙNG CHUNG STYLE VỚI CREATE
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function RobotEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    code: "", // chỉ để hiển thị, không cho sửa
    mapId: "",
    compartments: [],
  });

  const [maps, setMaps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // === LOAD DỮ LIỆU ROBOT + MAP + CATEGORY ===
  useEffect(() => {
    async function loadData() {
      try {
        const [robotRes, mapsRes, catsRes] = await Promise.all([
          getRobotById(id),
          getAllMaps(),
          getAllCategoryCompartment(),
        ]);

        setForm({
          name: robotRes.name || "",
          code: robotRes.code || "",
          mapId: robotRes.mapId || "",
          compartments: (robotRes.compartments || []).map((c) => ({
            id: c.id, // Lưu ID để giữ nguyên khi update
            categoryId: c.categoryId != null ? c.categoryId.toString() : "",
            isLocked: false, // backend không trả về isLocked → mặc định false
          })),
        });

        setMaps(mapsRes || []);
        setCategories(catsRes || []);
      } catch (err) {
        console.error("Lỗi khi load robot data:", err);
        showToast("error", err.message || "Không thể tải dữ liệu robot!");
      } finally {
        // Luôn set loading = false để không bị stuck
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompartmentChange = (index, e) => {
    const { value } = e.target;
    setForm((prev) => {
      const comps = [...prev.compartments];
      comps[index].categoryId = value;
      return { ...prev, compartments: comps };
    });
  };

  const addCompartment = () => {
    setForm((prev) => ({
      ...prev,
      compartments: [...prev.compartments, { id: null, categoryId: "" }],
    }));
  };

  const removeCompartment = (index) => {
    if (form.compartments.length === 1) {
      showToast("warning", "Phải có ít nhất 1 ngăn!");
      return;
    }
    setForm((prev) => {
      const comps = [...prev.compartments];
      comps.splice(index, 1);
      return { ...prev, compartments: comps };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())
      return showToast("error", "Tên robot không được để trống!");
    if (form.compartments.some((c) => !c.categoryId))
      return showToast("error", "Vui lòng chọn loại ngăn cho tất cả ô!");
    if (form.name.trim().length > 255)
      return showToast("error", "Tên robot không được vượt quá 255 kí tự!");
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      mapId: form.mapId ? Number(form.mapId) : null,
      compartments: form.compartments.map((c) => ({
        id: c.id || null, // Gửi ID nếu có (null nếu là compartment mới)
        categoryId: Number(c.categoryId),
        isLocked: c.isLocked || false,
      })),
    };

    try {
      await updateRobot(id, payload);
      showToast("success", "Cập nhật robot thành công!");
      setTimeout(() => navigate(`/robot-detail/${id}`), 800);
    } catch (err) {
      console.error("Update robot error:", err);
      showToast("error", err.message || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container-xl py-4 text-center">
          <div
            className="spinner-border text-teal"
            style={{ width: "3rem", height: "3rem" }}
          ></div>
          <p className="mt-3">Đang tải thông tin robot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container-xl py-4">
        {/* HEADER */}
        <div className={styles.headerSection}>
          <h4 className={styles.pageTitle}>
            <i
              className="bi bi-robot me-2"
              style={{ color: "var(--teal-dark)" }}
            ></i>
            Chỉnh sửa Robot • {form.code}
          </h4>
          <button className={styles.btnSecondary} onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>
            Quay lại
          </button>
        </div>

        {/* FORM */}
        <div className={`${styles.glass} p-4 p-md-5`}>
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* Tên Robot */}
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  <i className="bi bi-tag me-1"></i>
                  Tên Robot <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={styles.formControl}
                  placeholder="VD: Robot Giao Hàng A1"
                  required
                />
              </div>

              {/* Mã Robot - chỉ hiển thị */}
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  <i className="bi bi-upc-scan me-1"></i>
                  Mã Robot
                </label>
                <input
                  type="text"
                  value={form.code}
                  className={styles.formControl}
                  readOnly
                  style={{ background: "#f1f5f9" }}
                />
                <small className={styles.helpText}>
                  Mã robot không thể thay đổi
                </small>
              </div>

              {/* Chọn Map */}
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  <i className="bi bi-map me-1"></i>
                  Bản đồ
                </label>
                <select
                  name="mapId"
                  value={form.mapId}
                  onChange={handleChange}
                  className={styles.formSelect}
                >
                  <option value="">— Không gán bản đồ —</option>
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} • {m.mapName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Danh sách ngăn */}
              <div className="col-12">
                <label className={styles.sectionLabel}>
                  <i className="bi bi-box-seam"></i>
                  Danh sách ngăn chứa <span className="text-danger">*</span>
                </label>

                {form.compartments.map((c, i) => (
                  <div key={i} className={styles.compartmentCard}>
                    <div className={styles.compartmentHeader}>
                      <div className={styles.compartmentNumber}>{i + 1}</div>
                      <div className={styles.compartmentTitle}>
                        Ngăn chứa #{i + 1}
                      </div>
                    </div>

                    <div className="row align-items-center g-2">
                      <div className="col-md-10">
                        <select
                          value={c.categoryId || ""} // đảm bảo luôn có value
                          onChange={(e) => handleCompartmentChange(i, e)}
                          className={styles.formSelect}
                          required
                        >
                          <option value="" disabled>
                            — Chọn loại ngăn —
                          </option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* <div className="col-md-2 text-end">
                                                <button
                                                    type="button"
                                                    className={styles.btnRemove}
                                                    onClick={() => removeCompartment(i)}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div> */}
                    </div>

                    <div className={styles.compartmentCode}>
                      <i className="bi bi-qr-code me-1"></i>
                      Mã ngăn:{" "}
                      <strong>
                        C{i + 1 < 10 ? "00" : "0"}
                        {i + 1}
                      </strong>
                    </div>
                  </div>
                ))}

                {/* <button
                                    type="button"
                                    className={styles.btnAddCompartment}
                                    onClick={addCompartment}
                                >
                                    <i className="bi bi-plus-circle me-1"></i>
                                    Thêm ngăn chứa
                                </button> */}
              </div>

              {/* Submit */}
              <div className="col-12 text-end mt-4">
                <button
                  type="submit"
                  className={styles.btnTeal}
                  disabled={saving}
                >
                  {saving && (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  )}
                  {saving ? (
                    "Đang lưu..."
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-1"></i> Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Toast toast={toast} showToast={showToast} />
    </div>
  );
}
