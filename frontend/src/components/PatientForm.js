// src/components/PatientForm.jsx
import React, { useState, useMemo } from 'react';
import api from "../api";

const distritos = [
  { nombre: 'Ate', cod: 1, humedad: 83.9 },
  { nombre: 'Callao', cod: 2, humedad: 88.4 },
  { nombre: 'Comas', cod: 3, humedad: 85.6 },
  { nombre: 'Los Olivos', cod: 4, humedad: 70.3 },
  { nombre: 'Miraflores', cod: 5, humedad: 75.3 },
  { nombre: 'San Isidro', cod: 6, humedad: 84.9 },
  { nombre: 'San Juan de Lurigancho', cod: 7, humedad: 87.0 },
  { nombre: 'Surco', cod: 8, humedad: 84.7 },
];

const PatientForm = ({ onSaved }) => {
  const [form, setForm] = useState({
    // meta (no feature)
    dni: '',
    paciente: '',
    genero: '',
    fecha_cita: '',
    distrito: '',
    acepta: false,

    // FEATURES exactos
    'humedad (%)': '',
    annos: '',
    'historial familiar de asma': '',
    'familiares con asma': '',
    'antecedentes de enfermedades respiratorias': '',
    'tipo de enfermedades respiratorias': '',
    'presencia de mascotas en el hogar': '',
    'cantidad de mascotas': '',
    'tipo de mascotas': '',
    'exposicion a alergenos': '',
    'frecuencia de episodios de sibilancias': '',
    'presencia de rinitis alergica u otras alergias': '',
    'frecuencia de actividad fisica': '',
    indice_alergico: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // humedad auto (oculta)
  const humedadDistrito = useMemo(() => {
    const d = distritos.find(x => x.nombre === form.distrito);
    return d ? d.humedad : '';
  }, [form.distrito]);

  // índice alérgico (oculto)
  const indiceAlergicoCalc = useMemo(() => {
    const rinitis = Number(form['presencia de rinitis alergica u otras alergias'] || 0);
    const expo   = Number(form['exposicion a alergenos'] || 0);
    const mascota= Number(form['presencia de mascotas en el hogar'] || 0);
    const tipo   = Number(form['tipo de mascotas'] || 0);
    return rinitis + expo + mascota + (tipo === 2 ? 1 : 0);
  }, [form]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'acepta') {
      setForm(prev => ({ ...prev, acepta: !!checked }));
      return;
    }

    if (name === 'dni') {
      // solo 8 dígitos
      const val = String(value || '').replace(/\D/g, '').slice(0, 8);
      setForm(prev => ({ ...prev, dni: val }));
      return;
    }

    if (name === 'distrito') {
      const d = distritos.find(x => x.nombre === value);
      setForm(prev => ({
        ...prev,
        distrito: value,
        'humedad (%)': d ? d.humedad : ''
      }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const err = {};
    const required = [
      'dni', 'paciente', 'genero', 'fecha_cita', 'distrito',
      'annos',
      'historial familiar de asma', 'familiares con asma',
      'antecedentes de enfermedades respiratorias', 'tipo de enfermedades respiratorias',
      'presencia de mascotas en el hogar', 'cantidad de mascotas', 'tipo de mascotas',
      'exposicion a alergenos', 'frecuencia de episodios de sibilancias',
      'presencia de rinitis alergica u otras alergias', 'frecuencia de actividad fisica'
    ];
    required.forEach(k => {
      if (form[k] === '' || form[k] === null || form[k] === undefined) err[k] = 'Requerido';
    });

    if (String(form.dni).length !== 8) err.dni = 'DNI debe tener 8 dígitos';
    if (Number(form.annos) < 0 || Number(form.annos) > 12) err.annos = 'Años fuera de rango';
    if (!form.acepta) err.acepta = 'Debes aceptar el tratamiento de datos (Ley N.º 29733)';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const dniApoderado = localStorage.getItem('dni');
      if (!dniApoderado) {
        alert('No se encontró el DNI del apoderado (inicia sesión de nuevo).');
        setLoading(false);
        return;
      }

      // mapa distrito -> código
      const dmap = Object.fromEntries(distritos.map(d => [d.nombre, d.cod]));
      const distrito_cod = dmap[form.distrito] ?? null;

      // payload exacto que espera el backend
      const payload = {
        DNI: String(form.dni || ''),
        paciente: form.paciente,
        genero: form.genero,
        annos: Number(form.annos || 0),
        fecha_cita: form.fecha_cita,
        distrito: form.distrito,
        distrito_cod,

        'humedad (%)': Number(form['humedad (%)'] || humedadDistrito || 0), // oculta
        'historial familiar de asma': Number(form['historial familiar de asma'] || 0),
        'familiares con asma': Number(form['familiares con asma'] || 0),
        'antecedentes de enfermedades respiratorias': Number(form['antecedentes de enfermedades respiratorias'] || 0),
        'tipo de enfermedades respiratorias': Number(form['tipo de enfermedades respiratorias'] || 0),
        'presencia de mascotas en el hogar': Number(form['presencia de mascotas en el hogar'] || 0),
        'cantidad de mascotas': Number(form['cantidad de mascotas'] || 0),
        'tipo de mascotas': Number(form['tipo de mascotas'] || 0),
        'exposicion a alergenos': Number(form['exposicion a alergenos'] || 0),
        'frecuencia de episodios de sibilancias': Number(form['frecuencia de episodios de sibilancias'] || 0),
        'presencia de rinitis alergica u otras alergias': Number(form['presencia de rinitis alergica u otras alergias'] || 0),
        'frecuencia de actividad fisica': Number(form['frecuencia de actividad fisica'] || 0),

        indice_alergico: Number(indiceAlergicoCalc) // oculto
      };

      await api.post('/prediccion', payload, {
        headers: { 'x-dni': dniApoderado }
      });

      alert('Formulario guardado correctamente');

      // limpiar y avisar al contenedor para refrescar "Mis formularios"
      setForm({
        dni:'', paciente:'', genero:'', fecha_cita:'', distrito:'', acepta:false,
        'humedad (%)':'', annos:'',
        'historial familiar de asma':'', 'familiares con asma':'',
        'antecedentes de enfermedades respiratorias':'', 'tipo de enfermedades respiratorias':'',
        'presencia de mascotas en el hogar':'', 'cantidad de mascotas':'', 'tipo de mascotas':'',
        'exposicion a alergenos':'', 'frecuencia de episodios de sibilancias':'',
        'presencia de rinitis alergica u otras alergias':'', 'frecuencia de actividad fisica':'',
        indice_alergico:''
      });

      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error('❌ POST /prediccion fallo:', err);
      alert('Error al guardar el formulario');
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  return (
    <form onSubmit={handleSubmit} style={{background:'#fff', borderRadius:16, padding:20, boxShadow:'0 6px 20px rgba(0,0,0,0.08)'}}>
      <h3 style={{marginTop:0}}>Datos del paciente</h3>

      {/* DNI / Paciente */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div>
          <label>DNI *</label>
          <input
            name="dni"
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            value={form.dni}
            onChange={handleChange}
            className={errors.dni?'error':''}
          />
          {errors.dni && <div className="error-message">{errors.dni}</div>}
        </div>
        <div>
          <label>Paciente *</label>
          <input name="paciente" type="text" value={form.paciente} onChange={handleChange} className={errors.paciente?'error':''} />
          {errors.paciente && <div className="error-message">{errors.paciente}</div>}
        </div>
      </div>

      {/* Género / Fecha */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
        <div>
          <label>Género *</label>
          <select name="genero" value={form.genero} onChange={handleChange} className={errors.genero?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Masculino</option>
            <option value="1">Femenino</option>
          </select>
          {errors.genero && <div className="error-message">{errors.genero}</div>}
        </div>
        <div>
          <label>Fecha de cita *</label>
          <input name="fecha_cita" type="date" value={form.fecha_cita} onChange={handleChange} className={errors.fecha_cita?'error':''}/>
          {errors.fecha_cita && <div className="error-message">{errors.fecha_cita}</div>}
        </div>
      </div>

      {/* Distrito (humedad se calcula oculto) */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
        <div>
          <label>Distrito *</label>
          <select name="distrito" value={form.distrito} onChange={handleChange} className={errors.distrito?'error':''}>
            <option value="">Seleccionar</option>
            {distritos.map(d => <option key={d.cod} value={d.nombre}>{d.nombre}</option>)}
          </select>
          {errors.distrito && <div className="error-message">{errors.distrito}</div>}
        </div>
        {/* humedad: oculta */}
        <input type="hidden" name="humedad (%)" value={form['humedad (%)'] || humedadDistrito || ''} readOnly />
      </div>

      {/* Años */}
      <div style={{marginTop:12}}>
        <label>Años *</label>
        <input name="annos" type="number" min="0" max="12" value={form.annos} onChange={handleChange} className={errors.annos?'error':''}/>
        {errors.annos && <div className="error-message">{errors.annos}</div>}
      </div>

      {/* Features */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
        <div>
          <label>Historial familiar de asma *</label>
          <select name="historial familiar de asma" value={form['historial familiar de asma']} onChange={handleChange} className={errors['historial familiar de asma']?'error':''}>
            <option value="">Seleccionar</option><option value="1">Sí</option><option value="0">No</option>
          </select>
        </div>

        <div>
          <label>Familiares con asma *</label>
          <select name="familiares con asma" value={form['familiares con asma']} onChange={handleChange} className={errors['familiares con asma']?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Ninguno</option>
            <option value="1">Padre o Madre</option>
            <option value="2">Ambos</option>
          </select>
        </div>

        <div>
          <label>Antecedentes de enfermedades respiratorias *</label>
          <select name="antecedentes de enfermedades respiratorias" value={form['antecedentes de enfermedades respiratorias']} onChange={handleChange} className={errors['antecedentes de enfermedades respiratorias']?'error':''}>
            <option value="">Seleccionar</option><option value="1">Sí</option><option value="0">No</option>
          </select>
        </div>

        <div>
          <label>Tipo de enfermedades respiratorias *</label>
          <select name="tipo de enfermedades respiratorias" value={form['tipo de enfermedades respiratorias']} onChange={handleChange} className={errors['tipo de enfermedades respiratorias']?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Ninguna</option>
            <option value="1">Una</option>
            <option value="2">Ambas</option>
          </select>
        </div>

        <div>
          <label>Presencia de mascotas en el hogar *</label>
          <select name="presencia de mascotas en el hogar" value={form['presencia de mascotas en el hogar']} onChange={handleChange} className={errors['presencia de mascotas en el hogar']?'error':''}>
            <option value="">Seleccionar</option><option value="1">Sí</option><option value="0">No</option>
          </select>
        </div>

        <div>
          <label>Cantidad de mascotas *</label>
          <input name="cantidad de mascotas" type="number" min="0" value={form['cantidad de mascotas']} onChange={handleChange} className={errors['cantidad de mascotas']?'error':''}/>
        </div>

        <div>
          <label>Tipo de mascotas *</label>
          <select name="tipo de mascotas" value={form['tipo de mascotas']} onChange={handleChange} className={errors['tipo de mascotas']?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Ninguna</option>
            <option value="1">Perro o gato</option>
            <option value="2">Ambas</option>
          </select>
        </div>

        <div>
          <label>Exposición a alérgenos *</label>
          <select name="exposicion a alergenos" value={form['exposicion a alergenos']} onChange={handleChange} className={errors['exposicion a alergenos']?'error':''}>
            <option value="">Seleccionar</option><option value="1">Sí</option><option value="0">No</option>
          </select>
        </div>

        <div>
          <label>Frecuencia de episodios de sibilancias *</label>
          <select name="frecuencia de episodios de sibilancias" value={form['frecuencia de episodios de sibilancias']} onChange={handleChange} className={errors['frecuencia de episodios de sibilancias']?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Ninguna</option>
            <option value="1">Ocasional</option>
            <option value="2">Frecuente</option>
            <option value="3">Muy frecuente</option>
          </select>
        </div>

        <div>
          <label>Presencia de rinitis alérgica u otras alergias *</label>
          <select name="presencia de rinitis alergica u otras alergias" value={form['presencia de rinitis alergica u otras alergias']} onChange={handleChange} className={errors['presencia de rinitis alergica u otras alergias']?'error':''}>
            <option value="">Seleccionar</option><option value="1">Sí</option><option value="0">No</option>
          </select>
        </div>

        <div>
          <label>Frecuencia de actividad física *</label>
          <select name="frecuencia de actividad fisica" value={form['frecuencia de actividad fisica']} onChange={handleChange} className={errors['frecuencia de actividad fisica']?'error':''}>
            <option value="">Seleccionar</option>
            <option value="0">Ninguna</option>
            <option value="1">Media</option>
            <option value="2">Alta</option>
          </select>
        </div>

        {/* índice alérgico oculto */}
        <input type="hidden" name="indice_alergico" value={indiceAlergicoCalc} readOnly />
      </div>

      {/* Consentimiento */}
      <div style={{marginTop:16, padding:'10px 12px', border:'1px solid #e7e7e7', borderRadius:10, background:'#fafafa'}}>
        <label style={{display:'flex', gap:10, alignItems:'flex-start'}}>
          <input type="checkbox" name="acepta" checked={form.acepta} onChange={handleChange}/>
          <span style={{fontSize:13, lineHeight:1.5}}>
            Declaro haber leído y acepto el tratamiento de mis datos personales y los del menor a mi cargo conforme a la
            <b> Ley N.º 29733 – Ley de Protección de Datos Personales</b> y su Reglamento (D.S. N.º 003-2013-JUS).
            La información será usada exclusivamente con fines académicos y de investigación, con medidas de anonimización.
          </span>
        </label>
        {errors.acepta && <div className="error-message">{errors.acepta}</div>}
      </div>

      <div style={{display:'flex', gap:12, marginTop:14}}>
        <button
          className="btn-primary"
          type="submit"
          disabled={loading}
          style={{padding:'10px 16px', borderRadius:10, border:'1px solid #2f6fed', background:'#2f6fed', color:'#fff', fontWeight:700, cursor:'pointer'}}
        >
          {loading ? 'Procesando…' : 'Guardar Paciente'}
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => window.history.back()}
          style={{padding:'10px 16px', borderRadius:10, border:'1px solid #ddd', background:'#fff', color:'#333', cursor:'pointer'}}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
