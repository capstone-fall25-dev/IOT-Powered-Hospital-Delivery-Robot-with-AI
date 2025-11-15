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
        compartments: [
            { name: "", code: "", categoryId: "", isLocked: true, isActice: true }
        ]
    });

    const [maps, setMaps] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Lấy danh sách map
    useEffect(() => {
        async function fetchMaps() {
            try {
                const mapsData = await getAllMaps();
                setMaps(mapsData);
            } catch (err) {
                console.error(err);
                alert("Không thể tải danh sách map!");
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
                console.error(err);
                alert("Không thể tải danh sách category!");
            }
        }
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCompartmentChange = (index, e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const comps = [...prev.compartments];
            comps[index][name] = value;
            return { ...prev, compartments: comps };
        });
    };

    const addCompartment = () => {
        setForm(prev => ({
            ...prev,
            compartments: [...prev.compartments, { name: "", code: "", categoryId: "", isLocked: true, isActice: true }]
        }));
    };

    const removeCompartment = (index) => {
        setForm(prev => {
            const comps = [...prev.compartments];
            comps.splice(index, 1);
            return { ...prev, compartments: comps };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Tạo payload chuẩn API
        const payload = {
            ...form,
            status: "active",
            batteryPercent: 100,
            latitude: 0,
            longitude: 0,
            progressOverallPct: 100,
            progressLegPct: 100,
            isMicOn: true,
            etaDeliveryAt: new Date().toISOString(),
            etaReturnAt: new Date().toISOString(),
            errorCountSession: 0,
        };

        try {
            await createRobot(payload);
            alert("Tạo Robot thành công!");
            navigate("/robots");
        } catch (err) {
            console.error(err);
            setError("Không thể tạo Robot. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container py-5">
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <h4 className="mb-0 fw-bold">Tạo Robot mới</h4>
                    <button className="btn btn-outline-secondary rounded-pill" onClick={() => navigate("/robots")}>
                        <i className="bi bi-arrow-left"></i> Quay lại
                    </button>
                </div>

                <div className={styles.glass + " p-4 p-md-5"}>
                    {error && <div className="alert alert-danger text-center">{error}</div>}

                    <form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Tên Robot</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Mã Robot</label>
                            <input
                                type="text"
                                name="code"
                                value={form.code}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Map</label>
                            <select
                                name="mapId"
                                value={form.mapId}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- Chọn Map --</option>
                                {maps.map(m => (
                                    <option key={m.id} value={m.id}>{m.mapName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Compartments */}
                        <div className="col-12">
                            <label className="form-label">Ngăn Robot</label>
                            {form.compartments.map((c, i) => (
                                <div key={i} className="d-flex gap-2 mb-2 flex-wrap align-items-center">
                                    <input
                                        type="text"
                                        name="name"
                                        value={c.name}
                                        onChange={(e) => handleCompartmentChange(i, e)}
                                        placeholder="Tên ngăn"
                                        className="form-control"
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="code"
                                        value={c.code}
                                        onChange={(e) => handleCompartmentChange(i, e)}
                                        placeholder="Mã ngăn"
                                        className="form-control"
                                        required
                                    />
                                    <select
                                        name="categoryId"
                                        value={c.categoryId}
                                        onChange={(e) => handleCompartmentChange(i, e)}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">-- Loại ngăn --</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeCompartment(i)}>
                                        Xóa
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addCompartment}>
                                Thêm ngăn
                            </button>
                        </div>

                        <div className="col-12 text-end mt-4">
                            <button type="submit" className="btn btn-teal rounded-pill" disabled={loading}>
                                {loading ? "Đang lưu..." : "Lưu Robot"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
