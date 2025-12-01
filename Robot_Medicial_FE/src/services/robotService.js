// src/services/robotService.js
import { apiFetch } from "./api";

const API = "/Robots";

export const getAllRobots = (status) =>
  apiFetch(`${API}${status ? `?status=${status}` : ""}`);

export const getRobotById = (id) => apiFetch(`${API}/${id}`);

export const createRobot = (robotDto) =>
  apiFetch(API, { method: "POST", body: JSON.stringify(robotDto) });

export const updateRobot = (id, robotDto) =>
  apiFetch(`${API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(robotDto),
  });

export const updateRobotStatus = (id, status) =>
  apiFetch(`${API}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const assignRobotMap = (robotId, mapId) =>
  apiFetch(`${API}/${robotId}/assign-map/${mapId}`, { method: "PUT" });

export const updateRobotPosition = (id, positionDto) =>
  apiFetch(`${API}/${id}/position`, {
    method: "PATCH",
    body: JSON.stringify(positionDto),
  });

export const getAvailableRobots = () => apiFetch(`${API}/available`);

export const getRobotsByMap = async (mapId) => {
  const res = await apiFetch(`${API}/by-map/${mapId}`);
  return res?.data || [];
};