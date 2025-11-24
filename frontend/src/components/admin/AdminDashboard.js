import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DoctorForm from './DoctorForm';
import UserForm from './UserForm';
import DoctorTable from './DoctorTable';
import UserTable from './UserTable';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('doctors');
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [doctors, setDoctors] = useState([
    { id: 1, username: 'doctor1', name: 'Dr. García', email: 'garcia@asma.com', specialty: 'Neumología' },
    { id: 2, username: 'doctor2', name: 'Dr. López', email: 'lopez@asma.com', specialty: 'Alergología' }
  ]);

  const [users, setUsers] = useState([
    { id: 1, username: 'usuario1', name: 'Juan Pérez', email: 'juan@email.com', dni: '12345678' },
    { id: 2, username: 'usuario2', name: 'María García', email: 'maria@email.com', dni: '87654321' }
  ]);

  const handleCreateDoctor = (doctorData) => {
    const newDoctor = {
      id: Date.now(),
      ...doctorData,
      createdBy: user.id
    };
    setDoctors(prev => [...prev, newDoctor]);
    setShowDoctorForm(false);
  };

  const handleEditDoctor = (doctorData) => {
    setDoctors(prev => prev.map(doctor => 
      doctor.id === editingDoctor.id ? { ...doctor, ...doctorData } : doctor
    ));
    setEditingDoctor(null);
    setShowDoctorForm(false);
  };

  const handleDeleteDoctor = (doctorId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este doctor?')) {
      setDoctors(prev => prev.filter(doctor => doctor.id !== doctorId));
    }
  };

  const handleCreateUser = (userData) => {
    const newUser = {
      id: Date.now(),
      ...userData,
      createdBy: user.id
    };
    setUsers(prev => [...prev, newUser]);
    setShowUserForm(false);
  };

  const handleEditUser = (userData) => {
    setUsers(prev => prev.map(user => 
      user.id === editingUser.id ? { ...user, ...userData } : user
    ));
    setEditingUser(null);
    setShowUserForm(false);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const openEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setShowDoctorForm(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Panel de Administración</h1>
          <div className="user-info">
            <span>Bienvenido, {user.name}</span>
            <button onClick={logout} className="btn-logout">Cerrar Sesión</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <button 
            className={activeTab === 'doctors' ? 'active' : ''}
            onClick={() => setActiveTab('doctors')}
          >
            Gestión de Doctores
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Gestión de Usuarios
          </button>
        </nav>

        <div className="dashboard-main">
          {activeTab === 'doctors' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Gestión de Doctores</h2>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setEditingDoctor(null);
                    setShowDoctorForm(true);
                  }}
                >
                  Crear Doctor
                </button>
              </div>
              <DoctorTable 
                doctors={doctors}
                onEdit={openEditDoctor}
                onDelete={handleDeleteDoctor}
              />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Gestión de Usuarios</h2>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserForm(true);
                  }}
                >
                  Crear Usuario
                </button>
              </div>
              <UserTable 
                users={users}
                onEdit={openEditUser}
                onDelete={handleDeleteUser}
              />
            </div>
          )}
        </div>
      </div>

      {showDoctorForm && (
        <DoctorForm
          doctor={editingDoctor}
          onSubmit={editingDoctor ? handleEditDoctor : handleCreateDoctor}
          onClose={() => {
            setShowDoctorForm(false);
            setEditingDoctor(null);
          }}
        />
      )}

      {showUserForm && (
        <UserForm
          user={editingUser}
          onSubmit={editingUser ? handleEditUser : handleCreateUser}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
