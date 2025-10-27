import { useEffect, useMemo, useState } from "react";

/**
 * Robot Mission History screen (React + Bootstrap 5)
 * Tone: teal/seafoam + glassy
 * - Filters: vehicle, status, date range, text search
 * - Sortable table + timeline view
 * - Mock data in-memory; swap with API easily
 */
export default function RobotMissionHistory() {
    // Load Bootstrap/Fonts/Icons for standalone preview
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

    // Theme
    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:28px}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .table thead th{border-bottom:2px solid rgba(2,6,23,.08)}
      .status-dot{width:10px;height:10px;border-radius:50%}
      .timeline{position:relative;padding-left:28px}
      .timeline::before{content:'';position:absolute;left:12px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,rgba(76,225,198,.7),rgba(76,225,198,0))}
      .t-item{position:relative;margin-bottom:18px}
      .t-item::before{content:'';position:absolute;left:-18px;top:6px;width:12px;height:12px;border-radius:999px;background:var(--teal);box-shadow:0 0 0 4px rgba(76,225,198,.2)}
    `}</style>
    );

    // Mock missions
    const [missions, setMissions] = useState(() => ([
        { id: 101, vehicle: "AUR-01", type: "Vận chuyển thuốc", from: "Kho Dược", to: "Khoa Nhi", start: "2025-10-25 08:12", end: "2025-10-25 08:37", distance: 0.9, status: "Hoàn thành", operator: "Tự động", notes: "Ưu tiên cao" },
        { id: 102, vehicle: "AUR-02", type: "Lấy mẫu xét nghiệm", from: "Khoa Nội A", to: "Xét nghiệm", start: "2025-10-25 09:05", end: "2025-10-25 09:22", distance: 0.6, status: "Hoàn thành", operator: "Tự động", notes: "" },
        { id: 103, vehicle: "AUR-03", type: "Khử khuẩn", from: "Phòng mổ 2", to: "Phòng mổ 2", start: "2025-10-25 10:10", end: "2025-10-25 10:55", distance: 0.2, status: "Bị hủy", operator: "Kỹ thuật", notes: "Mất kết nối tạm thời" },
        { id: 104, vehicle: "AUR-02", type: "Vận chuyển vật tư", from: "Kho Tổng", to: "Hồi sức", start: "2025-10-24 14:18", end: "2025-10-24 14:56", distance: 1.4, status: "Hoàn thành", operator: "Tự động", notes: "" },
        { id: 105, vehicle: "AUR-01", type: "Dẫn đường bệnh nhân", from: "Sảnh A", to: "Chẩn đoán hình ảnh", start: "2025-10-24 15:20", end: "2025-10-24 15:33", distance: 0.5, status: "Đang xử lý", operator: "Tự động", notes: "Có người đi cùng" },
        { id: 106, vehicle: "AUR-03", type: "Khử khuẩn", from: "Khoa Nhi", to: "Khoa Nhi", start: "2025-10-23 20:05", end: "2025-10-23 20:45", distance: 0.1, status: "Hoàn thành", operator: "Tự động", notes: "Ca đêm" },
    ]));

    // Filters & sorting
    const [vehicle, setVehicle] = useState("all");
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [sortKey, setSortKey] = useState("start");
    const [sortDir, setSortDir] = useState(-1); // newest first
    const [view, setView] = useState("table"); // table | timeline

    const vehicles = useMemo(() => Array.from(new Set(missions.map(m => m.vehicle))), [missions]);

    const filtered = useMemo(() => {
        const toTs = (s) => s ? new Date(s.replace(' ', 'T')).getTime() : null;
        const min = fromDate ? new Date(fromDate).getTime() : null;
        const max = toDate ? new Date(toDate).getTime() + 24 * 3600 * 1000 - 1 : null;
        const ql = q.toLowerCase();
        const list = missions.filter(m => (
            (vehicle === 'all' || m.vehicle === vehicle) &&
            (status === 'all' || m.status === status) &&
            (min === null || toTs(m.start) >= min) &&
            (max === null || toTs(m.start) <= max) &&
            (ql === '' || [m.type, m.from, m.to, m.operator, m.notes].some(x => x.toLowerCase().includes(ql)))
        ));
        return list.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    }, [missions, vehicle, status, q, fromDate, toDate, sortKey, sortDir]);

    function toggleSort(key) { if (sortKey === key) setSortDir(d => -d); else { setSortKey(key); setSortDir(1); } }

    function exportCSV() {
        const rows = [["ID", "Xe", "Loại", "Từ", "Đến", "Bắt đầu", "Kết thúc", "Quãng đường(km)", "Trạng thái", "Người vận hành", "Ghi chú"], ...filtered.map(m => [m.id, m.vehicle, m.type, m.from, m.to, m.start, m.end, m.distance, m.status, m.operator, m.notes?.replace(/\n/g, ' ')])];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'robot_missions.csv'; a.click(); URL.revokeObjectURL(url);
    }

    const StatusBadge = ({ s }) => {
        const map = { 'Hoàn thành': 'success', 'Đang xử lý': 'primary', 'Bị hủy': 'danger' };
        return <span className={`badge text-bg-${map[s] || 'secondary'}`}>{s}</span>;
    }

    const StatusDot = ({ s }) => {
        const map = { 'Hoàn thành': '#22c55e', 'Đang xử lý': '#0ea5a5', 'Bị hủy': '#ef4444' };
        return <span className="status-dot me-2" style={{ background: map[s] || '#94a3b8' }} />
    }

    return (
        <div className="page">
            {styles}

            <div className="container-lg py-4 py-lg-5">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
                    <div>
                        <h2 className="mb-0 fw-bold">Lịch sử nhiệm vụ xe robot</h2>
                        <div className="chip mt-2">Tra cứu hành trình • Xuất CSV • Xem timeline</div>
                    </div>
                    <div className="btn-group" role="group">
                        <button className={`btn ${view === 'table' ? 'btn-teal' : 'btn-outline-secondary'}`} onClick={() => setView('table')}><i className="bi bi-table me-1"></i>Bảng</button>
                        <button className={`btn ${view === 'timeline' ? 'btn-teal' : 'btn-outline-secondary'}`} onClick={() => setView('timeline')}><i className="bi bi-clock-history me-1"></i>Timeline</button>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass p-3 p-lg-4 rounded-2xl mb-3">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label">Xe</label>
                            <select className="form-select" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                                <option value="all">Tất cả</option>
                                {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Trạng thái</label>
                            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="all">Tất cả</option>
                                <option>Hoàn thành</option>
                                <option>Đang xử lý</option>
                                <option>Bị hủy</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Từ ngày</label>
                            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Đến ngày</label>
                            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                        <div className="col-12 col-md-9">
                            <label className="form-label">Tìm kiếm</label>
                            <input className="form-control" placeholder="Loại, nơi đi/đến, người vận hành, ghi chú…" value={q} onChange={e => setQ(e.target.value)} />
                        </div>
                        <div className="col-12 col-md-3 text-md-end">
                            <button className="btn btn-outline-secondary me-2" onClick={() => { setVehicle('all'); setStatus('all'); setFromDate(''); setToDate(''); setQ(''); }}>Reset</button>
                            <button className="btn btn-teal" onClick={exportCSV}><i className="bi bi-download me-1"></i>Xuất CSV</button>
                        </div>
                    </div>
                </div>

                {/* Table view */}
                {view === 'table' && (
                    <div className="glass p-0 rounded-2xl overflow-hidden">
                        <div className="table-responsive">
                            <table className="table mb-0 align-middle">
                                <thead className="bg-white">
                                    <tr>
                                        <th role="button" onClick={() => toggleSort('start')}>Bắt đầu</th>
                                        <th role="button" onClick={() => toggleSort('vehicle')}>Xe</th>
                                        <th>Loại</th>
                                        <th>Từ → Đến</th>
                                        <th className="text-center" role="button" onClick={() => toggleSort('distance')}>Km</th>
                                        <th>Người vận hành</th>
                                        <th>Ghi chú</th>
                                        <th className="text-end" role="button" onClick={() => toggleSort('status')}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(m => (
                                        <tr key={m.id}>
                                            <td className="text-nowrap">{m.start}</td>
                                            <td className="fw-semibold">{m.vehicle}</td>
                                            <td>{m.type}</td>
                                            <td>
                                                <div className="small text-muted">{m.from}</div>
                                                <div className="fw-semibold">→ {m.to}</div>
                                            </td>
                                            <td className="text-center">{m.distance}</td>
                                            <td>{m.operator}</td>
                                            <td className="text-truncate" style={{ maxWidth: 220 }}>{m.notes || '-'}</td>
                                            <td className="text-end"><StatusBadge s={m.status} /></td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={8} className="text-center text-muted py-4">Không tìm thấy nhiệm vụ phù hợp.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Timeline view */}
                {view === 'timeline' && (
                    <div className="glass p-4 p-lg-5 rounded-2xl">
                        <div className="timeline">
                            {filtered.map(m => (
                                <div className="t-item" key={m.id}>
                                    <div className="d-flex justify-content-between flex-wrap gap-2">
                                        <div className="d-flex align-items-center">
                                            <StatusDot s={m.status} />
                                            <span className="fw-semibold me-2">{m.start}</span>
                                            <span className="text-muted">{m.vehicle}</span>
                                        </div>
                                        <div className="text-muted small">{m.end}</div>
                                    </div>
                                    <div className="mt-1">
                                        <div className="fw-semibold">{m.type} <span className="text-muted">• {m.from} → {m.to}</span></div>
                                        <div className="d-flex align-items-center gap-3 small text-muted">
                                            <span><i className="bi bi-geo-alt"></i> {m.distance} km</span>
                                            <span><i className="bi bi-person"></i> {m.operator}</span>
                                            <span><StatusBadge s={m.status} /></span>
                                        </div>
                                        {m.notes && <div className="small mt-1">📝 {m.notes}</div>}
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="text-center text-muted">Không có mục nào</div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
