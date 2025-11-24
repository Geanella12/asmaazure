// src/components/auth/UserRegisterForm.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api';

const UserRegisterForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    nombre: '',
    apellido: '',
    dni: '',
    tipo_usuario: 'apoderado',
    birthday: '' // YYYY-MM-DD
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setOk('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', form);
      setOk('Registro exitoso. Ahora inicia sesión.');
      setTimeout(() => navigate('/user/login', { replace: true }), 800);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'No se pudo registrar.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-form" style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: 6 }}>Crear cuenta (Apoderado)</h2>
        <p style={{ color: '#6b7280', marginBottom: 22 }}>
          Completa tus datos para registrarte.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-section" style={{ background: '#f8f9fa', marginBottom: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label>DNI (8 dígitos)</label>
                <input
                  name="dni"
                  value={form.dni}
                  onChange={handleChange}
                  placeholder="Ej. 12345678"
                  maxLength={8}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha de nacimiento</label>
                <input
                  type="date"
                  name="birthday"
                  value={form.birthday}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nombres</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tus nombres"
                  required
                />
              </div>

              <div className="form-group">
                <label>Apellidos</label>
                <input
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Tus apellidos"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ background: '#f8f9fa' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Usuario</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Elige un usuario"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Correo</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tucorreo@ejemplo.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <small className="form-hint" style={{ color: '#6b7280' }}>
                  Mínimo 6–8 caracteres recomendados.
                </small>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
          {ok && (
            <div className="form-summary" style={{ marginTop: 12 }}>
              {ok}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" type="submit">Registrarme</button>
          </div>
        </form>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <small>¿Ya tienes cuenta?</small><br />
          <Link to="/user/login" className="btn-link">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default UserRegisterForm;
