import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import {
  getTaskStatusReport,
  getTaskTimelineReport,
  exportReportExcel
} from "../services/reportService";
import { getAllTasks } from "../services/taskService";

import styles from "@/assets/styles/reportDashboard.module.css";

/* ============================
   BẢN DỊCH TIẾNG VIỆT CHUẨN 
============================ */
const STATUS_LABELS = {
  pending: "Chờ xử lý",
  in_progress: "Đang thực hiện",
  awaiting_handover: "Chờ giao/nhận",
  returning: "Đang quay về trạm",
  at_station: "Đang ở trạm",
  completed: "Hoàn thành",
  delivered: "Đã giao",
  canceled: "Đã hủy",
  failed: "Thất bại",
  skipped: "Bỏ qua",

  // Robot status
  transporting: "Đang vận chuyển",
  returning_to_station: "Đang quay về trạm",
  charging: "Đang sạc pin",
  needs_attention: "Cần kiểm tra",
  manual_control: "Điều khiển thủ công",
  offline: "Ngoại tuyến"
};

// Helper
const toVietnamese = (status) => STATUS_LABELS[status] || "Không xác định";

/* ============================
   MAPPING MÀU THEO STATUS
============================ */
const STATUS_COLORS = {
  pending: "#f59e0b",            // amber
  in_progress: "#3b82f6",        // blue
  awaiting_handover: "#8b5cf6",  // purple
  returning: "#1e3a8a",          // navy
  at_station: "#6b7280",         // gray
  completed: "#10b981",          // green
  delivered: "#10b981",          // green
  canceled: "#ef4444",           // red
  failed: "#ef4444",             // red
  skipped: "#ec4899"             // pink
};

// Fallback cho biểu đồ timeline
const COLORS = Object.values(STATUS_COLORS);

const ExcelIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 512 512"
  >
    <style type="text/css">
      {`.st0{fill:#185C37;}
        .st1{fill:#21A366;}
        .st2{fill:#107C41;}
        .st3{opacity:0.1;}
        .st4{opacity:0.2;}
        .st5{fill:url(#SVGID_1_);}
        .st6{fill:#FFFFFF;}
        .st7{fill:#33C481;}`}
    </style>

    <path className="st0" d="M321.49,244.09l-202.42-35.72v263.94c0,12.05,9.77,21.83,21.83,21.83l0,0h349.28 c12.05,0,21.83-9.77,21.83-21.83l0,0v-97.24L321.49,244.09z"/>
    <path className="st1" d="M321.49,17.86H140.9c-12.05,0-21.83,9.77-21.83,21.83l0,0v97.24L321.49,256l107.16,35.72L512,256V136.93 L321.49,17.86z"/>
    <path className="st2" d="M119.07,136.93h202.42V256H119.07V136.93z"/>
    <path className="st3" d="M263.94,113.12H119.07v297.67h144.87c12.04-0.04,21.79-9.79,21.83-21.83V134.94 C285.73,122.9,275.98,113.16,263.94,113.12z"/>
    <path className="st4" d="M252.04,125.02H119.07V422.7h132.97c12.04-0.04,21.79-9.79,21.83-21.83V146.85 C273.82,134.81,264.07,125.06,252.04,125.02z"/>
    <path className="st4" d="M252.04,125.02H119.07v273.86h132.97c12.04-0.04,21.79-9.79,21.83-21.83V146.85 C273.82,134.81,264.07,125.06,252.04,125.02z"/>
    <path className="st4" d="M240.13,125.02H119.07v273.86h121.06c12.04-0.04,21.79-9.79,21.83-21.83V146.85 C261.91,134.81,252.17,125.06,240.13,125.02z"/>

    <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="45.5065" y1="-1464.0308" x2="216.4467" y2="-1167.9695" gradientTransform="matrix(1 0 0 1 0 1572)">
      <stop offset="0" style={{ stopColor: "#18884F" }} />
      <stop offset="0.5" style={{ stopColor: "#117E43" }} />
      <stop offset="1" style={{ stopColor: "#0B6631" }} />
    </linearGradient>

    <path className="st5" d="M21.83,125.02h218.3c12.05,0,21.83,9.77,21.83,21.83v218.3c0,12.05-9.77,21.83-21.83,21.83H21.83 C9.77,386.98,0,377.21,0,365.15v-218.3C0,134.79,9.77,125.02,21.83,125.02z"/>
    <path className="st6" d="M67.6,326.94l45.91-71.14l-42.07-70.75h33.84l22.96,45.25c2.12,4.3,3.57,7.49,4.36,9.6h0.3 c1.51-3.43,3.1-6.76,4.76-9.99l24.54-44.83h31.07l-43.14,70.33l44.23,71.54H161.3l-26.52-49.66c-1.25-2.11-2.31-4.33-3.17-6.63 h-0.39c-0.78,2.25-1.81,4.41-3.07,6.43l-27.3,49.87L67.6,326.94L67.6,326.94z"/>
    <path className="st7" d="M490.17,17.86H321.49v119.07H512V39.69C512,27.63,502.23,17.86,490.17,17.86L490.17,17.86z"/>
    <path className="st2" d="M321.49,256H512v119.07H321.49V256z"/>
  </svg>
);

