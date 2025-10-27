import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Project Map List View (React + Bootstrap + Leaflet)
 * Tone: teal/seafoam + glass (matches MedFleet screens)
 * - Split layout: left list + right map
 * - Filters: type, status, search
 * - Click list to focus marker; click marker to highlight list item
 * - Optional: Locate me; Fit bounds; Export CSV
 */
export default function ProjectMapListView() {
    // --- Load external CSS/JS (Bootstrap, Icons, Leaflet) for standalone preview
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

        const leafletCss = document.createElement("link");
        leafletCss.rel = "stylesheet";
        leafletCss.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(leafletCss);

        const bs = document.createElement("script");
        bs.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        bs.defer = true; document.body.appendChild(bs);

        const leafletJs = document.createElement("script");
        leafletJs.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        leafletJs.defer = true; document.body.appendChild(leafletJs);

        return () => {
            document.head.removeChild(css);
            document.head.removeChild(icons);
            document.head.removeChild(font);
            document.head.removeChild(leafletCss);
            document.body.removeChild(bs);
            document.body.removeChild(leafletJs);
        };
    }, []);

    // --- Theme styles
    const styles = (
        <style>{`
      :root{--teal:#4CE1C6;--ink:#0f172a}
      .page{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;background:radial-gradient(1200px 600px at 15% 10%,rgba(76,225,198,.18),transparent 60%),radial-gradient(900px 500px at 90% 5%,rgba(76,225,198,.12),transparent 60%),linear-gradient(180deg,#f6faf9 0%,#eef6f5 15%,#e9f3f1 35%,#e8f0ee 100%);min-height:100vh}
      .glass{background:rgba(255,255,255,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);box-shadow:0 10px 30px rgba(15,23,42,.08);border-radius:24px}
      .rounded-2xl{border-radius:28px}
      .btn-teal{background:var(--teal);color:#052a2b;font-weight:700;border:none}
      .btn-teal:hover{background:#39d7bf;color:#052a2b}
      .chip{display:inline-block;padding:.25rem .6rem;border-radius:999px;background:rgba(20,226,193,.15);color:#0d3b3a;font-weight:600;font-size:.85rem}
      .list-group-item.active, .list-active{background:rgba(76,225,198,.2);border-color:rgba(76,225,198,.35)}
      .leaflet-container{border-radius:24px}
      .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c}
      .map-toolbar{position:absolute; right:12px; top:12px; z-index:1000}
      .map-toolbar .btn{box-shadow:0 6px 16px rgba(15,23,42,.12)}
    `}</style>
    );

    // --- Mock data (replace with API)
    const [items, setItems] = useState(() => ([
        { id: 1, title: "Kho Dược Trung Tâm", type: "Kho", status: "Hoạt động", lat: 10.77876, lng: 106.69537, updatedAt: "2025-10-24 16:32" },
        { id: 2, title: "Khoa Nội A", type: "Khoa", status: "Hoạt động", lat: 10.77811, lng: 106.68991, updatedAt: "2025-10-25 09:10" },
        { id: 3, title: "Phòng Mổ 2", type: "Khu mổ", status: "Đang bảo trì", lat: 10.78192, lng: 106.69244, updatedAt: "2025-10-23 20:05" },
        { id: 4, title: "Trạm Sạc 1", type: "Trạm sạc", status: "Hoạt động", lat: 10.78022, lng: 106.69731, updatedAt: "2025-10-25 08:01" },
        { id: 5, title: "Khoa Nhi", type: "Khoa", status: "Tạm dừng", lat: 10.77642, lng: 106.69391, updatedAt: "2025-10-22 17:44" },
    ]));

    const [q, setQ] = useState("");
    const [type, setType] = useState("all");
    const [status, setStatus] = useState("all");
    const [activeId, setActiveId] = useState(null);

    const types = useMemo(() => Array.from(new Set(items.map(i => i.type))), [items]);
    const statuses = useMemo(() => Array.from(new Set(items.map(i => i.status))), [items]);

    const filtered = useMemo(() => items.filter(i =>
        (type === 'all' || i.type === type) &&
        (status === 'all' || i.status === status) &&
        (q === '' || i.title.toLowerCase().includes(q.toLowerCase()))
    ), [items, q, type, status]);

    // --- Map setup
    const mapRef = useRef(null);
    const markersRef = useRef({});

    useEffect(() => {
        // Wait until Leaflet is loaded
        const i = setInterval(() => {
            if (window.L && !mapRef.current) {
                const L = window.L;
                mapRef.current = L.map('map', { zoomControl: false }).setView([10.77876, 106.69537], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapRef.current);
                L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
                refreshMarkers();
                clearInterval(i);
            }
        }, 60);
        return () => clearInterval(i);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh markers whenever filtered changes
    useEffect(() => { if (mapRef.current && window.L) refreshMarkers(); }, [filtered]);

    function refreshMarkers() {
        const L = window.L; if (!L) return;
        // clear
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        const group = L.featureGroup();
        filtered.forEach(i => {
            const color = i.status === 'Hoạt động' ? '#0ea5a5' : (i.status === 'Đang bảo trì' ? '#f59e0b' : '#94a3b8');
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background:${color};width:14px;height:14px;border-radius:999px;box-shadow:0 0 0 4px rgba(0,0,0,.08)"></div>`
            });
            const m = L.marker([i.lat, i.lng], { icon }).addTo(mapRef.current);
            m.bindPopup(`<strong>${i.title}</strong><br/><span class="text-muted">${i.type} • ${i.status}</span>`);
            m.on('click', () => setActiveId(i.id));
            markersRef.current[i.id] = m; group.addLayer(m);
        });

        if (filtered.length) {
            const bounds = group.getBounds();
            if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    function focusItem(id) {
        setActiveId(id);
        const m = markersRef.current[id];
        if (m) { m.openPopup(); mapRef.current.setView(m.getLatLng(), Math.max(16, mapRef.current.getZoom())); }
    }

    function exportCSV() {
        const rows = [["ID", "Tên", "Loại", "Trạng thái", "Lat", "Lng", "Cập nhật"], ...filtered.map(i => [i.id, i.title, i.type, i.status, i.lat, i.lng, i.updatedAt])];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'project_points.csv'; a.click(); URL.revokeObjectURL(url);
    }

    function locateMe() {
        if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ định vị.');
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            const L = window.L; if (!L || !mapRef.current) return;
            const me = L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fill: true, fillOpacity: 0.9 }).addTo(mapRef.current);
            me.bindPopup('<strong>Vị trí của bạn</strong>').openPopup();
            mapRef.current.setView([latitude, longitude], 17);
        }, () => alert('Không truy cập được vị trí.'))
    }

    return (
        <div className="page">
            {styles}

            <div className="container-fluid py-3 py-lg-4">
                {/* Header */}
                <div className="container-lg">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
                        <div>
                            <h2 className="mb-0 fw-bold">Danh sách & Bản đồ dự án</h2>
                            <div className="chip mt-2">Xem vị trí kho/khoa/trạm sạc • Lọc • Tìm kiếm</div>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-secondary" onClick={exportCSV}><i className="bi bi-download me-1"></i>Xuất CSV</button>
                            <button className="btn btn-teal" onClick={locateMe}><i className="bi bi-geo-alt me-1"></i>Vị trí của tôi</button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="container-lg">
                    <div className="glass p-3 p-lg-4 rounded-2xl mb-3">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label">Tìm kiếm</label>
                                <input className="form-control" placeholder="Tên điểm…" value={q} onChange={e => setQ(e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Loại</label>
                                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Split layout */}
                <div className="container-fluid">
                    <div className="row g-3">
                        {/* List */}
                        <div className="col-lg-4 col-xl-3">
                            <div className="glass p-2 rounded-2xl h-100" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                                <ul className="list-group list-group-flush">
                                    {filtered.map(i => (
                                        <li key={i.id} className={`list-group-item d-flex align-items-start gap-2 ${activeId === i.id ? 'list-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => focusItem(i.id)}>
                                            <div className="mt-1" style={{ width: 10, height: 10, borderRadius: 999, background: i.status === 'Hoạt động' ? '#0ea5a5' : (i.status === 'Đang bảo trì' ? '#f59e0b' : '#94a3b8') }}></div>
                                            <div>
                                                <div className="fw-semibold">{i.title}</div>
                                                <div className="small text-muted">{i.type} • {i.status}</div>
                                                <div className="small text-muted">{i.lat.toFixed(5)}, {i.lng.toFixed(5)} • cập nhật {i.updatedAt}</div>
                                            </div>
                                        </li>
                                    ))}
                                    {filtered.length === 0 && <li className="list-group-item text-center text-muted">Không có mục nào</li>}
                                </ul>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="col-lg-8 col-xl-9 position-relative">
                            <div id="map" className="w-100" style={{ height: '78vh', minHeight: 480, background: '#e2f4f0' }}></div>
                            <div className="map-toolbar d-flex flex-column gap-2">
                                <button className="btn btn-light" onClick={() => { if (!window.L || !filtered.length || !mapRef.current) return; const group = window.L.featureGroup(Object.values(markersRef.current)); const b = group.getBounds(); if (b.isValid()) mapRef.current.fitBounds(b, { padding: [40, 40] }); }}><i className="bi bi-arrows-fullscreen"></i></button>
                                <button className="btn btn-light" onClick={locateMe}><i className="bi bi-geo"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
