// src/services/robotCompartmentService.js
import { apiFetch } from "./api";

export const getUnlockedCompartments = (robotId) =>
  apiFetch(`/RobotCompartments/robot/${robotId}/all`);

export const getCompartmentsByRobotAndCategory = (robotId, categoryId) =>
  apiFetch(`/RobotCompartments/robot/${robotId}/category/${categoryId}`);

export const getAllCategories = () =>
  apiFetch(`/CompartmentCategories`);