export default function ReportDashboard() {
  const [statusData, setStatusData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [tasks, setTasks] = useState([]);

  const [statusFrom, setStatusFrom] = useState("");
  const [statusTo, setStatusTo] = useState("");
  const [timelineFrom, setTimelineFrom] = useState("");
  const [timelineTo, setTimelineTo] = useState("");

  /* ============================
      LOAD API
  ============================ */
  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getTaskStatusReport(statusFrom || null, statusTo || null);
      setStatusData(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const data = await getTaskTimelineReport(timelineFrom || null, timelineTo || null);
      setTimelineData(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  /* ============================
      LOAD TASKS FOR STATS
  ============================ */
  const loadTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTimeline();
    loadTasks();
  }, []);

  /* ============================
      CHUẨN HOÁ DỮ LIỆU BAR CHART
  ============================ */
  const prepareStatusData = () => {
    if (!statusData.length) return [];
    const rows = statusData
      .filter(r => r.Robot !== "TỔNG CỘNG")
      .map(r => ({
        robot: r.Robot || "Không có",
        ...Object.fromEntries(
          Object.entries(r).filter(([k]) => k !== "Robot" && k !== "Tổng task")
        )
      }));

    const total = statusData.find(r => r.Robot === "TỔNG CỘNG");
    if (total) {
      const { Robot, "Tổng task": _, ...rest } = total;
      rows.push({ robot: "TỔNG CỘNG", ...rest, isTotal: true });
    }
    return rows;
  };

  /* ============================
      PIE CHART DATA
  ============================ */
  const preparePieData = () => {
    const totalRow = statusData.find(r => r.Robot === "TỔNG CỘNG");
    if (!totalRow) return [];

    return Object.entries(totalRow)
      .filter(([k]) => k !== "Robot" && k !== "Tổng task")
      .map(([name, value]) => ({
        name: toVietnamese(name),
        color: STATUS_COLORS[name],
        value: Number(value) || 0
      }));
  };

  /* ============================
      TIMELINE DATA
  ============================ */
  const prepareTimelineData = () => {
    if (!timelineData.length) return [];
    const rows = timelineData
      .filter(r => r.Robot !== "TỔNG CỘNG")
      .map(r => ({
        robot: r.Robot || "Không có",
        ...Object.fromEntries(
          Object.entries(r).filter(([k]) => k !== "Robot" && k !== "Tổng task")
        )
      }));

    const total = timelineData.find(r => r.Robot === "TỔNG CỘNG");
    if (total) {
      const { Robot, "Tổng task": _, ...rest } = total;
      rows.push({ robot: "TỔNG CỘNG", ...rest, isTotal: true });
    }
    return rows;
  };

  /* ============================ */
  const statusChartData = prepareStatusData();
  const pieData = preparePieData();
  const timelineChartData = prepareTimelineData();

  const statusKeys = statusData.length
    ? Object.keys(statusData[0]).filter(k => k !== "Robot" && k !== "Tổng task")
    : [];
  const dateKeys = timelineData.length
    ? Object.keys(timelineData[0]).filter(k => k !== "Robot" && k !== "Tổng task")
    : [];

  /* ============================
      CUSTOM X-AXIS
  ============================ */
  const CustomXAxisTick = ({ x, y, payload }) => {
    const isTotal = payload.value === "TỔNG CỘNG";
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          dy={16}
          textAnchor="end"
          fill={isTotal ? "#b45309" : "#475569"}
          fontWeight={isTotal ? "900" : "600"}
          fontSize={isTotal ? 18 : 13}
          transform="rotate(-50)"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  /* ============================
      TASK STATISTICS DATA
  ============================ */
  const taskStatsData = [
    {
      label: "Hoàn thành",
      value: tasks.filter((t) => t.status === "completed").length,
      icon: "check-circle-fill",
      color: "#16a34a", // Green
    },
    {
      label: "Bị hủy",
      value: tasks.filter((t) => t.status === "canceled").length,
      icon: "x-circle-fill",
      color: "#dc2626", // Red
    },
    {
      label: "Đang chạy",
      value: tasks.filter((t) => t.status === "in_progress").length,
      icon: "play-circle-fill",
      color: "#0891b2", // Teal
    },
  ];

  /* ========================================================
      FULL UI
  ======================================================== */
  return (
    <div className={styles.page}>
      <div className="max-w-7xl mx-auto px-4">

        {/* PAGE HEADER */}
        <div className="mb-8 text-center">
          <h1 className={styles.pageTitle}>Báo Cáo Task Robot</h1>
          <p className={styles.pageSubtitle}>
            Thống kê số lượng task theo trạng thái và theo ngày.
          </p>
        </div>

        {/* ========================= THỐNG KÊ NHIỆM VỤ ========================= */}
        <div className="mb-8">
          <h5 className="mb-4" style={{ fontSize: "1.25rem", fontWeight: "600"}}>
            <i className="bi bi-bar-chart-line me-2"></i>
            Thống Kê Nhiệm Vụ
          </h5>

          <div className="row g-3 mb-4">
            {taskStatsData.map((stat, i) => (
              <div className="col-12 col-md-4" key={i}>
                <div className={styles.glass} style={{ padding: "1.5rem", borderRadius: "12px" }}>
                  <div className="d-flex align-items-center">
                    <div style={{ 
                      fontSize: "2.5rem", 
                      color: stat.color,
                      marginRight: "1rem"
                    }}>
                      <i className={`bi bi-${stat.icon}`}></i>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: "0.875rem", 
                        color: "#64748b",
                        marginBottom: "0.25rem"
                      }}>
                        {stat.label}
                      </div>
                      <h3 style={{ 
                        fontSize: "2rem", 
                        fontWeight: "700",
                        margin: 0,
                        color: "#0f172a"
                      }}>
                        {stat.value}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LAYOUT 2 CỘT */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* ====================================== */}
          {/* LEFT COLUMN - STATUS */}
          {/* ====================================== */}
          <div className={styles.glass}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Task Theo Trạng Thái</h2>
                <p className={styles.cardSubtitle}>
                  Phân bố trạng thái task theo từng robot.
                </p>
              </div>

              <button
                onClick={() =>
                  exportReportExcel("status", statusFrom || undefined, statusTo || undefined)
                }
                className={styles.btnExportIcon}
                title="Xuất file Excel"
              >
                <ExcelIcon />
              </button>
            </div>

            <div className={styles.cardBody}>

              {/* FILTER */}
              <div className={styles.filterRow}>
                <div>
                  <label className={styles.filterLabel}>Từ ngày</label>
                  <input
                    type="date"
                    value={statusFrom}
                    onChange={e => setStatusFrom(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div>
                  <label className={styles.filterLabel}>Đến ngày</label>
                  <input
                    type="date"
                    value={statusTo}
                    onChange={e => setStatusTo(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterButtonWrap}>
                  <button onClick={loadStatus} className={styles.btnFilter}>
                    Lọc ngay
                  </button>
                </div>
              </div>

              {/* CHARTS */}
              <div className={styles.chartRow}>

                {/* PIE */}
                <div className={styles.pieContainer}>
                  <h3 className={styles.sectionTitle}>Tỷ lệ theo trạng thái</h3>

                  {loadingStatus ? (
                    <div className={styles.loadingBox}>
                      <span className={styles.loadingText}>Đang tải...</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={115}
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.color}
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          ))}
                        </Pie>

                        <Tooltip formatter={(v, name) => [`${v}`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* BAR */}
                <div className={styles.barContainer}>
                  <h3 className={styles.sectionTitle}>Số lượng theo robot</h3>

                  {loadingStatus ? (
                    <div className={styles.loadingBox}>
                      <span className={styles.loadingText}>Đang tải...</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
                        <XAxis dataKey="robot" tick={<CustomXAxisTick />} height={120} />
                        <YAxis />

                        <Tooltip formatter={(v, name) => [`${v}`, toVietnamese(name)]} />
                        <Legend formatter={(value) => toVietnamese(value)} />

                        {statusKeys.map((k) => (
                          <Bar
                            key={k}
                            dataKey={k}
                            fill={STATUS_COLORS[k]}
                            radius={[10, 10, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ====================================== */}
          {/* RIGHT COLUMN - TIMELINE */}
          {/* ====================================== */}
          <div className={styles.glass}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Task Theo Ngày</h2>
                <p className={styles.cardSubtitle}>
                  Lịch sử số lượng task hoàn thành theo từng ngày.
                </p>
              </div>

              <button
                onClick={() =>
                  exportReportExcel("timeline", timelineFrom || undefined, timelineTo || undefined)
                }
                className={styles.btnExportIcon}
                title="Xuất file Excel"
              >
                <ExcelIcon />
              </button>
            </div>

            <div className={styles.cardBody}>

              {/* FILTER */}
              <div className={styles.filterRow}>
                <div>
                  <label className={styles.filterLabel}>Từ ngày</label>
                  <input
                    type="date"
                    value={timelineFrom}
                    onChange={e => setTimelineFrom(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div>
                  <label className={styles.filterLabel}>Đến ngày</label>
                  <input
                    type="date"
                    value={timelineTo}
                    onChange={e => setTimelineTo(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterButtonWrap}>
                  <button onClick={loadTimeline} className={styles.btnFilter}>
                    Lọc ngay
                  </button>
                </div>
              </div>

              {/* LINE CHART */}
              <div className={styles.lineWrapper}>
                <h3 className={styles.sectionTitle}>Biểu đồ số task theo ngày</h3>

                {loadingTimeline ? (
                  <div className={styles.loadingBox}>
                    <span className={styles.loadingText}>Đang tải biểu đồ...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={440}>
                    <LineChart
                      data={timelineChartData}
                      margin={{ top: 20, right: 24, left: 0, bottom: 120 }}
                    >
                      <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />

                      <XAxis dataKey="robot" tick={<CustomXAxisTick />} height={120} />
                      <YAxis />

                      <Tooltip formatter={(v, name) => [`${v}`, toVietnamese(name)]} />
                      <Legend formatter={(value) => toVietnamese(value)} />

                      {dateKeys.slice(0, 10).map((d, i) => (
                        <Line
                          key={d}
                          type="monotone"
                          dataKey={d}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 7 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
