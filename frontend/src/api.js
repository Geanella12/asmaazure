// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,  // 🔥 ahora usa ENV
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// === ROLE HEADERS ===
export function setDoctorHeaders() {
  api.defaults.headers.common["x-role"] = "doctor";
}

export function clearRoleHeaders() {
  delete api.defaults.headers.common["x-role"];
}

export default api;

