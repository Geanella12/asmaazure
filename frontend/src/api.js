// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});
export function setDoctorHeaders() {
  api.defaults.headers.common["x-role"] = "doctor";
}

/**
 * Limpia headers por defecto (logout o cambio de rol).
 */
export function clearRoleHeaders() {
  delete api.defaults.headers.common["x-role"];
}
export default api;

