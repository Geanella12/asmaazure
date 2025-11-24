import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage = () => {
  return (
    <div className="unauthorized-page">
      <div className="error-container">
        <h1>403</h1>
        <h2>Acceso No Autorizado</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
        <p>Por favor, contacta al administrador si crees que esto es un error.</p>
        <div className="actions">
          <Link to="/" className="btn-primary">
            Volver al Inicio
          </Link>
          <Link to="/login" className="btn-secondary">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
