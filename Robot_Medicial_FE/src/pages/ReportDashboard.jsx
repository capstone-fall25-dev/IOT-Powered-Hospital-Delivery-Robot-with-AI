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

import styles from "@/assets/styles/reportDashboard.module.css";

const COLORS = ["#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#3b82f6", "#ec4899"];

export default function ReportDashboard() {
  const [statusData, setStatusData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  const [statusFrom, setStatusFrom] = useState("");
  const [statusTo, setStatusTo] = useState("");
  const [timelineFrom, setTimelineFrom] = useState("");
  const [timelineTo, setTimelineTo] = useState("");

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getTaskStatusReport(statusFrom || null, statusTo || null);
      setStatusData(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingStatus(false); }
  };

  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const data = await getTaskTimelineReport(timelineFrom || null, timelineTo || null);
      setTimelineData(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTimeline(false); }
  };

  useEffect(() => {
    loadStatus();
    loadTimeline();
  }, []);

  // Dữ liệu Bar Chart + TỔNG CỘNG
  const prepareStatusData = () => {
    if (!statusData.length) return [];
    const rows = statusData.filter(r => r.Robot !== "TỔNG CỘNG").map(r => ({
      robot: r.Robot || "N/A",
      ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "Robot" && k !== "Tổng task"))
    }));
    const total = statusData.find(r => r.Robot === "TỔNG CỘNG");
    if (total) {
      const { Robot, "Tổng task": _, ...rest } = total;
      rows.push({ robot: "TỔNG CỘNG", ...rest, isTotal: true });
    }
    return rows;
  };

  // Dữ liệu Pie Chart (tỷ lệ %)
  const preparePieData = () => {
    const totalRow = statusData.find(r => r.Robot === "TỔNG CỘNG");
    if (!totalRow) return [];
    return Object.entries(totalRow)
      .filter(([k]) => k !== "Robot" && k !== "Tổng task")
      .map(([name, value]) => ({ name, value: Number(value) || 0 }));
  };

  // Dữ liệu Line Chart + TỔNG CỘNG
  const prepareTimelineData = () => {
    if (!timelineData.length) return [];
    const rows = timelineData.filter(r => r.Robot !== "TỔNG CỘNG").map(r => ({
      robot: r.Robot || "N/A",
      ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "Robot" && k !== "Tổng task"))
    }));
    const total = timelineData.find(r => r.Robot === "TỔNG CỘNG");
    if (total) {
      const { Robot, "Tổng task": _, ...rest } = total;
      rows.push({ robot: "TỔNG CỘNG", ...rest, isTotal: true });
    }
    return rows;
  };

  const statusChartData = prepareStatusData();
  const pieData = preparePieData();
  const timelineChartData = prepareTimelineData();

  const statusKeys = statusData.length ? Object.keys(statusData[0]).filter(k => k !== "Robot" && k !== "Tổng task") : [];
  const dateKeys = timelineData.length ? Object.keys(timelineData[0]).filter(k => k !== "Robot" && k !== "Tổng task") : [];

  const CustomXAxisTick = ({ x, y, payload }) => {
    const isTotal = payload.value === "TỔNG CỘNG";
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill={isTotal ? "#d97706" : "#475569"}
          fontWeight={isTotal ? "900" : "600"} fontSize={isTotal ? 18 : 13}
          transform="rotate(-50)">
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className={styles.page}>
      <div className="max-w-7xl mx-auto px-6">

       
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">

          {/* CARD 1: TRẠNG THÁI (PIE + BAR) */}
          <div className={styles.glass}>
            <div className={styles.headerStatus}>
              <div className="flex justify-between items-center">
                <h2 className={styles.title}>Task Theo Trạng Thái</h2>
                <button onClick={() => exportReportExcel("status", statusFrom || undefined, statusTo || undefined)}
                  className={styles.btnExport}>
                  Xuất Excel
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">

              {/* Filter */}
              <div className="grid grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-3">Từ ngày :</label>
                  <input type="date" value={statusFrom} onChange={e => setStatusFrom(e.target.value)} className={styles.filterInput} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-3">Đến ngày</label>
                  <input type="date" value={statusTo} onChange={e => setStatusTo(e.target.value)} className={styles.filterInput} /></div>
                <div className="flex items-end">
                  <button onClick={loadStatus} className={styles.btnFilter + " w-full py-4 text-lg"}>Lọc Ngay</button>
                </div>
              </div>

              {/* Pie + Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* PIE CHART */}
                <div className={styles.pieContainer}>
                  <h3 className={styles.pieTitle}>Tỷ lệ trạng thái</h3>
                  {loadingStatus ? (
                    <div className="h-80 flex items-center justify-center text-teal-600 text-2xl font-bold animate-pulse">Đang tải...</div>
                  ) : pieData.length === 0 ? (
                    <p className="text-center text-gray-500 pt-20">Không có dữ liệu</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={130}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v} task`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* BAR CHART */}
                <div>
                  {loadingStatus ? (
                    <div className="h-96 flex items-center justify-center"><div className={styles.loadingText}>Đang tải...</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={420}>
                      <BarChart data={statusChartData} margin={{ top: 20, right: 20, left: 20, bottom: 140 }}>
                        <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
                        <XAxis dataKey="robot" tick={<CustomXAxisTick />} height={160} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {statusKeys.map((k, i) => (
                          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[12, 12, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: TASK THEO NGÀY (LINE CHART) */}
          <div className={styles.glass}>
            <div className={styles.headerTimeline}>
              <div className="flex justify-between items-center">
                <h2 className={styles.title}>Task Theo Ngày</h2>
                <button onClick={() => exportReportExcel("timeline", timelineFrom || undefined, timelineTo || undefined)}
                  className={styles.btnExport + " !text-purple-600"}>
                  Xuất Excel
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">

              <div className="grid grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-3">Từ ngày :</label>
                  <input type="date" value={timelineFrom} onChange={e => setTimelineFrom(e.target.value)} className={styles.filterInput} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-3">Đến ngày</label>
                  <input type="date" value={timelineTo} onChange={e => setTimelineTo(e.target.value)} className={styles.filterInput} /></div>
                <div className="flex items-end">
                  <button onClick={loadTimeline} className={`${styles.btnFilter} w-full py-4 text-lg bg-gradient-to-r from-purple-600 to-pink-600`}>
                    Lọc Ngay
                  </button>
                </div>
              </div>

              {loadingTimeline ? (
                <div className="h-96 flex items-center justify-center text-purple-600 text-3xl font-bold animate-pulse">
                  Đang tải biểu đồ...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={520}>
                  <LineChart data={timelineChartData} margin={{ top: 20, right: 40, left: 20, bottom: 160 }}>
                    <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
                    <XAxis dataKey="robot" tick={<CustomXAxisTick />} height={180} />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }} />
                    <Legend wrapperStyle={{ paddingTop: "30px" }} />
                    {dateKeys.slice(0, 10).map((d, i) => (
                      <Line key={d} type="monotone" dataKey={d} stroke={COLORS[i % COLORS.length]} strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 10 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}