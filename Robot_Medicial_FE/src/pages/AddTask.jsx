import { useEffect, useState } from "react";
import { createTask } from "@/services/taskService";
import { getAllMaps, getMapById } from "@/services/mapService";
import { getAllPatients } from "@/services/patientService";
import { getAllCompartments } from "@/services/compartmentService";

export default function Addtask() {
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        js.defer = true;
        document.body.appendChild(js);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
            document.body.removeChild(js);
        };
    }, []);

    const styles = (
        <style>{`
        :root{--teal:#4CE1C6;--ink:#0f172a}
        .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 20%,#e9f3f1 60%,#e8f0ee 100%);min-height:100vh}
        .glass{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 16px 48px rgba(15,23,42,.08);border-radius:24px}
        .rounded-2xl{border-radius:24px}
        .title{font-weight:900;color:#0b1432}
        .btn-teal{background:var(--teal);border:none;color:#052a2b;font-weight:800}
        .btn-teal:hover{filter:brightness(1.05)}
        .list-card{min-height:220px}
        `}</style>
    );

    const [maps, setMaps] = useState([]);
    const [robots, setRobots] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [patients, setPatients] = useState([]);
    const [compartments, setCompartments] = useState([]);

    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        assignedBy: 0,
        status: "pending",
        priority: 1,
        scheduledStartAt: new Date().toISOString().slice(0, 16),
        taskStops: [],
    });

    const [message, setMessage] = useState("");

    const canAddStop = form.mapId && form.robotId;
    const canStart = form.robotId && form.taskStops.length > 0;

    const TASK_STOP_STATUS = {
        pending: "Đang chờ",
        in_progress: "Đang thực hiện",
        awaiting_handover: "Chờ bàn giao",
        delivered: "Đã giao",
        skipped: "Bỏ qua",
        failed: "Thất bại",
    };

    const COMPARTMENT_STATUS = {
        pending: "Đang chờ",
        loaded: "Đã nạp",
        unlocked: "Mở khóa",
        delivered: "Đã giao",
        locked: "Khóa",
        canceled: "Đã hủy",
    };

    // Load maps và patients khi mount
    useEffect(() => {
        async function loadBase() {
            try {
                const [mapsData, patientsData, comps] = await Promise.all([
                    getAllMaps(),
                    getAllPatients(),
                    getAllCompartments(),
                ]);
                setMaps(mapsData);
                setPatients(patientsData);
                setCompartments(comps);
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
            }
        }
        loadBase();
    }, []);

    // Khi chọn map → load destinations và robots
    async function handleSelectMap(mapId) {
        setForm(f => ({ ...f, mapId, robotId: "" }));
        if (!mapId) {
            setDestinations([]);
            setRobots([]);
            return;
        }
        try {
            const mapDetail = await getMapById(mapId);
            const destList = mapDetail.destinasion || mapDetail.destinations || [];
            setDestinations(destList);
            setRobots(mapDetail.robots || []);
        } catch (err) {
            console.error("Lỗi lấy chi tiết map:", err);
        }
    }

    function addStop() {
        const nextSeq = form.taskStops.length + 1;
        setForm(f => ({
            ...f,
            taskStops: [
                ...f.taskStops,
                {
                    seqNo: nextSeq,
                    destinationId: "",
                    patientId: "",
                    compartmentId: "",
                    itemDesc: "",
                    status: "pending",
                },
            ],
        }));
    }

    function removeStop(idx) {
        setForm(f => ({
            ...f,
            taskStops: f.taskStops.filter((_, i) => i !== idx),
        }));
    }

    function updateStop(idx, key, value) {
        setForm(f => {
            const updatedStops = [...f.taskStops];
            updatedStops[idx][key] = value;
            return { ...f, taskStops: updatedStops };
        });
    }

    async function startMission() {
        if (!canStart) return;
        try {
            const now = new Date().toISOString(); // thời gian hiện tại

            const payload = {
                robotId: Number(form.robotId),
                assignedBy: 1, // fix cứng
                mapId: Number(form.mapId),
                priority: Number(form.priority),
                status: form.status,
                scheduledStartAt: form.scheduledStartAt
                    ? new Date(form.scheduledStartAt).toISOString()
                    : now,
                taskStops: form.taskStops.map(s => ({
                    seqNo: Number(s.seqNo),
                    destinationId: Number(s.destinationId),
                    patientId: Number(s.patientId),
                    customName: s.customName || "Nam",
                    status: s.status,
                    etaAt: s.etaAt ? new Date(s.etaAt).toISOString() : now,
                })),
                compartmentAssignments: form.taskStops.map(s => ({
                    stopSeqNo: Number(s.seqNo),
                    compartmentId: Number(s.compartmentId || 0),
                    itemDesc: s.itemDesc || "",
                    status: s.compartmentStatus || "pending",
                })),
            };

            const created = await createTask(payload);
            setMessage(`Tạo nhiệm vụ thành công! ID: ${created.id}`);
            setForm(f => ({ ...f, taskStops: [] })); // reset stops
        } catch (err) {
            console.error(err);
            setMessage(`Lỗi tạo nhiệm vụ: ${err.response?.data || err.message}`);
        }
    }


    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <h4 className="title mb-3">Tạo Nhiệm Vụ Mới</h4>
                <div className="glass p-3 p-md-4 rounded-2xl">

                    {/* Chọn Map */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Chọn Map</label>
                        <select
                            className="form-select"
                            value={form.mapId}
                            onChange={(e) => handleSelectMap(e.target.value)}
                        >
                            <option value="">— Chọn map —</option>
                            {maps.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.id} • {m.mapName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn Robot */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Chọn Robot</label>
                        <select
                            className="form-select"
                            value={form.robotId}
                            onChange={(e) => setForm({ ...form, robotId: e.target.value })}
                            disabled={!form.mapId}
                        >
                            <option value="">— Chọn robot —</option>
                            {robots.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.id} • {r.name} (Pin {r.batteryPercent}%)
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Độ ưu tiên */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Độ ưu tiên</label>
                        <select
                            className="form-select"
                            value={form.priority}
                            onChange={(e) => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                        >
                            <option value={1}>1 - Thấp</option>
                            <option value={2}>2 - Trung bình</option>
                            <option value={3}>3 - Cao</option>
                        </select>
                    </div>

                    {/* Trạng thái task */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Trạng thái nhiệm vụ</label>
                        <select
                            className="form-select"
                            value={form.status}
                            onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="pending">Đang chờ</option>
                            <option value="in_progress">Đang thực hiện</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="canceled">Đã hủy</option>
                        </select>
                    </div>
                    {/* Thêm điểm đến */}
                    <div className="mb-3 text-end">
                        <button className="btn btn-outline-secondary btn-sm" onClick={addStop} disabled={!canAddStop}>
                            + Thêm điểm đến
                        </button>
                    </div>

                    {/* Danh sách stop */}
                    {form.taskStops.map((stop, idx) => (
                        <div key={idx} className="glass p-3 mb-3 rounded-2xl">
                            {/* Hàng 1: Thông tin chính */}
                            <div className="row g-2 align-items-end">
                                <div className="col-md-2">
                                    <label>Thứ tự</label>
                                    <input type="number" className="form-control" value={stop.seqNo} disabled />
                                </div>

                                <div className="col-md-3">
                                    <label>Điểm đến</label>
                                    <select
                                        className="form-select"
                                        value={stop.destinationId}
                                        onChange={(e) => updateStop(idx, "destinationId", e.target.value)}
                                    >
                                        <option value="">— Chọn —</option>
                                        {destinations.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-3">
                                    <label>Bệnh nhân</label>
                                    <select
                                        className="form-select"
                                        value={stop.patientId}
                                        onChange={(e) => updateStop(idx, "patientId", e.target.value)}
                                    >
                                        <option value="">— Chọn bệnh nhân —</option>
                                        {patients.map((p) => (
                                            <option key={p.patientCode} value={p.patientCode}>{p.fullName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-2">
                                    <label>Trạng thái điểm dừng</label>
                                    <select
                                        className="form-select"
                                        value={stop.status}
                                        onChange={(e) => updateStop(idx, "status", e.target.value)}
                                    >
                                        {Object.entries(TASK_STOP_STATUS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-1 d-flex align-items-end">
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeStop(idx)}>X</button>
                                </div>
                            </div>

                            {/* Hàng 2: Box Ngăn chứa */}
                            <div className="row g-2 mt-3 align-items-end border-top pt-2">
                                <div className="col-md-3 d-flex flex-column">
                                    <label>Ngăn chứa</label>
                                    <select
                                        className="form-select"
                                        value={stop.compartmentId || ""}
                                        onChange={(e) => updateStop(idx, "compartmentId", e.target.value)}
                                    >
                                        <option value="">— Chọn ngăn —</option>
                                        {compartments.map((c) => (
                                            <option key={c.compartmentId} value={c.compartmentId}>{c.compartmentCode}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-5 d-flex flex-column">
                                    <label>&nbsp;</label> {/* placeholder để căn hàng với label khác */}
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Mô tả vật phẩm"
                                        value={stop.itemDesc || ""}
                                        onChange={(e) => updateStop(idx, "itemDesc", e.target.value)}
                                    />
                                </div>

                                <div className="col-md-4 d-flex flex-column">
                                    <label>Trạng thái ngăn chứa</label>
                                    <select
                                        className="form-select"
                                        value={stop.compartmentStatus || "pending"}
                                        onChange={(e) => updateStop(idx, "compartmentStatus", e.target.value)}
                                    >
                                        {Object.entries(COMPARTMENT_STATUS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* Bắt đầu nhiệm vụ */}
                    <div className="d-flex flex-column">
                        <button className="btn btn-teal mt-2 w-100" disabled={!canStart} onClick={startMission}>
                            Bắt đầu nhiệm vụ
                        </button>
                        {message && <div className="mt-2 small text-center">{message}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
