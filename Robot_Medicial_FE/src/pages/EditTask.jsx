import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getTaskEditData, updateTask } from "@/services/taskService";
import { getAllMaps, getMapById } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import {
    getUnlockedCompartments,
    getCompartmentsByRobotAndCategory,
    getAllCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions } from "@/services/prescriptionServices";
import { getAvailableRobots } from "@/services/robotService";

import styles from "@/assets/styles/taskForm.module.css";

export default function EditTask() {
    const { id } = useParams();
    const navigate = useNavigate();

    // ===================== STATE =====================
    const [loading, setLoading] = useState(true);

    const [maps, setMaps] = useState([]);
    const [robots, setRobots] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [patients, setPatients] = useState([]);
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const [baseCompartments, setBaseCompartments] = useState([]);

    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        priority: 0,
        scheduledStartAt: "",
        stops: [],
    });

    const priorityMap = {
        0: "Normal",
        1: "Urgent",
        2: "Critical"
    };

    const [initLoaded, setInitLoaded] = useState(false);

    // ===================== LOAD INITIAL BASE DATA =====================
    useEffect(() => {
        async function loadInit() {
            const [mapsData, robotsData, patientsData, categoriesData] = await Promise.all([
                getAllMaps(),
                getAvailableRobots(),
                getAllPatients(),
                getAllCategories()
            ]);

            setMaps(mapsData);
            setRobots(robotsData);
            setPatients(patientsData);
            setCategories(categoriesData);
        }

        loadInit().then(() => setInitLoaded(true))
    }, []);

    // ===================== LOAD TASK EDIT DTO =====================
    useEffect(() => {
        async function loadTask() {
            try {
                const data = await getTaskEditData(id);

                if (!robots.some(r => r.id === data.robotId)) {
                    setRobots(prev => [...prev, {
                        id: data.robotId,
                        name: `Robot #${data.robotId} (không khả dụng)`,
                        batteryPercent: 0
                    }]);
                }

                // convert stops to FE structure
                const editedStops = await Promise.all(
                    data.stops.map(async (s) => {
                        let filtered = s.categoryId
                            ? await getCompartmentsByRobotAndCategory(data.robotId, s.categoryId)
                            : [];

// FIX 2: Nếu compartmentId BE trả về không có trong filtered → thêm fallback
                        if (s.compartmentId && !filtered.some(c => c.id === s.compartmentId)) {
                            filtered = [
                                ...filtered,
                                {
                                    id: s.compartmentId,
                                    compartmentCode: `#${s.compartmentId} (không khả dụng)`
                                }
                            ];
                        }

                        // Load prescription if patient exists
                        let prescriptionPreview = null;
                        if (s.patientId) {
                            const prescriptions = await getAllPrescriptions(s.patientId, "approved");
                            if (prescriptions.length > 0) {
                                prescriptionPreview = prescriptions.sort(
                                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                                )[0];
                            }
                        }

                        return {
                            stopId: s.stopId,
                            seqNo: s.seqNo,
                            destinationId: s.destinationId,
                            patientId: s.patientId,
                            categoryId: s.categoryId,
                            compartmentId: s.compartmentId,
                            customName: s.customName ?? "",
                            itemDesc: s.itemDesc ?? "",
                            filteredCompartments: filtered,
                            prescriptionPreview
                        };
                    })
                );

                setForm({
                    mapId: data.mapId,
                    robotId: data.robotId,
                    priority: data.priority,
                    scheduledStartAt: data.scheduledStartAt
                        ? new Date(data.scheduledStartAt).toISOString().slice(0, 16)
                        : "",
                    stops: editedStops
                });

                // load map destinations
                const mapDetail = await getMapById(data.mapId);
                setDestinations(mapDetail.destinations || []);

                // load unlocked compartments for robot
                const comps = await getUnlockedCompartments(data.robotId);
                setBaseCompartments(comps);

                setLoading(false);
            } catch (err) {
                setMessage("❌ Không tải được dữ liệu chỉnh sửa");
                setMessageType("error");
                console.error(err);
                setLoading(false);
            }
        }
        if (!initLoaded) return;
        loadTask();
    }, [id, initLoaded]);

    // ===================== UPDATE STOP FIELD =====================
    async function updateStop(idx, key, value) {
        const clone = [...form.stops];
        clone[idx][key] = value;

        // Khi đổi category → reset compartment → load lại danh sách
        if (key === "categoryId") {
            const oldCompartment = clone[idx].compartmentId;
            clone[idx].compartmentId = "";

            let list = await getCompartmentsByRobotAndCategory(form.robotId, value);

            // Nếu compartment cũ không còn → thêm fallback
            if (oldCompartment && !list.some(c => c.id === oldCompartment)) {
                list = [
                    ...list,
                    {
                        id: oldCompartment,
                        compartmentCode: `#${oldCompartment} (không khả dụng)`
                    }
                ];
            }

            clone[idx].filteredCompartments = list;
        }

        setForm(f => ({ ...f, stops: clone }));
    }

    // ===================== SELECT MAP =====================
    async function handleSelectMap(mapId) {
        setForm(f => ({ ...f, mapId }));

        if (!mapId) {
            setDestinations([]);
            return;
        }

        const detail = await getMapById(mapId);
        setDestinations(detail.destinations || []);
    }

    // ===================== SELECT ROBOT =====================
    async function handleSelectRobot(robotId) {
        setForm(f => ({
            ...f,
            robotId,
        }));

        const comps = await getUnlockedCompartments(robotId);
        setBaseCompartments(comps);
    }

    // ===================== SELECT PATIENT =====================
    async function handleSelectPatient(patientId, idx) {
        updateStop(idx, "patientId", patientId);

        if (!patientId)
            return updateStop(idx, "prescriptionPreview", null);

        const list = await getAllPrescriptions(patientId, "approved");
        if (list.length === 0)
            return updateStop(idx, "prescriptionPreview", null);

        const latest = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        updateStop(idx, "prescriptionPreview", latest);
    }

    // ===================== SUBMIT UPDATE =====================
    async function handleUpdate() {
        try {
            const payload = {
                robotId: Number(form.robotId),
                mapId: Number(form.mapId),
                priority: priorityMap[form.priority],
                scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
                status: "pending",
                stops: form.stops.map(s => ({
                    stopId: s.stopId,
                    seqNo: s.seqNo,
                    destinationId: Number(s.destinationId),
                    patientId: Number(s.patientId),
                    compartmentId: Number(s.compartmentId),
                    categoryId: Number(s.categoryId),
                    customName: s.customName,
                    itemDesc: s.itemDesc,
                }))
            };

            await updateTask(id, payload);

            setMessage("✔ Cập nhật nhiệm vụ thành công");
            setMessageType("success");
            setTimeout(() => navigate(`/task-detail/${id}`), 1500);

        } catch (err) {
            console.error(err);
            setMessage(`❌ Lỗi: ${err.response?.data || err.message}`);
            setMessageType("error");
        }
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-xl py-4">
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3"></div>
                            <p className="text-muted">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===========================================================
    //                           UI
    // ===========================================================
    return (
        <div className={styles.page}>
            <div className="container-xl py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-11 col-xl-10">

                        {/* =================== HEADER =================== */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chip}>
                                    <i className="bi bi-pencil-square"></i>
                                </span>
                                <h4 className={`${styles.pageTitle} mb-0`}>Chỉnh sửa nhiệm vụ #{id}</h4>
                            </div>

                            <div className="d-flex gap-2">
                                <button 
                                    className="btn btn-outline-secondary"
                                    style={{ borderRadius: '5px', padding: '0.5rem 1.2rem' }}
                                    onClick={() => navigate(`/task-detail/${id}`)}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Quay lại
                                </button>
                            </div>
                        </div>

                        {/* =================== FORM =================== */}
                        <div className={`${styles.glass} p-4 p-md-5`}>

                            {/* MAP + ROBOT */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Bản đồ <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.mapId}
                                        onChange={(e) => handleSelectMap(e.target.value)}
                                    >
                                        <option value="">— Chọn bản đồ —</option>
                                        {maps.map(m => (
                                            <option value={m.id} key={m.id}>
                                                #{m.id} • {m.mapName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Robot <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.robotId}
                                        onChange={(e) => handleSelectRobot(e.target.value)}
                                    >
                                        <option value="">— Chọn robot —</option>
                                        {robots.map(r => (
                                            <option value={r.id} key={r.id}>
                                                #{r.id} • {r.name} 
                                                <span style={{ marginLeft: '8px' }}>🔋 {r.batteryPercent}%</span>
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* PRIORITY + TIME */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Độ ưu tiên
                                    </label>
                                    <select
                                        className={`form-select ${styles.formSelect}`}
                                        value={form.priority}
                                        onChange={(e) =>
                                            setForm(f => ({ ...f, priority: Number(e.target.value) }))
                                        }
                                    >
                                        <option value={0}>0 - Bình thường</option>
                                        <option value={1}>1 - Khẩn cấp</option>
                                        <option value={2}>2 - Nguy cấp</option>
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className={`form-label ${styles.formLabel}`}>
                                        Thời gian bắt đầu
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className={`form-control ${styles.formControl}`}
                                        value={form.scheduledStartAt}
                                        onChange={(e) =>
                                            setForm(f => ({ ...f, scheduledStartAt: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <hr className={styles.divider} />

                            {/* STOPS LIST */}
                            <h5 className={styles.sectionTitle}>
                                <i className="bi bi-geo-alt me-2" style={{ color: 'var(--teal-dark)' }}></i>
                                Danh sách điểm dừng ({form.stops.length})
                            </h5>

                            {form.stops.map((s, idx) => (
                                <div className={styles.stopCard} key={idx}>
                                    <div className={styles.stopHeader}>
                                        <div className={styles.stopNumber}>{s.seqNo}</div>
                                        <div className={styles.stopTitle}>Điểm dừng #{s.seqNo}</div>
                                    </div>

                                    <div className="row g-3">

                                        {/* DESTINATION */}
                                        <div className="col-md-6">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Điểm đến <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.destinationId}
                                                onChange={(e) => updateStop(idx, "destinationId", e.target.value)}
                                            >
                                                <option value="">— Chọn —</option>
                                                {destinations.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* PATIENT */}
                                        <div className="col-md-6">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Bệnh nhân <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.patientId}
                                                onChange={(e) => handleSelectPatient(e.target.value, idx)}
                                            >
                                                <option value="">— Chọn —</option>
                                                {patients.map(p => (
                                                    <option key={p.id} value={p.id}>{p.fullName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* CATEGORY */}
                                        <div className="col-md-4">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Loại ngăn <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.categoryId}
                                                onChange={(e) => updateStop(idx, "categoryId", e.target.value)}
                                            >
                                                <option value="">— Chọn —</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* COMPARTMENT */}
                                        <div className="col-md-4">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Ngăn chứa <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${styles.formSelect}`}
                                                value={s.compartmentId}
                                                onChange={(e) => updateStop(idx, "compartmentId", e.target.value)}
                                            >
                                                <option value="">— Chọn —</option>
                                                {s.filteredCompartments.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.compartmentCode}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* CUSTOM NAME */}
                                        <div className="col-md-4">
                                            <label className={`form-label ${styles.formLabel}`}>
                                                Ghi chú riêng
                                            </label>
                                            <input
                                                className={`form-control ${styles.formControl}`}
                                                value={s.customName}
                                                onChange={(e) => updateStop(idx, "customName", e.target.value)}
                                                placeholder="VD: Giao ngay..."
                                            />
                                        </div>

                                    </div>

                                    {/* PRESCRIPTION */}
                                    {s.prescriptionPreview && (
                                        <div className={styles.rxBox}>
                                            <h6 className={styles.rxTitle}>
                                                <i className="bi bi-file-medical"></i>
                                                Đơn thuốc: {s.prescriptionPreview.prescriptionCode}
                                            </h6>

                                            {s.prescriptionPreview.items.map((item) => (
                                                <div key={item.id} className={styles.rxItem}>
                                                    <div className={styles.rxMedicineName}>
                                                        {item.medicineName}
                                                    </div>
                                                    <div className={styles.rxInfo}>
                                                        <strong>Số lượng:</strong> {item.quantity}
                                                    </div>
                                                    <div className={styles.rxInfo}>
                                                        <strong>Liều dùng:</strong> {item.dosage}
                                                    </div>
                                                    <div className={styles.rxInfo}>
                                                        <strong>Hướng dẫn:</strong> {item.instructions}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* ITEM DESC */}
                                            <div className="mt-3">
                                                <label className={`form-label ${styles.formLabel}`}>
                                                    Mô tả vật phẩm (tùy chọn)
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${styles.formControl}`}
                                                    placeholder="VD: 2 túi dịch truyền + 1 ống tiêm..."
                                                    value={s.itemDesc}
                                                    onChange={(e) => updateStop(idx, "itemDesc", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* SAVE BUTTON */}
                            <button
                                className={`${styles.btnTeal} w-100 mt-4`}
                                onClick={handleUpdate}
                            >
                                <i className="bi bi-check-circle me-2"></i>
                                Cập nhật nhiệm vụ
                            </button>

                            {/* MESSAGE */}
                            {message && (
                                <div className={`${styles.message} ${
                                    messageType === 'success' ? styles.messageSuccess :
                                    messageType === 'error' ? styles.messageError : ''
                                }`}>
                                    {message}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}