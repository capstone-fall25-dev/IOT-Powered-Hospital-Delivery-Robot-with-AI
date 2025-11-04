import { useEffect, useState, useMemo } from "react";
import { createTask } from "@/services/taskService";
import { getAllRobots } from "@/services/robotService";
import { getAllMaps } from "@/services/mapService"; // giả sử API này trả về danh sách maps

export default function TaoNhiemVu() {
    // Load Bootstrap/Icons/Fonts
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

    const [robots, setRobots] = useState([]);
    const [maps, setMaps] = useState([]);
    const [form, setForm] = useState({
        mapId: "",
        robotId: "",
        assignedBy: 0,
        status: "pending",
        priority: 1,
        startedAt: new Date().toISOString().slice(0, 16),
        completedAt: "",
        totalDurationS: 0,
        totalErrors: 0,
        prescriptionId: 0,
        scheduledStartAt: new Date().toISOString().slice(0, 16),
        taskStops: [],
    });
    const [message, setMessage] = useState("");

    const canStart = form.robotId && form.taskStops.length > 0;

    // Load robots và maps từ API
    useEffect(() => {
        async function loadData() {
            try {
                const robotsData = await getAllRobots();
                setRobots(robotsData);

                const mapsData = await getAllMaps();
                setMaps(mapsData);
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
            }
        }
        loadData();
    }, []);

    const stats = useMemo(
        () => ({
            stops: form.taskStops.length,
            distanceKm: (form.taskStops.length * 0.35).toFixed(2),
            etaMin: form.taskStops.length * 6 + 3,
        }),
        [form.taskStops]
    );

    function addStop() {
        setForm((f) => ({
            ...f,
            taskStops: [
                ...f.taskStops,
                {
                    id: 0,
                    seqNo: f.taskStops.length + 1,
                    destinationId: 0,
                    customName: "",
                    status: "pending",
                    etaAt: new Date().toISOString(),
                    arrivedAt: "",
                    handedOverAt: "",
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
            const updatedStops = [...f.taskStops];
            updatedStops[idx][key] = value;
            return { ...f, taskStops: updatedStops };
        });
    }

    async function startMission() {
        if (!canStart) return;
        try {
            const now = new Date().toISOString();
            const taskDto = {
                ...form,
                mapId: Number(form.mapId),
                robotId: Number(form.robotId),
                startedAt: form.startedAt || now,
                scheduledStartAt: form.scheduledStartAt || now,
                completedAt: form.completedAt || null,
                suggestedCompartments: form.taskStops.map((_, idx) => ({
                    id: 0,
                    compartmentId: idx + 1,
                    stopId: idx + 1,
                    taskId: 0,
                    status: "available",
                })),
            };
            const created = await createTask(taskDto);
            setMessage(`Tạo nhiệm vụ thành công! ID: ${created.id}`);
            setForm({
                mapId: "",
                robotId: "",
                assignedBy: 0,
                status: "pending",
                priority: 1,
                startedAt: new Date().toISOString().slice(0, 16),
                completedAt: "",
                totalDurationS: 0,
                totalErrors: 0,
                prescriptionId: 0,
                scheduledStartAt: new Date().toISOString().slice(0, 16),
                taskStops: [],
            });
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
                            onChange={(e) => setForm({ ...form, mapId: e.target.value })}
                        >
                            <option value="">— Chọn map —</option>
                            {maps.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.id} • {m.name}
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
                        >
                            <option value="">— Chọn robot —</option>
                            {robots.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} • {r.name} (Pin {r.battery}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Task Stops dynamic */}
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5>Điểm đến (Task Stops)</h5>
                            <button className="btn btn-outline-secondary btn-sm" onClick={addStop}>Thêm Điểm</button>
                        </div>
                        {form.taskStops.map((stop, idx) => (
                            <div key={idx} className="glass p-2 mb-2 rounded-2xl">
                                <div className="row g-2 align-items-center">
                                    <div className="col-md-2">
                                        <label>Seq No</label>
                                        <input type="number" className="form-control" value={stop.seqNo} onChange={(e) => updateStop(idx, "seqNo", Number(e.target.value))} />
                                    </div>
                                    <div className="col-md-2">
                                        <label>Destination ID</label>
                                        <input type="number" className="form-control" value={stop.destinationId} onChange={(e) => updateStop(idx, "destinationId", Number(e.target.value))} />
                                    </div>
                                    <div className="col-md-3">
                                        <label>Tên điểm đến</label>
                                        <input type="text" className="form-control" value={stop.customName} onChange={(e) => updateStop(idx, "customName", e.target.value)} />
                                    </div>
                                    <div className="col-md-2">
                                        <label>Trạng thái</label>
                                        <select className="form-select" value={stop.status} onChange={(e) => updateStop(idx, "status", e.target.value)}>
                                            <option value="pending">pending</option>
                                            <option value="in_progress">in_progress</option>
                                            <option value="completed">completed</option>
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label>ETA</label>
                                        <input type="datetime-local" className="form-control" value={stop.etaAt.slice(0, 16)} onChange={(e) => updateStop(idx, "etaAt", e.target.value)} />
                                    </div>
                                    <div className="col-md-1 d-flex align-items-end">
                                        <button className="btn btn-outline-danger btn-sm" onClick={() => removeStop(idx)}>X</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tổng quan & nút submit */}
                    <div className="glass p-3 rounded-2xl d-flex flex-column">
                        <div className="mb-2">
                            <strong>Số điểm:</strong> {stats.stops}, <strong>Khoảng cách ~</strong> {stats.distanceKm} km, <strong>Thời gian ~</strong> {stats.etaMin} phút
                        </div>
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
