import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRobot } from "@/services/robotService";
import { getAllMaps } from "@/services/mapService";
import { getAllCategoryCompartment } from "@/services/categotiresCompartmentService";
import styles from "@/assets/styles/createRobot.module.css";
import useToast from "@/hooks/useToast";
import Toast from "@/components/Toast";

export default function CreateRobot() {
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [form, setForm] = useState({
        name: "",
        code: "",
        mapId: "",
        compartments: [{ categoryId: "" }]
    });

    const [maps, setMaps] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // === TỰ ĐỘNG SINH MÃ ROBOT: RB + 3 số ngẫu nhiên ===
    useEffect(() => {
        const generateRobotCode = () => {
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            return `RB${randomNum}`;
        };

        if (!form.code) {
            setForm(prev => ({ ...prev, code: generateRobotCode() }));
        }
    }, [form.code]);

    // Lấy danh sách map
    useEffect(() => {
        async function fetchMaps() {
            try {
                const mapsData = await getAllMaps();
                setMaps(mapsData);
            } catch (err) {
                showToast("error", err.message || "Không thể tải danh sách map!");
            }
        }
        fetchMaps();
    }, []);

    // Lấy danh sách category
    useEffect(() => {
        async function fetchCategories() {
            try {
                const categoriesData = await getAllCategoryCompartment();
                setCategories(categoriesData);
            } catch (err) {
                showToast("error", err.message || "Không thể tải danh sách loại ngăn!");
            }
        }
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCompartmentChange = (index, e) => {
        const { value } = e.target;
        setForm(prev => {
            const comps = [...prev.compartments];
            comps[index].categoryId = value;
            return { ...prev, compartments: comps };
        });
    };

    const addCompartment = () => {
        setForm(prev => ({
            ...prev,
            compartments: [...prev.compartments, { categoryId: "" }]
        }));
    };

    const removeCompartment = (index) => {
        if (form.compartments.length === 1) {
            showToast("warning", "Phải có ít nhất 1 ngăn!");
            return;
        }
        setForm(prev => {
            const comps = [...prev.compartments];
            comps.splice(index, 1);
            return { ...prev, compartments: comps };
        });
    };

    const regenerateCode = () => {
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newCode = `RB${randomNum}`;
        setForm(prev => ({ ...prev, code: newCode }));
        showToast("info", `Mã mới: ${newCode}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length > 255) return showToast("error", "Tên robot không được vượt quá 255 kí tự!");
        setLoading(true);

        const payload = {
            name: form.name.trim(),
            code: form.code.trim(),
            mapId: form.mapId,
            batteryPercent: 100,
            status: "active",
            latitude: 0,
            longitude: 0,
            progressOverallPct: 100,
            progressLegPct: 100,
            isMicOn: true,
            etaDeliveryAt: new Date().toISOString(),
            etaReturnAt: new Date().toISOString(),
            errorCountSession: 0,
            compartments: form.compartments.map(c => ({
                categoryId: c.categoryId
            }))
        };

        try {
            await createRobot(payload);
            showToast("success", "Tạo Robot thành công!");
            setTimeout(() => navigate("/team"), 800);
        } catch (err) {
            console.error("Create robot error:", err);
            // apiFetch đã parse message từ BE và đặt vào err.message
            // Ưu tiên message từ BE, chỉ dùng fallback khi không có
            showToast("error", err.message || "Không thể tạo Robot. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                {/* =================== HEADER =================== */}
                <div className={styles.headerSection}>
                    <h4 className={styles.pageTitle}>
                        <i className="bi bi-robot me-2" style={{ color: 'var(--teal-dark)' }}></i>
                        Tạo Robot mới
                    </h4>
                    <button
                        className={styles.btnSecondary}
                        onClick={() => navigate("/team")}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        Quay lại
                    </button>
                </div>

                {/* =================== FORM =================== */}
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

                            {/* Mã Robot - TỰ SINH + NÚT TẠO LẠI */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    <i className="bi bi-upc-scan me-1"></i>
                                    Mã Robot <span className="text-danger">*</span>
                                </label>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        value={form.code}
                                        className={styles.formControl}
                                        placeholder="RBxxx"
                                        readOnly
                                    />
                                    <button
                                        type="button"
                                        className={styles.btnRegenerate}
                                        onClick={regenerateCode}
                                    >
                                        <i className="bi bi-arrow-clockwise me-1"></i>
                                        Tạo lại
                                    </button>
                                </div>
                                <small className={styles.helpText}>
                                    <i className="bi bi-info-circle me-1"></i>
                                    Mã tự động: RB + 3 số ngẫu nhiên
                                </small>
                            </div>

                            {/* Chọn Map */}
                            <div className="col-md-6">
                                <label className={styles.formLabel}>
                                    <i className="bi bi-map me-1"></i>
                                    Bản đồ <span className="text-danger">*</span>
                                </label>
                                <select
                                    name="mapId"
                                    value={form.mapId}
                                    onChange={handleChange}
                                    className={styles.formSelect}
                                    required
                                >
                                    <option value="">— Chọn bản đồ —</option>
                                    {maps.map(m => (
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
                                                    value={c.categoryId}
                                                    onChange={(e) => handleCompartmentChange(i, e)}
                                                    className={styles.formSelect}
                                                    required
                                                >
                                                    <option value="">— Chọn loại ngăn —</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-2 text-end">
                                                <button
                                                    type="button"
                                                    className={styles.btnRemove}
                                                    onClick={() => removeCompartment(i)}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.compartmentCode}>
                                            <i className="bi bi-qr-code me-1"></i>
                                            Mã ngăn tự động: <strong>C{i + 1 < 10 ? '00' : '0'}{i + 1}</strong>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className={styles.btnAddCompartment}
                                    onClick={addCompartment}
                                >
                                    <i className="bi bi-plus-circle me-1"></i>
                                    Thêm ngăn chứa
                                </button>
                            </div>

                            {/* Submit */}
                            <div className="col-12 text-end mt-4">
                                <button
                                    type="submit"
                                    className={styles.btnTeal}
                                    disabled={loading}
                                >
                                    {loading && (
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                    )}
                                    {loading ? (
                                        "Đang tạo..."
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle me-1"></i>
                                            Tạo Robot
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