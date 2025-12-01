// src/services/reportService.js
import { apiFetch } from "./api";
import { API_CONFIG } from "@/utils/apiConfig";

const BASE_URL = `${API_CONFIG.API_BASE}/report`; // <-- dùng API_BASE từ config

const BASE_URL1 = `/report`;

export const getTaskStatusReport = async (fromDate = null, toDate = null) => {
  let url = `${BASE_URL1}/task-status-dynamic`;
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  if (params.toString()) url += `?${params.toString()}`;

  return apiFetch(url);
};

export const getTaskTimelineReport = async (fromDate = null, toDate = null) => {
  let url = `${BASE_URL1}/task-timeline-dynamic`;
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  if (params.toString()) url += `?${params.toString()}`;

  return apiFetch(url);
};

export const exportReportExcel = async (type, fromDate, toDate) => {
  const params = new URLSearchParams();
  params.append("exportExcel", "true");
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);

  const endpoint = type === "status" ? "task-status-dynamic" : "task-timeline-dynamic";
  const url = `${BASE_URL}/${endpoint}?${params.toString()}`; // <-- đã dùng BASE_URL từ API_CONFIG

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // Nếu dùng token:
        // Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi server: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let fileName = `Task_${type === "status" ? "Status" : "Timeline"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (contentDisposition?.includes("filename=")) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) fileName = match[1];
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);

    console.log("Xuất Excel thành công:", fileName);
  } catch (err) {
    console.error("Lỗi xuất Excel:", err);
    alert("Không thể xuất file Excel. Vui lòng thử lại!");
  }
};
