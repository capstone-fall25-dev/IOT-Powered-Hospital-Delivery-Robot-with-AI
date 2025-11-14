import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/assets/styles/robotLiveConsole.module.css";

export default function RobotLiveConsole() {
    const [robot] = useState({ id: "RB-001", battery: 75, status: "Cảnh Báo" });
    const [channel, setChannel] = useState("");
    const [msg, setMsg] = useState("");
    const [live, setLive] = useState(true);
    const [remote, setRemote] = useState(false);
    const [activeKey, setActiveKey] = useState("");
    const [logs, setLogs] = useState([
        { time: "13:42:47", text: "Hệ thống khởi động. Robot sẵn sàng.", level: "ok" },
        { time: "13:35:20", text: "AI nhận diện xử lý tình huống. Yêu cầu hỗ trợ.", level: "warn" },
        { time: "13:25:56", text: "Phát hiện: “Robot đang đến, vui lòng tránh đường”.", level: "ok" },
    ]);

    const [micSupported] = useState(() => !!(navigator.mediaDevices && window.MediaRecorder));
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recErr, setRecErr] = useState(null);
    const [level, setLevel] = useState(0);
    const [timer, setTimer] = useState(0);
    const mediaRef = useRef(null);
    const recRef = useRef(null);
    const rafRef = useRef();
    const tRef = useRef();

    function stopMeter() { if (rafRef.current) cancelAnimationFrame(rafRef.current); }
    function startMeter(stream) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            setLevel(Math.min(100, Math.round(rms * 160)));
            rafRef.current = requestAnimationFrame(loop);
        };
        loop();
    }

    async function toggleMic() {
        if (recording) { stopMic(); return; }
        setRecErr(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRef.current = stream;
            startMeter(stream);
            const chunks = [];
            const rec = new MediaRecorder(stream);
            rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = () => {
                stopMeter();
                const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(URL.createObjectURL(blob));
            };
            rec.start();
            recRef.current = rec;
            setRecording(true);
            setTimer(0);
            tRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
        } catch (err) {
            setRecErr(err?.message || "Không truy cập được microphone");
            setRecording(false);
        }
    }

    function stopMic() {
        recRef.current?.stop();
        mediaRef.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (tRef.current) clearInterval(tRef.current);
    }

    function send() {
        if (msg.trim() === "") return;
        setLogs([{ time: new Date().toLocaleTimeString(), text: `Phát thanh: ${msg}`, level: "ok" }, ...logs]);
        setMsg("");
    }

    function sendVoice() {
        if (!audioUrl) return;
        setLogs([{ time: new Date().toLocaleTimeString(), text: `Phát thanh (giọng nói) – ${timer}s`, level: "ok" }, ...logs]);
    }

    const statusBadge = useMemo(() => {
        if (robot.status === "Sẵn sàng")
            return <span className={`${styles.badge} ${styles.success}`}>Sẵn sàng</span>;
        if (robot.status === "Đang xử lý")
            return <span className={`${styles.badge} ${styles.warning}`}>Đang xử lý</span>;
        return <span className={`${styles.badge} ${styles.danger}`}>Cảnh báo</span>;
    }, [robot.status]);

    useEffect(() => {
        if (!remote) return;
        const down = (e) => {
            const k = e.key.toLowerCase();
            if (["w", "a", "s", "d"].includes(k)) {
                e.preventDefault();
                setActiveKey(k);
                const action = k === "w" ? "Tiến" : k === "s" ? "Lùi" : k === "a" ? "Trái" : "Phải";
                setLogs((l) => [{ time: new Date().toLocaleTimeString(), text: `Điều khiển thủ công: ${action}`, level: "ok" }, ...l]);
            }
        };
        const up = (e) => { const k = e.key.toLowerCase(); if (["w", "a", "s", "d"].includes(k)) setActiveKey(""); };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, [remote]);

    function toggleRemote() {
        setRemote((v) => !v);
        setLive(false);
    }

    return (
        <div className={styles.page}>
            <div className="container-xxl py-3 py-lg-4">
                <div className="row g-3">

                    {/* LEFT PANEL */}
                    <div className="col-lg-3">
                        <div className={`${styles.glass} p-3 p-lg-3 h-100`}>
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="fw-bold">{robot.id}</div>
                                <button className="btn btn-sm btn-outline-secondary rounded-pill">Quay Lại</button>
                            </div>

                            <div className={styles.smallLabel}>Trạng thái</div>
                            <div className="d-flex align-items-center gap-2 mb-2">{statusBadge}</div>
                            <div className="progress" role="progressbar" aria-label="battery" aria-valuemin={0} aria-valuemax={100}>
                                <div className={`progress-bar ${robot.battery < 30 ? 'bg-danger' : robot.battery < 60 ? 'bg-warning' : ''}`} style={{ width: `${robot.battery}%` }}>Ắc quy</div>
                            </div>

                            {/* Phát thanh */}
                            <div className="mt-3">
                                <div className={`${styles.smallLabel} fw-semibold mb-1`}>Phát Thanh</div>
                                <div className="input-group">
                                    <select className="form-select" value={channel} onChange={e => setChannel(e.target.value)} style={{ maxWidth: 200 }}>
                                        <option value="">Chọn thông báo nhanh</option>
                                        <option>Vui lòng tránh đường</option>
                                        <option>Đang vận chuyển mẫu</option>
                                        <option>Xin cảm ơn</option>
                                    </select>
                                    <button className="btn btn-outline-secondary" onClick={() => { if (channel) setMsg(channel); }} title="Áp dụng mẫu"><i className="bi bi-clipboard-check"></i></button>
                                </div>
                                <div className="input-group mt-2">
                                    <input className="form-control" placeholder="Hoặc nhập thông báo..." value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
                                    <button className={`${styles.btnTeal} btn`} onClick={send}>Gửi</button>
                                </div>

                                {/* Mic */}
                                <div className="mt-3 p-2 border rounded-3">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="fw-semibold"><i className="bi bi-mic-fill me-1"></i>Mở Mic Trực Tiếp</div>
                                        {!micSupported && <span className="badge bg-secondary-subtle text-secondary border">Không hỗ trợ</span>}
                                    </div>
                                    <div className="d-flex align-items-center gap-2 mt-2">
                                        <button className={`btn ${recording ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={toggleMic} disabled={!micSupported}>
                                            <i className={`bi ${recording ? 'bi-mic-mute' : 'bi-mic'}`}></i> {recording ? 'Dừng' : 'Bắt đầu'}
                                        </button>
                                        <div className={styles.vu}><span style={{ width: `${level}%` }}></span></div>
                                        <span className="text-muted small" style={{ minWidth: 50 }}>{recording ? `${timer}s` : '0s'}</span>
                                    </div>
                                    {recErr && <div className="text-danger small mt-2">{recErr}</div>}
                                    {audioUrl && !recording && (
                                        <div className="d-flex align-items-center gap-2 mt-2">
                                            <audio src={audioUrl} controls className="flex-grow-1" />
                                            <button className={`${styles.btnTeal} btn btn-sm`} onClick={sendVoice}><i className="bi bi-send-fill me-1"></i>Phát</button>
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); }}><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </div>

                                {/* Chế độ lái */}
                                <div className="mt-3">
                                    <div className={`${styles.smallLabel} fw-semibold mb-1`}>Chế Độ Lái</div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="live" checked={live} onChange={(e) => setLive(e.target.checked)} />
                                        <label className="form-check-label" htmlFor="live">Chuyển sang chế độ {live ? 'Tự động' : 'Lái từ xa'}</label>
                                    </div>
                                    <button className="btn btn-outline-primary w-100 mt-2 rounded-pill" onClick={toggleRemote}>{remote ? 'Tắt điều khiển thủ công' : 'Chuyển sang chế độ Lái từ xa'}</button>

                                    {remote && (
                                        <div className="mt-3 p-3 border rounded-3">
                                            <div className="fw-semibold mb-2">Điều khiển thủ công (WASD)</div>
                                            <div className={styles.pad}>
                                                <div></div>
                                                <div className={`${styles.key} ${activeKey === 'w' ? styles.active : ''}`}>W</div>
                                                <div></div>
                                                <div className={`${styles.key} ${activeKey === 'a' ? styles.active : ''}`}>A</div>
                                                <div className={`${styles.key} ${activeKey === 's' ? styles.active : ''}`}>S</div>
                                                <div className={`${styles.key} ${activeKey === 'd' ? styles.active : ''}`}>D</div>
                                            </div>
                                            <div className={`${styles.hint} text-center mt-2`}>Nhấn các phím W/A/S/D để Tiến / Trái / Lùi / Phải</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CENTER PANEL */}
                    <div className="col-lg-6">
                        <div className={`${styles.glass} p-3 mb-3`}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="d-flex align-items-center gap-2"><span className={styles.chip}>LIVE</span><span className={styles.panelTitle}>Camera Trực Tiếp</span></div>
                                <div className="btn-group btn-group-sm">
                                    <button className="btn btn-outline-secondary"><i className="bi bi-aspect-ratio"></i></button>
                                    <button className="btn btn-outline-secondary"><i className="bi bi-camera-video"></i></button>
                                </div>
                            </div>
                            <div className={styles.videoBox}>Camera Feed</div>
                        </div>
                        <div className={`${styles.glass} p-3`}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className={styles.panelTitle}>Bản Đồ Bệnh Viện</div>
                                <div className="small text-muted">Đích đến: Khoa Dược (4/5) • Vị trí hiện tại: Hành lang tầng 1</div>
                            </div>
                            <div className={styles.mapBox}>Map Placeholder</div>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="col-lg-3">
                        <div className={`${styles.glass} p-3 h-100`}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className={styles.panelTitle}>Nhật Ký Hệ Thống</div>
                                <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setLogs([])}>Xóa hết</button>
                            </div>
                            <ul className="list-group list-group-flush">
                                {logs.map((l, idx) => (
                                    <li key={idx} className={`list-group-item d-flex align-items-start justify-content-between ${l.level === 'ok' ? styles.logOk : l.level === 'warn' ? styles.logWarn : styles.logErr}`}>
                                        <div>
                                            <div className="small text-muted">{l.time}</div>
                                            <div className="fw-semibold">{l.text}</div>
                                        </div>
                                        <div className="btn-group btn-group-sm align-self-center">
                                            <button className="btn btn-outline-secondary" title="Đánh dấu đã xem"><i className="bi bi-check2"></i></button>
                                            <button className="btn btn-outline-secondary" title="Bỏ qua"><i className="bi bi-x"></i></button>
                                        </div>
                                    </li>
                                ))}
                                {logs.length === 0 && <li className="list-group-item text-center text-muted">Chưa có log.</li>}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
