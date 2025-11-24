import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);

  // Cargar sesión previa
  useEffect(() => {
    try {
      const saved = localStorage.getItem("auth");
      if (saved) setAuth(JSON.parse(saved));
    } catch (_) {}
  }, []);

  // Persistir cambios
  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  // ✅ NUEVO: login unificado (doctor / user)
  const login = (session) => {
    // session esperado: { role: 'user'|'doctor', username?, name?, dni? }
    const clean = {
      role: session?.role,
      username: session?.username || "",
      name: session?.name || "",
      dni: session?.dni || null,
    };

    // Guardar DNI solo cuando es apoderado/user (lo usa PatientForm)
    if (clean.role === "user" && clean.dni) {
      localStorage.setItem("dni", String(clean.dni));
    } else {
      localStorage.removeItem("dni");
    }

    setAuth(clean);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("dni");
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
