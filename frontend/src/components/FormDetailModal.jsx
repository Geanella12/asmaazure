// src/components/FormDetailModal.jsx
import React, { useEffect, useState } from "react";
import api from "../api"; // <- porque este archivo está en src/components

const HIDE_KEYS = new Set([
  "id", "creado_por_dni", "distrito_cod", "indice_alergico",
  "created_at", "updated_at"
]);

// Etiquetas amigables (si falta alguna, se usa la clave original)
const LABEL = {
  dni: "DNI",
  paciente: "Paciente",
  genero: "Género",
  annos: "Edad (años)",
  fecha_cita: "Fecha de cita",
  distrito: "Distrito",
  "humedad (%)": "Humedad (%)",
  "historial familiar de asma": "Historial familiar de asma",
  "familiares con asma": "Familiares con asma",
  "antecedentes de enfermedades respiratorias": "Antecedentes de enf. respiratorias",
  "tipo de enfermedades respiratorias": "Tipo de enf. respiratorias",
  "presencia de mascotas en el hogar": "Mascotas en el hogar",
  "cantidad de mascotas": "Cantidad de mascotas",
  "tipo de mascotas": "Tipo de mascotas",
  "exposicion a alergenos": "Exposición a alérgenos",
  "frecuencia de episodios de sibilancias": "Frecuencia de sibilancias",
  "presencia de rinitis alergica u otras alergias": "Rinitis alérgica / otras alergias",
  "frecuencia de actividad fisica": "Actividad física",
  target: "Predicción",
  probabilidad_riesgo: "Probabilidad",
  interpretacion: "Interpretación",
};

function humanize(key, value) {
  if (value === null || value === undefined || value === "") return "-";

  switch (key) {
    case "genero":
      return (value === 0 || value === "0") ? "Masculino"
           : (value === 1 || value === "1") ? "Femenino"
           : value;

    case "familiares con asma":
      if (value === 0 || value === "0") return "Ninguno";
      if (value === 1 || value === "1") return "Padre o madre";
      if (value === 2 || value === "2") return "Ambos";
      return value;

    case "tipo de enfermedades respiratorias":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Una";
      if (value === 2 || value === "2") return "Ambas";
      return value;

    case "tipo de mascotas":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Perro o gato";
      if (value === 2 || value === "2") return "Ambas";
      return value;

    case "frecuencia de episodios de sibilancias":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Ocasional";
      if (value === 2 || value === "2") return "Frecuente";
      if (value === 3 || value === "3") return "Muy frecuente";
      return value;

    case "frecuencia de actividad fisica":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Media";
      if (value === 2 || value === "2") return "Alta";
      return value;

    case "historial familiar de asma":
    case "antecedentes de enfermedades respiratorias":
    case "presencia de mascotas en el hogar":
    case "exposicion a alergenos":
    case "presencia de rinitis alergica u otras alergias":
      return (value === 1 || value === "1") ? "Sí"
           : (value === 0 || value === "0") ? "No"
           : value;

    case "probabilidad_riesgo":
      return `${(Number(value) * 100).toFixed(1)}%`;

    case "target":
      return (value === 1 || value === "1") ? "Asma"
           : (value === 0 || value === "0") ? "Sin Asma"
           : value;

    case "fecha_cita":
      return String(value).slice(0, 10);

    default:
      return value;
  }
}

export default function FormDetailModal({ open, onClose, baseRow }) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !baseRow) return;

    const fetchDetail = async () => {
      setErr(""); setLoading(true);
      try {
        const { dni, paciente } = baseRow;
        const fecha = (baseRow.fecha_cita || "").slice(0, 10);

        const { data } = await api.get("/api/forms/detail", {
          params: { dni, fecha, paciente },
          headers: { "x-role": "doctor" },
        });

        // Guarda tal cual lo que viene del backend:
        setDetail(data?.data ?? null);

        // (opcional) Debug para verificar claves/valores
        // console.log("Detalle recibido:", data?.data);
      } catch (e) {
        setErr(e?.response?.data?.message || "No se pudo cargar el detalle");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [open, baseRow]);

  if (!open) return null;

  // Orden sugerido; el resto se muestra después automáticamente
  const ORDER = [
    "paciente", "dni", "genero", "annos", "fecha_cita", "distrito", "humedad (%)",
    "historial familiar de asma", "familiares con asma",
    "antecedentes de enfermedades respiratorias", "tipo de enfermedades respiratorias",
    "presencia de mascotas en el hogar", "cantidad de mascotas", "tipo de mascotas",
    "exposicion a alergenos", "frecuencia de episodios de sibilancias",
    "presencia de rinitis alergica u otras alergias", "frecuencia de actividad fisica",
    "target", "probabilidad_riesgo", "interpretacion"
  ];

  // Convierte el objeto en lista clave/valor mostrando TODO (menos ocultos)
  const orderedEntries = detail ? [
    // primero los del orden prefijado
    ...ORDER
      .filter((k) => detail.hasOwnProperty(k) && !HIDE_KEYS.has(k))
      .map((k) => [k, detail[k]]),

    // luego cualquier otra columna extra
    ...Object.entries(detail)
      .filter(([k]) => !ORDER.includes(k) && !HIDE_KEYS.has(k)),
  ] : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4 style={{ margin: 0 }}>Detalle del formulario</h4>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Cargando…</div>
        ) : err ? (
          <div className="error-message" style={{ margin: 16 }}>{err}</div>
        ) : !detail ? (
          <div style={{ padding: 16 }}>Sin datos</div>
        ) : (
          <div className="detail-grid">
            {orderedEntries.map(([k, v]) => (
              <div key={k} className="detail-row">
                <div className="detail-key">{LABEL[k] || k}</div>
                <div className="detail-val">
                  {k === "target" ? (
                    (v === 1 || v === "1")
                      ? <span className="badge badge-high">● Asma</span>
                      : (v === 0 || v === "0")
                        ? <span className="badge badge-low">● Sin asma</span>
                        : <span className="badge badge-null">—</span>
                  ) : (
                    humanize(k, v)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
