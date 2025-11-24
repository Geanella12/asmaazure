import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import FormDetailModal from "../FormDetailModal";
import { buildFormPdf } from '../pdf/formPdf.js';



export default function DoctorPatientForms() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dni, setDni] = useState("");

  const [openDetail, setOpenDetail] = useState(false);
  const [rowForDetail, setRowForDetail] = useState(null);

  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);

  const fetchRecientes = async () => {
    setErr(""); setLoading(true);
    try {
      const { data } = await api.get(`/api/forms/recent?limit=${limit}&offset=${offset}`, {
        headers: { "x-role": "doctor" },
      });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.response?.data?.message || "Error al listar recientes");
      setRows([]);
    } finally { setLoading(false); }
  };

  const buscarPorDni = async (ev) => {
    ev?.preventDefault?.();
    setErr("");
    if (!/^\d{8}$/.test(String(dni))) {
      setErr("DNI inválido"); setRows([]); return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/forms/${dni}`, {
        headers: { "x-role": "doctor" },
      });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo obtener datos");
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRecientes(); /* eslint-disable-next-line */ }, [limit, offset]);
const handlePdf = async (row) => {
  try {
    const { dni, paciente } = row;
    const fecha = (row.fecha_cita || "").slice(0, 10);
    const { data } = await api.get("/api/forms/detail", {
      params: { dni, fecha, paciente },
      headers: { "x-role": "doctor" },
    });
    if (data?.success && data.data) {
      buildFormPdf(data.data);
    } else {
      alert("No se pudo obtener el detalle para el PDF.");
    }
  } catch (e) {
    alert("Error generando PDF.");
    console.error(e);
  }
};
  const RiskBadge = ({ value }) => {
    if (value === 1) return <span className="badge badge-high">● Asma</span>;
    if (value === 0) return <span className="badge badge-low">● Sin asma</span>;
    return <span className="badge badge-null">—</span>;
  };

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={buscarPorDni} style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="DNI del paciente (8 dígitos)"
            maxLength={8}
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <button
          className="btn"
          onClick={() => { logout(); navigate("/doctor/login", { replace: true }); }}
        >
          Cerrar sesión
        </button>

        <button className="btn" onClick={fetchRecientes}>Ver recientes</button>
      </div>

      {err && <div className="error-message">{err}</div>}

      <h3 style={{ margin: "10px 0 12px" }}>Últimos formularios</h3>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>DNI</th>
              <th>Fecha de cita</th>
              <th>Edad (años)</th>
              <th>Predicción</th>
              <th>Probabilidad</th>
              <th>Interpretación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                  {loading ? "Cargando..." : "Sin resultados"}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.dni}-${r.fecha_cita}-${i}`}>
                  <td>{r.paciente}</td>
                  <td>{r.dni}</td>
                  <td>{r.fecha_cita?.slice(0, 10)}</td>
                  <td>{r.annos}</td>
                  <td><RiskBadge value={r.target} /></td>
                  <td>{r.probabilidad_riesgo != null ? Number(r.probabilidad_riesgo).toFixed(3) : "-"}</td>
                  <td>{r.interpretacion || "-"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => { setRowForDetail(r); setOpenDetail(true); }}
                      title="Ver detalle"
                    >
                      👁️ Ver
                    </button>
                 <button
  className="btn"
  onClick={() => handlePdf(r)}
  title="Descargar PDF"
>
  ⬇️ PDF
</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="pager">
        <button
          className="btn"
          onClick={() => setOffset((o) => Math.max(o - limit, 0))}
          disabled={offset === 0 || loading}
        >
          ◀ Anterior
        </button>
        <button className="btn" onClick={() => setOffset((o) => o + limit)} disabled={loading}>
          Siguiente ▶
        </button>
      </div>

      {/* Modal detalle */}
      <FormDetailModal open={openDetail} onClose={() => setOpenDetail(false)} baseRow={rowForDetail} />
    </div>
  );
}
