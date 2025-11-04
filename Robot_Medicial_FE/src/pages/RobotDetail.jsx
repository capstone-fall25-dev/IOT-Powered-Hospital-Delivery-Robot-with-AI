import { useEffect, useState } from "react";

/**
 * MedFleet — Robot Detail Screen (React + Bootstrap)
 * Tone: teal/seafoam + glass; matches other screens
 */
export default function RobotDetail() {
    // Load Bootstrap/Icons/Fonts for standalone preview
    useEffect(() => {
        const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"; document.head.appendChild(css);
        const icons = document.createElement("link"); icons.rel = "stylesheet"; icons.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"; document.head.appendChild(icons);
        const font = document.createElement("link"); font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"; document.head.appendChild(font);
        const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"; js.defer = true; document.body.appendChild(js);
        return () => { document.head.removeChild(css); document.head.removeChild(icons); document.head.removeChild(font); document.body.removeChild(js); };
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
      .badge-soft{background:rgba(20,226,193,.18);color:#0b3e3c;border:1px solid rgba(20,226,193,.35)}
      .thumb{height:120px;object-fit:cover;border-radius:12px}
      .cover{width:88px;height:88px;border-radius:12px;object-fit:cover}
      .kv{display:grid;grid-template-columns:130px 1fr; gap:10px}
      @media (max-width: 576px){.kv{grid-template-columns:1fr}}
    `}</style>
    );

    const [robot] = useState({
        id: 'RB-A1-001',
        name: 'Robot A1',
        status: 'Đang hoạt động',
        type: 'Xe chở thuốc',
        location: 'Khu Nội - Tầng 3',
        connectivity: 'Online',
        battery: 78,
        avatar: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?q=80&w=400&auto=format&fit=crop'
    });

    const activities = [
        { time: '10:30', text: 'Giao thuốc cho phòng 305', state: 'done' },
        { time: '09:45', text: 'Nạp pin', state: 'done' },
        { time: '09:20', text: 'Chờ nhiệm vụ', state: 'pending' },
    ];

    const gallery = [
        'https://images.unsplash.com/photo-1617087170983-3e7d82b7cef7?q=80&w=900&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581091215367-59ab6c832c96?q=80&w=900&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581091876519-1e7e9c8106fd?q=80&w=900&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581093588401-16ec1f3c9233?q=80&w=900&auto=format&fit=crop'
    ];

    function statusBadge(s) {
        if (s === 'Đang hoạt động') return <span className="badge bg-success-subtle text-success border">Đang hoạt động</span>;
        if (s === 'Tạm dừng') return <span className="badge bg-secondary-subtle text-secondary border">Tạm dừng</span>;
        return <span className="badge badge-soft">{s}</span>;
    }

    return (
        <div className="page">
            {styles}
            <div className="container-lg py-4">
                <div className="glass rounded-2xl p-3 p-md-4">
                    {/* Header */}
                    <div className="d-flex align-items-start gap-3">
                        <img className="cover" src={robot.avatar} alt={robot.name} />
                        <div className="flex-grow-1">
                            <h4 className="mb-1 title">{robot.name}</h4>
                            <div className="text-muted small">{robot.id}</div>
                            <div className="mt-1">{statusBadge(robot.status)}</div>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-teal rounded-pill">Điều khiển robot</button>
                        </div>
                    </div>

                    {/* Detail + Activity */}
                    <div className="row g-4 mt-3">
                        <div className="col-lg-7">
                            <div className="kv">
                                <div className="text-muted">Loại robot</div>
                                <div className="fw-semibold">{robot.type}</div>
                                <div className="text-muted">Vị trí hiện tại</div>
                                <div className="fw-semibold">{robot.location}</div>
                                <div className="text-muted">Kết nối</div>
                                <div className="fw-semibold">{robot.connectivity}</div>
                                <div className="text-muted">Pin</div>
                                <div>
                                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
                                        <div className={`progress-bar ${robot.battery < 30 ? 'bg-danger' : robot.battery < 60 ? 'bg-warning' : ''}`} style={{ width: `${robot.battery}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary mt-3 rounded-pill"><i className="bi bi-broadcast me-1"></i> Định vị nhanh</button>
                        </div>

                        <div className="col-lg-5">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6 className="mb-0 fw-bold">Lịch sử hoạt động</h6>
                            </div>
                            <ul className="list-group">
                                {activities.map((a, i) => (
                                    <li key={i} className="list-group-item d-flex align-items-center justify-content-between">
                                        <div>
                                            <div className="fw-semibold">{a.text}</div>
                                            <div className="text-muted small">{a.time}</div>
                                        </div>
                                        {a.state === 'done' ? (
                                            <span className="badge bg-success-subtle text-success border">Hoàn thành</span>
                                        ) : (
                                            <span className="badge bg-warning-subtle text-warning border">Đang xử lý</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Gallery */}
                    <div className="mt-4">
                        <h6 className="fw-bold mb-2">Hình ảnh hoạt động</h6>
                        <div className="row g-3">
                            {gallery.map((src, i) => (
                                <div className="col-6 col-md-3" key={i}>
                                    <img className="thumb w-100" src={src} alt={`img-${i}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}