// src/pages/UserPortal.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import PatientForm from '../components/PatientForm';

const UserHome= () => {
  const [showForm, setShowForm] = useState(false);
  const [myForms, setMyForms] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchMyForms = async () => {
    try {
      setLoadingList(true);
      const dniApoderado = localStorage.getItem('dni');
      if (!dniApoderado) return;
      const { data } = await api.get('/api/forms/mine', {
        headers: { 'x-dni': dniApoderado }
      });
      setMyForms(data?.data || []);
    } catch (e) {
      console.error('GET /api/forms/mine error', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchMyForms(); }, []);

  return (
    <div style={{maxWidth: 1100, margin: '24px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24}}>
      {/* Sección 1: Sobre el formulario */}
      <div>
        <div style={{background:'#ffffff', borderRadius:16, padding:24, boxShadow:'0 6px 20px rgba(0,0,0,0.08)'}}>
          <h2 style={{margin:'0 0 8px'}}>Formulario de evaluación de riesgo de asma infantil</h2>
          <p style={{margin:0, color:'#555'}}>
            Este formulario fue diseñado con el propósito de apoyar la <b>detección temprana del riesgo de asma</b> en niños de 0–5 años,
            utilizando un modelo de aprendizaje automático entrenado con variables clínicas y de entorno.
            La información recogida permite orientar mejor el cuidado y la prevención, promoviendo decisiones informadas.
          </p>

          <div style={{marginTop:16, padding:12, background:'#f6f9ff', border:'1px solid #e6eeff', borderRadius:12}}>
            <small style={{lineHeight:1.5, color:'#334'}}>
              <b>Consentimiento informado:</b> Antes de enviar el formulario, deberás aceptar que los datos personales
              serán tratados conforme a la <b>Ley N.º 29733 – Ley de Protección de Datos Personales</b> y su Reglamento
              (<b>D.S. N.º 003-2013-JUS</b>), y que se utilizarán exclusivamente con fines académicos y de investigación,
              aplicando anonimización en los análisis.
            </small>
          </div>

          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              marginTop:16,
              padding:'10px 16px',
              borderRadius:10,
              border:'1px solid #2f6fed',
              background:'#2f6fed',
              color:'#fff',
              cursor:'pointer',
              fontWeight:600
            }}
          >
            {showForm ? 'Ocultar formulario' : 'Empezar formulario'}
          </button>
        </div>

        {showForm && (
          <div style={{marginTop:24}}>
            <PatientForm onSaved={fetchMyForms} />
          </div>
        )}
      </div>

      {/* Sección 2: Mis formularios */}
      <div>
        <div style={{background:'#ffffff', borderRadius:16, padding:16, boxShadow:'0 6px 20px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <h3 style={{margin:'4px 0 12px'}}>Mis formularios</h3>
            <button onClick={fetchMyForms} style={{border:'1px solid #ddd', background:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer'}}>Actualizar</button>
          </div>

          {loadingList ? (
            <p>Cargando…</p>
          ) : myForms.length === 0 ? (
            <div style={{padding:12, border:'1px dashed #ccc', borderRadius:12, color:'#666'}}>
              Aún no has registrado formularios.
            </div>
          ) : (
            <div style={{display:'grid', gap:10}}>
              {myForms.map((f, idx) => (
                <div key={`${f.dni}-${idx}`} style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
                  <div style={{fontWeight:700}}>{f.paciente}</div>
                  <div style={{fontSize:13, color:'#555'}}>Fecha de cita: {f.fecha_cita || '-'}</div>
                  <div style={{fontSize:13, color:'#555'}}>Edad: {Number.isFinite(Number(f.annos)) ? `${f.annos} años` : '-'}</div>
                </div>
              ))}
            </div>
          )}

          <p style={{marginTop:12, fontSize:12, color:'#7a7a7a'}}>
            * Solo ves los formularios que <b>tú</b> has registrado con tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserHome;
