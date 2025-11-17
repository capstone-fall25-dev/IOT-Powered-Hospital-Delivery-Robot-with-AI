import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRobots } from "@/services/robotService";
import styles from "@/assets/styles/robotFleetCards.module.css";

export default function RobotFleetCards() {
    const navigate = useNavigate();

    // Map trạng thái từ API sang badge status
    const statusMap = {
        transporting: "dangvanchuyen",
        awaiting_handover: "chobangiao",
        returning_to_station: "dangquayve",
        at_station: "taitram",
        completed: "sansang",
        charging: "sac",
        needs_attention: "chobangiao",
        offline: "khonghoatdong",
        manual_control: "dangdieukhien",
    };

    const [robots, setRobots] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRobots() {
            try {
                const data = await getAllRobots();
                const formatted = data.map((r) => ({
                    id: r.id,
                    code: r.code,
                    name: r.name,
                    battery: r.batteryPercent ?? 0,
                    mission: r.progressOverallPct ?? 0,
                    status: statusMap[r.status] || "sansang",
                }));
                setRobots(formatted);
                setLoading(false);
            } catch (err) {
                console.error("Lỗi khi load robots:", err);
                setLoading(false);
            }
        }
        fetchRobots();
    }, []);

    const filtered = useMemo(
        () =>
            robots.filter(
                (r) =>
                    (status === "all" || r.status === status) &&
                    r.code.toLowerCase().includes(q.toLowerCase())
            ),
        [robots, q, status]
    );

    function statusBadge(s) {
        const badges = {
            chobangiao: { class: styles.badgeWaiting, text: "Chờ bàn giao" },
            dangvanchuyen: { class: styles.badgeTransporting, text: "Đang vận chuyển" },
            dangquayve: { class: styles.badgeReturning, text: "Đang quay về" },
            taitram: { class: styles.badgeAtStation, text: "Tại trạm" },
            sac: { class: styles.badgeCharging, text: "Đang sạc" },
            sansang: { class: styles.badgeReady, text: "Sẵn sàng" },
            khonghoatdong: { class: styles.badgeOffline, text: "Không hoạt động" },
            dangdieukhien: { class: styles.badgeManual, text: "Điều khiển thủ công" },
        };

        const badge = badges[s] || { class: styles.badgeReady, text: "Trạng thái khác" };
        return <span className={`${styles.badgeStatus} ${badge.class}`}>{badge.text}</span>;
    }

    function getBatteryIcon(battery) {
        if (battery >= 80) return "bi-battery-full";
        if (battery >= 60) return "bi-battery-half";
        if (battery >= 40) return "bi-battery";
        if (battery >= 20) return "bi-battery-half";
        return "bi-battery";
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

    return (
        <div className={styles.page}>
            <div className="container-xl py-4">

                {/* =================== HEADER =================== */}
                <div className={styles.headerSection}>
                    <h5 className={styles.pageTitle}>
                        <i className="bi bi-robot me-2" style={{ color: 'var(--teal-dark)' }}></i>
                        Đội Robot Y Tế
                    </h5>

                    <div className={styles.headerActions}>
                        <input
                            className={styles.searchInput}
                            placeholder="Tìm robot (RB-xxx)"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />

                        <select
                            className={styles.filterSelect}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="chobangiao">Chờ bàn giao</option>
                            <option value="dangvanchuyen">Đang vận chuyển</option>
                            <option value="dangquayve">Đang quay về</option>
                            <option value="taitram">Tại trạm</option>
                            <option value="sac">Đang sạc</option>
                            <option value="sansang">Sẵn sàng</option>
                            <option value="khonghoatdong">Không hoạt động</option>
                            <option value="dangdieukhien">Điều khiển thủ công</option>
                        </select>

                        <button 
                            className={styles.btnTeal}
                            onClick={() => navigate(`/createRobot`)}
                        >
                            <i className="bi bi-plus-lg me-1"></i>
                            Thêm robot
                        </button>
                    </div>
                </div>

                {/* =================== ROBOT CARDS =================== */}
                <div className="row g-3">
                    {filtered.map((r) => (
                        <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={r.id}>
                            <div
                                className={styles.robotCard}
                                onClick={() => navigate(`/robot-detail/${r.id}`)}
                            >
                                <div className={styles.robotCode}>
                                    <i className="bi bi-cpu me-2" style={{ color: 'var(--teal-dark)' }}></i>
                                    {r.code}
                                </div>

                                <div className={styles.robotInfo}>
                                    <i className={getBatteryIcon(r.battery)}></i>
                                    <span>Ắc quy: <strong>{r.battery}%</strong></span>
                                </div>

                                {r.mission > 0 && (
                                    <>
                                        <div className={styles.robotMission}>
                                            <i className="bi bi-graph-up me-1" style={{ color: 'var(--teal-dark)' }}></i>
                                            Tiến trình: {r.mission}%
                                        </div>

                                        <div className={styles.progressContainer}>
                                            <div 
                                                className={styles.progressBar}
                                                style={{ width: `${r.mission}%` }}
                                            ></div>
                                        </div>
                                    </>
                                )}

                                {statusBadge(r.status)}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-12">
                            <div className={styles.emptyState}>
                                <i className="bi bi-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                Không có robot phù hợp với bộ lọc
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}