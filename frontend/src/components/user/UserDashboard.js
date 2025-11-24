// src/components/user/UserDashboard.js
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import PatientForm from "../../components/PatientForm";
import UserHome from "../../components/UserHome";

export default function UserDashboard() {
  const { auth, logout } = useAuth();
  const dni = localStorage.getItem("dni");

  return (
    <div className="dashboard" style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Encabezado */}
      <div
        className="dashboard-header"
        style={{
          background: "#1e3a8a",
          color: "#fff",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Panel de Usuario</h2>
          <small>
            Bienvenido, <b>{auth?.username || "Usuario"}</b>
          </small>
        </div>
        <button
          className="btn-secondary"
          onClick={logout}
          style={{
            background: "#fff",
            color: "#1e3a8a",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido principal */}
      <section style={{ marginTop: 20 }}>
        <UserHome dniApoderado={dni} FormComponent={PatientForm} />
      </section>
    </div>
  );
}
