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

import styles from "../assets/styles/addTask.module.css";

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

        loadInit();
    }, []);

    // ===================== LOAD TASK EDIT DTO =====================
    useEffect(() => {
        async function loadTask() {
            try {
                const data = await getTaskEditData(id);

                // convert stops to FE structure
                const editedStops = await Promise.all(
                    data.stops.map(async (s) => {
                        const filtered = s.categoryId
                            ? await getCompartmentsByRobotAndCategory(data.robotId, s.categoryId)
                            : [];

                        return {
                            stopId: s.stopId,
                            seqNo: s.seqNo,
                            destinationId: s.destinationId,
                            patientId: s.patientId,
                            categoryId: s.categoryId,
                            compartmentId: s.compartmentId,
                            customName: s.customName ?? "",
                            itemDesc: s.itemDesc ?? "",
                            filteredCompartments: filtered
                        };
                    })
                );

                setForm({
                    mapId: data.mapId,
                    robotId: data.robotId,
                    priority: data.priority, // 0/1/2
                    scheduledStartAt: data.scheduledStartAt
                        ? new Date(data.scheduledStartAt).toISOString().slice(0, 16)
                        : "",
                    stops: editedStops
                });

                // load map destinations
                const mapDetail = await getMapById(data.mapId);
                setDestinations(mapDetail.destinations);

                // load unlocked compartments for robot
                const comps = await getUnlockedCompartments(data.robotId);
                setBaseCompartments(comps);

                setLoading(false);
            } catch (err) {
                setMessage("❌ Không tải được dữ liệu chỉnh sửa");
                console.error(err);
            }
        }
        loadTask();
    }, [id]);

    // ===================== UPDATE STOP FIELD =====================
    async function updateStop(idx, key, value) {
        const clone = [...form.stops];
        clone[idx][key] = value;

        // Khi đổi category → reset compartment → load lại danh sách
        if (key === "categoryId") {
            clone[idx].compartmentId = "";
            clone[idx].filteredCompartments =
                await getCompartmentsByRobotAndCategory(form.robotId, value);
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
        setDestinations(detail.destinations);
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
            setTimeout(() => navigate(`/task-detail/${id}`), 1500);

        } catch (err) {
            console.error(err);
            setMessage(`❌ Lỗi: ${err.response?.data || err.message}`);
        }
    }

    if (loading) return <div className="p-4">Đang tải dữ liệu...</div>;

    // ===========================================================
    //                           UI
    // ===========================================================
    return (
        <div className={styles.page}>
            <div className="container-lg py-4">
                <h4 className={`${styles.title} mb-3`}>Chỉnh sửa nhiệm vụ #{id}</h4>

                <div className={`${styles.glass} p-4`}>

                    {/* MAP + ROBOT */}
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className={styles.sectionLabel}>Map</label>
                            <select
                                className="form-select"
                                value={form.mapId}
                                onChange={(e) => handleSelectMap(e.target.value)}
                            >
                                <option value="">— chọn map —</option>
                                {maps.map(m => (
                                    <option value={m.id} key={m.id}>{m.mapName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className={styles.sectionLabel}>Robot</label>
                            <select
                                className="form-select"
                                value={form.robotId}
                                onChange={(e) => handleSelectRobot(e.target.value)}
                            >
                                <option value="">— chọn robot —</option>
                                {robots.map(r => (
                                    <option value={r.id} key={r.id}>
                                        {r.name} (Pin {r.batteryPercent}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* PRIORITY + TIME */}
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className={styles.sectionLabel}>Độ ưu tiên</label>
                            <select
                                className="form-select"
                                value={form.priority}
                                onChange={(e) =>
                                    setForm(f => ({ ...f, priority: Number(e.target.value) }))
                                }
                            >
                                <option value={0}>Bình thường</option>
                                <option value={1}>Khẩn cấp</option>
                                <option value={2}>Nguy cấp</option>
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className={styles.sectionLabel}>Thời gian bắt đầu</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={form.scheduledStartAt}
                                onChange={(e) =>
                                    setForm(f => ({ ...f, scheduledStartAt: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    {/* STOPS LIST */}
                    <h5 className="fw-bold mt-4 mb-3">Danh sách điểm dừng</h5>

                    {form.stops.map((s, idx) => (
                        <div className={`${styles.stopCard} mb-3`} key={idx}>
                            <div className="row g-3">

                                {/* SEQ */}
                                <div className="col-md-2">
                                    <label className={styles.sectionLabel}>Thứ tự</label>
                                    <input className="form-control" value={s.seqNo} disabled />
                                </div>

                                {/* DESTINATION */}
                                <div className="col-md-5">
                                    <label className={styles.sectionLabel}>Điểm đến</label>
                                    <select
                                        className="form-select"
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
                                <div className="col-md-5">
                                    <label className={styles.sectionLabel}>Bệnh nhân</label>
                                    <select
                                        className="form-select"
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
                                    <label className={styles.sectionLabel}>Loại ngăn</label>
                                    <select
                                        className="form-select"
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
                                    <label className={styles.sectionLabel}>Khoang chứa</label>
                                    <select
                                        className="form-select"
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
                                    <label className={styles.sectionLabel}>Ghi chú</label>
                                    <input
                                        className="form-control"
                                        value={s.customName}
                                        onChange={(e) => updateStop(idx, "customName", e.target.value)}
                                    />
                                </div>

                                {/* ITEM DESC */}
                                <div className="col-md-12">
                                    <label className={styles.sectionLabel}>Mô tả vật phẩm</label>
                                    <input
                                        className="form-control"
                                        value={s.itemDesc}
                                        onChange={(e) => updateStop(idx, "itemDesc", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* SAVE BUTTON */}
                    <button
                        className={`btn ${styles.btnTeal} w-100 mt-3 py-2`}
                        onClick={handleUpdate}
                    >
                        Cập nhật nhiệm vụ
                    </button>

                    {message && <div className="mt-3 text-center fw-bold">{message}</div>}
                </div>
            </div>
        </div>
    );
}
