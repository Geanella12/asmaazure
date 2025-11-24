// src/components/auth/UserLoginForm.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export default function UserLoginForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/api/auth/login/apoderado", {
        usuario,
        "contraseña": contrasena,
      });

      if (!data?.success) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }

      const session = {
        role: "user",
        username: `${data.nombres} ${data.apellidos}`.trim(),
        dni: String(data.dni || ""),
      };
      setAuth(session);
      if (session.dni) localStorage.setItem("dni", session.dni);

      navigate("/user/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-form" style={{ maxWidth: 420 }}>
        <h2 style={{ marginBottom: 4 }}>Acceso de Apoderado</h2>
        <p style={{ color: "#6b7280", marginBottom: 24 }}>
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              placeholder="Tu usuario"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: 4 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" style={{ marginTop: 8 }}>
            Iniciar Sesión
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link to="/user/register">¿No tienes cuenta? Regístrate</Link>
        </div>
      </div>
    </div>
  );
}
