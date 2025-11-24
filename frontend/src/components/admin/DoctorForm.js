import React, { useState, useEffect } from 'react';

const DoctorForm = ({ doctor, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    specialty: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (doctor) {
      setFormData({
        username: doctor.username || '',
        password: '',
        name: doctor.name || '',
        email: doctor.email || '',
        specialty: doctor.specialty || ''
      });
    }
  }, [doctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) newErrors.username = 'Usuario es requerido';
    if (!doctor && !formData.password) newErrors.password = 'Contraseña es requerida';
    if (!formData.name) newErrors.name = 'Nombre es requerido';
    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.specialty) newErrors.specialty = 'Especialidad es requerida';

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{doctor ? 'Editar Doctor' : 'Crear Doctor'}</h3>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Usuario *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
              placeholder="usuario_doctor"
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label>Contraseña {!doctor && '*'}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder={doctor ? 'Dejar vacío para mantener actual' : 'Contraseña'}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Nombre Completo *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Dr. Juan García"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="doctor@asma.com"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Especialidad *</label>
            <select
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className={errors.specialty ? 'error' : ''}
            >
              <option value="">Seleccionar Especialidad</option>
              <option value="Neumología">Neumología</option>
              <option value="Alergología">Alergología</option>
              <option value="Medicina Interna">Medicina Interna</option>
              <option value="Pediatría">Pediatría</option>
            </select>
            {errors.specialty && <span className="error-message">{errors.specialty}</span>}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {doctor ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorForm;
