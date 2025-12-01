// src/services/destinationService.js
import { apiFetch } from "./api";

export const getDestinationsByMap = (mapId) =>
  apiFetch(`/destinations/by-map/${mapId}`);
