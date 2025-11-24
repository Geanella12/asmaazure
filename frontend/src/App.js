// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import DoctorLoginForm from './components/auth/DoctorLoginForm';
import UserLoginForm from './components/auth/UserLoginForm';
import UserRegisterForm from './components/auth/UserRegisterForm';

import DoctorDashboard from './components/doctor/DoctorDashboard';
import UserDashboard from './components/user/UserDashboard';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/doctor/login" element={<DoctorLoginForm />} />
          <Route path="/user/login" element={<UserLoginForm />} />
          <Route path="/user/register" element={<UserRegisterForm />} />

          {/* protegidas */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute requiredRole="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
