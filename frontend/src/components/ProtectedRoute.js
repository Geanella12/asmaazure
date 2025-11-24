// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ requiredRole, children }) {
  const { auth } = useAuth();

  // no hay sesión
if (!auth) {
    // Redirige según el rol requerido
    if (requiredRole === "doctor") return <Navigate to="/doctor/login" replace />;
    return <Navigate to="/user/login" replace />;
  }

  // rol incorrecto
  if (requiredRole && auth.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
