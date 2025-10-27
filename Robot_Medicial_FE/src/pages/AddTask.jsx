import { useEffect, useMemo, useState } from "react";

export default function CreateMission() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href =
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
        document.head.appendChild(css);

        const icons = document.createElement("link");
        icons.rel = "stylesheet";
        icons.href =
            "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css";
        document.head.appendChild(icons);

        const font = document.createElement("link");
        font.rel = "stylesheet";
        font.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
        document.head.appendChild(font);

        const js = document.createElement("script");
        js.src =
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
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
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .list-card{min-height:220px}
      .ghost{opacity:.6}
    `}</style>
    );

    const robots = [
        { id: "RB-001", name: "Robot A1", battery: 78 },
        { id: "RB-002", name: "Robot A2", battery: 64 },
        { id: "RB-003", name: "Robot B1", battery: 92 },
    ];

    const suggestions = [
        { id: 1, name: "Phòng 502A - Khu cách ly" },
        { id: 2, name: "Khoa Dược" },
        { id: 3, name: "Phòng Xét Nghiệm" },
        { id: 4, name: "Phòng Cấp Cứu" },
        { id: 5, name: "Trạm Sạc 01" },
        { id: 6, name: "Khoa Nội A" },
    ];

    const [selectedRobot, setSelectedRobot] = useState("");
    const [input, setInput] = useState("");
    const [route, setRoute] = useState([]);
    const canStart = selectedRobot && route.length > 0;

    function addPoint(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        setRoute((r) => [
            ...r,
            { id: Date.now() + Math.random(), name: trimmed },
        ]);
        setInput("");
    }

    function removePoint(id) {
        setRoute((r) => r.filter((p) => p.id !== id));
    }

    function move(id, dir) {
        setRoute((r) => {
            const i = r.findIndex((p) => p.id === id);
            if (i < 0) return r;
            const j = Math.min(r.length - 1, Math.max(0, i + dir));
            const copy = [...r];
            const [x] = copy.splice(i, 1);
            copy.splice(j, 0, x);
            return copy;
        });
    }

    function clearAll() {
        setRoute([]);
    }

    const stats = useMemo(
        () => ({
            stops: route.length,
            distanceKm: (route.length * 0.35).toFixed(2),
            etaMin: route.length * 6 + 3,
        }),
        [route]
    );

    function startMission() {
        if (!canStart) return;
        alert(
            `Bắt đầu nhiệm vụ cho ${selectedRobot}\nĐiểm dừng: ${route.length}\nQuãng đường ~ ${stats.distanceKm} km / ~${stats.etaMin} phút`
        );
    }

    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h4 className="title mb-0">Giao Nhiệm Vụ Mới</h4>
                    <button className="btn btn-outline-secondary rounded-pill">
                        <i className="bi bi-x-lg me-1"></i>Hủy Bỏ
                    </button>
                </div>

                <div className="glass p-3 p-md-4 rounded-2xl">
                    {/* Chọn Robot */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Chọn Robot</label>
                        <select
                            className="form-select"
                            value={selectedRobot}
                            onChange={(e) => setSelectedRobot(e.target.value)}
                        >
                            <option value="">— Chọn robot —</option>
                            {robots.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} • {r.name} (Pin {r.battery}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Points builder */}
                    <div className="row g-3">
                        <div className="col-lg-7">
                            <label className="form-label fw-semibold">Thêm Điểm Đến</label>
                            <div className="input-group mb-2">
                                <input
                                    className="form-control"
                                    placeholder="Nhập tên phòng, khoa…"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addPoint(input);
                                        }
                                    }}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => addPoint(input)}
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>

                            <div className="row g-3">
                                <div className="col-sm-7">
                                    <div className="glass p-2 rounded-2xl list-card">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="fw-semibold">Lộ trình ({route.length})</div>
                                            {route.length > 0 && (
                                                <button
                                                    className="btn btn-sm btn-outline-secondary rounded-pill"
                                                    onClick={clearAll}
                                                >
                                                    <i className="bi bi-x-circle me-1"></i>Xóa hết
                                                </button>
                                            )}
                                        </div>
                                        <ul className="list-group list-group-flush mt-2">
                                            {route.length === 0 && (
                                                <li className="list-group-item text-muted">
                                                    Chưa có điểm đến nào được thêm.
                                                </li>
                                            )}
                                            {route.map((p, idx) => (
                                                <li
                                                    key={p.id}
                                                    className="list-group-item d-flex align-items-center justify-content-between"
                                                >
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="badge text-bg-secondary">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="fw-semibold">{p.name}</span>
                                                    </div>
                                                    <div className="btn-group btn-group-sm">
                                                        <button
                                                            className="btn btn-outline-secondary"
                                                            onClick={() => move(p.id, -1)}
                                                            disabled={idx === 0}
                                                        >
                                                            <i className="bi bi-arrow-up"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-secondary"
                                                            onClick={() => move(p.id, 1)}
                                                            disabled={idx === route.length - 1}
                                                        >
                                                            <i className="bi bi-arrow-down"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger"
                                                            onClick={() => removePoint(p.id)}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="col-sm-5">
                                    <div className="glass p-3 rounded-2xl h-100 d-flex flex-column justify-content-between">
                                        <div>
                                            <div className="fw-semibold mb-2">Tổng quan</div>
                                            <div className="d-flex align-items-center justify-content-between small">
                                                <span>Điểm dừng</span>
                                                <strong>{stats.stops}</strong>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between small">
                                                <span>Quãng đường ~</span>
                                                <strong>{stats.distanceKm} km</strong>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between small">
                                                <span>Thời gian ước tính ~</span>
                                                <strong>{stats.etaMin} phút</strong>
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-teal mt-3"
                                            disabled={!canStart}
                                            onClick={startMission}
                                        >
                                            Bắt Đầu Nhiệm Vụ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Suggestions */}
                        <div className="col-lg-5">
                            <label className="form-label fw-semibold">Địa Điểm Gợi Ý</label>
                            <div
                                className="glass p-2 rounded-2xl"
                                style={{ maxHeight: 320, overflowY: "auto" }}
                            >
                                <div className="row g-2">
                                    {suggestions.map((s) => (
                                        <div className="col-12" key={s.id}>
                                            <button
                                                className="btn btn-light w-100 text-start"
                                                onClick={() => addPoint(s.name)}
                                            >
                                                <i className="bi bi-geo-alt me-2"></i>
                                                {s.name}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
