import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRobot } from "@/services/robotService";
import { getAllMaps } from "@/services/mapService";
import { getAllCategoryCompartment } from "@/services/categotiresCompartmentService";
import styles from "@/assets/styles/createRobot.module.css";

export default function CreateRobot() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        code: "",
        mapId: "",
        compartments: [{ categoryId: "" }]
    });

    const [maps, setMaps] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, type: "", message: "" });

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
                showToast("error", "Không thể tải danh sách map!");
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
                showToast("error", "Không thể tải danh sách loại ngăn!");
            }
        }
        fetchCategories();
    }, []);

    // === HIỆU ỨNG TOAST THUẦN CSS ===
    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => {
            setToast({ show: false, type: "", message: "" });
        }, 2800);
    };

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
            setTimeout(() => navigate("/team"), 800); // Chuyển trang sau hiệu ứng
        } catch (err) {
            console.error("Create robot error:", err);

            let errorMessage = "Không thể tạo Robot. Vui lòng thử lại!";

            if (err.response?.data?.message) {
                const msg = err.response.data.message;

                if (err.response.status === 409) {
                    errorMessage = `Mã Robot đã tồn tại: "${form.code}". Vui lòng tạo mã mới!`;
                } else if (err.response.status === 400) {
                    errorMessage = msg;
                } else if (err.response.status >= 500) {
                    errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau.";
                } else {
                    errorMessage = msg;
                }
            } else if (err.request) {
                errorMessage = "Không thể kết nối đến máy chủ!";
            } else {
                errorMessage = err.message || errorMessage;
            }

            showToast("error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* === TOAST THUẦN CSS === */}
            <div className={`${styles.toastContainer} ${toast.show ? styles.show : ""}`}>
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    <div className={styles.toastIcon}>
                        {toast.type === "success" && "Check"}
                        {toast.type === "error" && "Error"}
                        {toast.type === "warning" && "Warning"}
                        {toast.type === "info" && "Info"}
                    </div>
                    <div className={styles.toastMessage}>{toast.message}</div>
                    <button
                        className={styles.toastClose}
                        onClick={() => setToast({ ...toast, show: false })}
                    >
                        ×
                    </button>
                </div>
            </div>

            <div className="container py-5">
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <h4 className="mb-0 fw-bold">Tạo Robot mới</h4>
                    <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate("/team")}>
                        Quay lại
                    </button>
                </div>

                <div className={styles.glass + " p-4 p-md-5"}>
                    <form onSubmit={handleSubmit} className="row g-3">
                        {/* Tên Robot */}
                        <div className="col-md-6">
                            <label className="form-label">Tên Robot <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="VD: Robot Giao Hàng A1"
                                required
                            />
                        </div>

                        {/* Mã Robot - TỰ SINH + NÚT TẠO LẠI */}
                        <div className="col-md-6">
                            <label className="form-label">Mã Robot <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    value={form.code}
                                    className="form-control"
                                    placeholder="RBxxx"
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={regenerateCode}
                                >
                                    Tạo lại
                                </button>
                            </div>
                            <small className="text-muted">Mã tự động: RB + 3 số ngẫu nhiên</small>
                        </div>

                        {/* Chọn Map */}
                        <div className="col-md-6">
                            <label className="form-label">Bản đồ <span className="text-danger">*</span></label>
                            <select
                                name="mapId"
                                value={form.mapId}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- Chọn bản đồ --</option>
                                {maps.map(m => (
                                    <option key={m.id} value={m.id}>{m.mapName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Danh sách ngăn */}
                        <div className="col-12">
                            <label className="form-label">
                                Loại ngăn <span className="text-danger">*</span>
                            </label>
                            {form.compartments.map((c, i) => (
                                <div key={i} className="border rounded p-3 mb-3 bg-light">
                                    <div className="row align-items-center g-2">
                                        <div className="col-md-10">
                                            <select
                                                value={c.categoryId}
                                                onChange={(e) => handleCompartmentChange(i, e)}
                                                className="form-select"
                                                required
                                            >
                                                <option value="">-- Chọn loại ngăn {i + 1} --</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2 text-end">
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => removeCompartment(i)}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                    <small className="text-muted d-block mt-1">
                                        Mã ngăn tự động: <strong>C{i + 1 < 10 ? '00' : '0'}{i + 1}</strong>
                                    </small>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={addCompartment}
                            >
                                + Thêm ngăn
                            </button>
                        </div>

                        {/* Submit */}
                        <div className="col-12 text-end mt-4">
                            <button
                                type="submit"
                                className="btn btn-teal rounded-pill px-4"
                                disabled={loading}
                            >
                                {loading ? "Đang tạo..." : "Tạo Robot"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}