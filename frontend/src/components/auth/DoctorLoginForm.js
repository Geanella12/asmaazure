// src/components/doctor/DoctorLoginForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api"; // 👈 usamos el axios configurado

const DoctorLoginForm = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 👇 usamos api (que ya tiene baseURL desde .env)
      const res = await api.post("/api/auth/login/doctor", {
        usuario: formData.username,
        contraseña: formData.password,
      });

      if (res.data?.success) {
        // guardar usuario en el contexto
        login({
          username: formData.username,
          name: `Dr. ${res.data.usuario}`,
          role: "doctor",
          dni: res.data.dni,
        });

        navigate("/doctor/dashboard");
      } else {
        setError("Credenciales incorrectas");
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) setError("Contraseña incorrecta");
        else if (err.response.status === 402) setError("Usuario incorrecto");
        else setError("Error del servidor. Intenta nuevamente.");
      } else if (err.request) {
        setError("No se pudo conectar con el servidor.");
      } else {
        setError("Error inesperado: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Panel de Doctor</h2>
        <p>Centro Médico del ASMA</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Ingrese su usuario"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ingrese su contraseña"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>

          <div
            style={{
              marginTop: "16px",
              fontSize: "14px",
              color: "#555",
              textAlign: "center",
            }}
          >
            <p>
              <strong>Usuario:</strong> doctor
            </p>
            <p>
              <strong>Contraseña:</strong> doctor123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorLoginForm;
