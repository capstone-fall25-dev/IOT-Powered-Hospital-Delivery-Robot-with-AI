// ===================== IMPORTS =====================
import { useEffect, useState } from "react";
import { createTask } from "@/services/taskService";
import { getAllMaps, getMapById } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import {
    getCompartmentsByRobot,
    getAllCategories,
} from "@/services/robotCompartmentService";
import { getAllPrescriptions } from "@/services/prescriptionServices";
import { getAvailableRobots } from "@/services/robotService";
import * as signalR from "@microsoft/signalr";

export default function AddTask() {
    // ===================== GLOBAL CSS =====================
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href =
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href =
            "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";

        document.head.appendChild(css);
        document.head.appendChild(icons);
        document.head.appendChild(font);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
        };
    }, []);

    const styles = (
        <style>{`
        :root{--teal:#4CE1C6;--ink:#0b1324}
        .page{font-family:Inter;color:#0b1324;background:#f6faf9;min-height:100vh}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-radius:24px;box-shadow:0 16px 48px rgba(15,23,42,.08)}
        .btn-teal{background:var(--teal);font-weight:700}
        .title{font-weight:900;color:#0b1432}
        .rx-box{background:#f8f9fa;border-left:4px solid #4CE1C6;padding:10px;margin-top:10px;border-radius:6px;}
        `}</style>
    );

    // ===================== STATE =====================
    const [maps, setMaps] = useState([]);
    const [robots, setRobots] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [patients, setPatients] = useState([]);
    const [categories, setCategories] = useState([]);
    const [availableCompartments, setAvailableCompartments] = useState([]);

    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        priority: 1,
        scheduledStartAt: new Date().toISOString().slice(0, 16),
        taskStops: [],
    });

    const [message, setMessage] = useState("");

    const canAddStop = form.robotId;
    const canStart = form.robotId && form.taskStops.length > 0;

    // ===================== SIGNALR =====================
    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5170/hubs/task", {
                transport: signalR.HttpTransportType.WebSockets,
                skipNegotiation: true,
            })
            .withAutomaticReconnect()
            .build();

        conn.start()
            .then(() => console.log("SignalR Connected"))
            .catch((err) => console.error("SignalR Connect Error:", err));

        conn.on("TaskCreated", (task) => {
            setMessage(`📡 Nhiệm vụ mới được tạo #${task.id}`);
        });

        return () => conn.stop();
    }, []);

    // ===================== LOAD MAPS + PATIENTS + ROBOTS + CATEGORIES =====================
    useEffect(() => {
        async function load() {
            setMaps(await getAllMaps());
            setPatients(await getAllPatients());
            setRobots(await getAvailableRobots());
            setCategories(await getAllCategories()); // ⭐ NEW
        }
        load();
    }, []);

    // ===================== MAP SELECT =====================
    async function handleSelectMap(mapId) {
        setForm((f) => ({ ...f, mapId }));

        if (!mapId) return;

        const mapDetail = await getMapById(mapId);

        setDestinations(
            mapDetail.destinations ||
                mapDetail.destinasions ||
                mapDetail.Destinations ||
                []
        );
    }

    // ===================== ROBOT SELECT =====================
    async function handleSelectRobot(robotId) {
        setForm((f) => ({ ...f, robotId }));

        if (!robotId) {
            setAvailableCompartments([]);
            return;
        }

        const comps = await getCompartmentsByRobot(robotId);

        const filtered = comps.filter(
            (x) => x.status === "unlocked" || x.status === "empty"
        );

        setAvailableCompartments(filtered);
    }

    // ===================== STOP HANDLERS =====================
    function addStop() {
        const nextSeq = form.taskStops.length + 1;

        setForm((f) => ({
            ...f,
            taskStops: [
                ...f.taskStops,
                {
                    seqNo: nextSeq,
                    destinationId: "",
                    patientId: "",
                    compartmentId: "",
                    categoryId: "", // ⭐ NEW
                    prescriptionPreview: null,
                },
            ],
        }));
    }

    function removeStop(idx) {
        setForm((f) => ({
            ...f,
            taskStops: f.taskStops.filter((_, i) => i !== idx),
        }));
    }

    function updateStop(idx, key, value) {
        setForm((f) => {
            const clone = [...f.taskStops];
            clone[idx][key] = value;
            return { ...f, taskStops: clone };
        });
    }

    // ===================== PRESCRIPTION PREVIEW =====================
    async function handleSelectPatient(patientId, idx) {
        updateStop(idx, "patientId", patientId);

        if (!patientId) {
            updateStop(idx, "prescriptionPreview", null);
            return;
        }

        const list = await getAllPrescriptions(patientId, "approved");

        if (list.length === 0) {
            updateStop(idx, "prescriptionPreview", null);
            return;
        }

        const latest = list.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0];

        updateStop(idx, "prescriptionPreview", latest);
    }

    // ===================== SUBMIT =====================
    async function startMission() {
        try {
            const payload = {
                mapId: Number(form.mapId),
                robotId: Number(form.robotId),
                priority: Number(form.priority),
                scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
                stops: form.taskStops.map((s) => ({
                    seqNo: s.seqNo,
                    destinationId: Number(s.destinationId),
                    patientId: Number(s.patientId),
                    compartmentId: Number(s.compartmentId),
                    categoryId: Number(s.categoryId), // ⭐ NEW
                })),
            };

            const created = await createTask(payload);
            setMessage(`🎉 Tạo nhiệm vụ thành công! ID = ${created.id}`);

            setForm((f) => ({ ...f, taskStops: [] }));
        } catch (err) {
            setMessage(`❌ Lỗi: ${err.response?.data || err.message}`);
        }
    }

    // ===================== RENDER =====================
    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <h4 className="title mb-3">Tạo nhiệm vụ mới</h4>

                <div className="glass p-4">
                    {/* MAP */}
                    <div className="mb-3">
                        <label className="fw-semibold">Chọn map</label>
                        <select
                            className="form-select"
                            value={form.mapId}
                            onChange={(e) => handleSelectMap(e.target.value)}
                        >
                            <option value="">— chọn map —</option>
                            {maps.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.id} • {m.mapName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ROBOT */}
                    <div className="mb-3">
                        <label className="fw-semibold">Chọn robot</label>
                        <select
                            className="form-select"
                            value={form.robotId}
                            onChange={(e) => handleSelectRobot(e.target.value)}
                        >
                            <option value="">— chọn robot —</option>
                            {robots.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} • {r.name} (Pin {r.batteryPercent}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* PRIORITY */}
                    <div className="mb-3">
                        <label className="fw-semibold">Độ ưu tiên</label>
                        <select
                            className="form-select"
                            value={form.priority}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    priority: Number(e.target.value),
                                }))
                            }
                        >
                            <option value={0}>0 - Bình thường</option>
                            <option value={1}>1 - Khẩn cấp</option>
                            <option value={2}>2 - Nguy cấp</option>
                        </select>
                    </div>

                    {/* START TIME */}
                    <div className="mb-3">
                        <label className="fw-semibold">Thời gian bắt đầu</label>
                        <input
                            type="datetime-local"
                            className="form-control"
                            value={form.scheduledStartAt}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    scheduledStartAt: e.target.value,
                                }))
                            }
                        />
                    </div>

                    {/* ADD STOP */}
                    <div className="text-end mb-2">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={addStop}
                            disabled={!canAddStop}
                        >
                            + Thêm điểm dừng
                        </button>
                    </div>

                    {/* STOP LIST */}
                    {form.taskStops.map((s, idx) => (
                        <div className="glass p-3 mb-3" key={idx}>
                            <div className="row g-3">
                                <div className="col-2">
                                    <label>Thứ tự</label>
                                    <input
                                        className="form-control"
                                        value={s.seqNo}
                                        disabled
                                    />
                                </div>

                                <div className="col-3">
                                    <label>Điểm đến</label>
                                    <select
                                        className="form-select"
                                        value={s.destinationId}
                                        onChange={(e) =>
                                            updateStop(
                                                idx,
                                                "destinationId",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            — chọn điểm đến —
                                        </option>
                                        {destinations.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-3">
                                    <label>Bệnh nhân</label>
                                    <select
                                        className="form-select"
                                        value={s.patientId}
                                        onChange={(e) =>
                                            handleSelectPatient(
                                                e.target.value,
                                                idx
                                            )
                                        }
                                    >
                                        <option value="">
                                            — chọn bệnh nhân —
                                        </option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.fullName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-3">
                                    <label>Ngăn chứa</label>
                                    <select
                                        className="form-select"
                                        value={s.compartmentId}
                                        onChange={(e) =>
                                            updateStop(
                                                idx,
                                                "compartmentId",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            — chọn ngăn —
                                        </option>
                                        {availableCompartments.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.compartmentCode}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* CATEGORY */}
                                <div className="col-3">
                                    <label>Loại ngăn</label>
                                    <select
                                        className="form-select"
                                        value={s.categoryId}
                                        onChange={(e) =>
                                            updateStop(
                                                idx,
                                                "categoryId",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            — chọn loại —
                                        </option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-1 d-flex align-items-end">
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => removeStop(idx)}
                                    >
                                        X
                                    </button>
                                </div>
                            </div>

                            {/* PRESCRIPTION PREVIEW */}
                            {s.prescriptionPreview && (
                                <div className="rx-box mt-3">
                                    <h6 className="fw-bold">
                                        📄 Đơn thuốc:{" "}
                                        {
                                            s.prescriptionPreview
                                                .prescriptionCode
                                        }
                                    </h6>

                                    {s.prescriptionPreview.items.map(
                                        (item) => (
                                            <div key={item.id} className="mb-2">
                                                <b>{item.medicineName}</b>
                                                <div>
                                                    Số lượng: {item.quantity}
                                                </div>
                                                <div>
                                                    Liều dùng: {item.dosage}
                                                </div>
                                                <div>
                                                    Hướng dẫn:{" "}
                                                    {item.instructions}
                                                </div>
                                                <hr />
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* SUBMIT */}
                    <button
                        className="btn btn-teal w-100"
                        disabled={!canStart}
                        onClick={startMission}
                    >
                        Bắt đầu nhiệm vụ
                    </button>

                    {message && (
                        <div className="mt-3 text-center fw-bold">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
