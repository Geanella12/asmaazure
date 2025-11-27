// ================== server.js ==================
require('dotenv').config();                         

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');


const axios = require('axios');   // 👈 NUEVO

const mysql = require('mysql2/promise');
const dbConfig = require('./config');  

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS ---
// --- CORS ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://asmaazure-k4lr.vercel.app",   // ✅ sin slash al final
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir también peticiones sin origin (Postman, curl, Azure, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS bloqueado para origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// manejar preflight para todas las rutas
app.options("*", cors(corsOptions));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---- Pool de MySQL (PROMISE) ----
// ---- Pool de MySQL (PROMISE) ----
let pool;
(async () => {
  try {
    // dbConfig ya contiene host, user, password, database, etc.
    pool = mysql.createPool({
      ...dbConfig,
      namedPlaceholders: true,   // si quieres seguir usando named params
    });

    const [rows] = await pool.query('SELECT 1 AS result');
    console.log('✅ Pool MySQL Azure listo. Test:', rows[0].result);
  } catch (e) {
    console.error('❌ Error creando pool MySQL Azure:', e.message);
  }
})();


// --- Protección si el pool aún no está listo ---
app.use((req, res, next) => {
  if (!pool) {
    return res.status(503).json({ success:false, message:'Inicializando base de datos… intenta de nuevo' });
  }
  next();
});

// ================== Datos mock locales (solo para pruebas de otras rutas) ==================
let doctors = [
  { id: 1, username: 'doctor1', password: 'doctor123', name: 'Dr. García', email: 'garcia@asma.com', specialty: 'Neumología' },
  { id: 2, username: 'doctor2', password: 'doctor123', name: 'Dr. López', email: 'lopez@asma.com', specialty: 'Alergología' }
];

let patients = [
  {
    id: 1,
    dni: '12345678',
    paciente: 'Juan Pérez García',
    annos: 25,
    meses: 6,
    sexo: 'M',
    des_diagnostico: 'Asma leve persistente',
    anno_cita: 2024,
    mes_cita: 3,
    distrito: 'Miraflores',
    humedad: 65,
    historial_familiar_asma: 'SI',
    antecedentes_enfermedades_respiratorias: 'NO',
    presencia_mascotas: 'SI',
    exposicion_alergenos: 'SI',
    frecuencia_sibilancias: 'OCASIONAL',
    rinitis_alergica: 'SI',
    frecuencia_actividad_fisica: 'MODERADA',
    diagnostico_asma: 'Asma leve',
    familiares_asma: 'PADRE',
    tipo_enfermedades_respiratorias: 'BRONQUITIS',
    cantidad_mascotas: 2,
    tipo_mascotas: 'PERRO',
    cantidad_hermanos: 1,
    estado_civil_apoderados: 'CASADO',
    viajes_extranjero: 3,
    color_favorito: 'Azul',
    pais: 'PERU',
    imc: 22.5,
    createdBy: 2
  }
];

// ================== Utilidades / Middlewares ==================
function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contieneCaracteresSQL(texto = '') {
  const sospechosos = [`'`, `"`, `--`, `;`, `=`, `%`, `*`, `(`, `)`, `\\`, `#`];
  let count = 0;
  const s = String(texto);
  for (const ch of sospechosos) {
    const re = new RegExp(escapeRegex(ch), 'g');
    const m = s.match(re);
    if (m) count += m.length;
  }
  return count >= 5;
}


// Requiere DNI del apoderado en header
function requireDNI(req, res, next) {
  const dni = req.header('x-dni');
  console.log('🧭 [requireDNI] x-dni recibido =', dni); // <--- LOG
  if (!dni || !/^\d{8}$/.test(String(dni))) {
    return res.status(400).json({ success:false, message:'Falta header x-dni válido (8 dígitos)' });
  }
  req.dni = String(dni); // dni del apoderado (creador)
  next();
}



// Requiere rol doctor (en header x-role=doctor)
function requireDoctor(req, res, next) {
  const role = req.header('x-role');
  if (role !== 'doctor') {
    return res.status(403).json({ success:false, message:'Solo médicos pueden acceder a esta ruta' });
  }
  next();
}

// Fallback de humedad por distrito (si el front no la manda)
const HUMEDAD_FIJA = {
  "Ate": 83.9, "Callao": 88.4, "Comas": 85.6, "Los Olivos": 70.3,
  "Miraflores": 75.3, "San Isidro": 84.9, "San Juan de Lurigancho": 87.0, "Surco": 84.7,
};

// ================== Auth ==================
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      username, password, email, nombre, apellido, dni, tipo_usuario, birthday
    } = req.body;

    if (!username || !password || !email || !nombre || !apellido || !dni || !tipo_usuario || !birthday) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }
    if (contieneCaracteresSQL(password)) {
      return res.status(401).json({ success: false, message: 'Contraseña no válida' });
    }
    if (!/^\d{8}$/.test(String(dni))) {
      return res.status(405).json({ success: false, message: 'DNI debe tener 8 dígitos numéricos' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return res.status(406).json({ success: false, message: 'Fecha inválida, formato YYYY-MM-DD' });
    }

    const [uRows] = await pool.execute(
      'SELECT 1 FROM registros WHERE usuario = ? AND tipo_usuario = ? LIMIT 1',
      [username, tipo_usuario]
    );
    if (uRows.length > 0) {
      return res.status(409).json({ success: false, message: 'Usuario ya existe, cree otro' });
    }

    const [dniRows] = await pool.execute(
      'SELECT 1 FROM registros WHERE DNI = ? LIMIT 1',
      [Number(dni)]
    );
    if (dniRows.length > 0) {
      return res.status(403).json({ success: false, message: 'Ya estás registrado con otro usuario' });
    }

    await pool.execute(
      `INSERT INTO registros
       (DNI, tipo_usuario, nombres, apellidos, usuario, contraseña, correo, fecha_de_nacimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Number(dni), tipo_usuario, nombre, apellido, username, password, email, birthday]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      nombres: nombre,
      apellidos: apellido
    });

  } catch (e) {
    console.error('❌ Error en /api/auth/register:', e);
    return res.status(500).json({ success: false, message: 'Error en el servidor', detail: e.message });
  }
});

app.post('/api/auth/login/doctor', async (req, res) => {
  const username = req.body["usuario"];
  const password = req.body["contraseña"];

  if (contieneCaracteresSQL(password)) {
    return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registros WHERE usuario = ? AND tipo_usuario = ? LIMIT 1',
      [username, 'doctor']
    );

    if (rows.length === 0) {
      return res.status(402).json({ success:false, message:'Credenciales incorrectas' });
    }

    const ok = rows[0].usuario === username && rows[0].contraseña === password;
    if (!ok) {
      return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
    }

    return res.json({
      success: true,
      usuario: rows[0].apellidos,
      dni: rows[0].DNI,
      role: 'doctor'
    });

  } catch (e) {
    console.error('Login doctor error:', e);
    return res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

app.post('/api/auth/login/apoderado', async (req, res) => {
  const username = (req.body["usuario"] || '').trim();
  const password = (req.body["contraseña"] || '').trim();

  if (!username || !password) {
    return res.status(400).json({ success:false, message:'Faltan credenciales' });
  }
  if (contieneCaracteresSQL(password)) {
    return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT *
         FROM registros
        WHERE LOWER(usuario) = LOWER(?)
          AND tipo_usuario = 'apoderado'
        LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(402).json({ success:false, message:'Credenciales incorrectas' });
    }

    const ok = rows[0].usuario && rows[0]['contraseña'] === password;
    if (!ok) {
      return res.status(401).json({ success:false, message:'Credenciales incorrectas' });
    }

    return res.json({
      success: true,
      nombres: rows[0].nombres,
      apellidos: rows[0].apellidos,
      dni: rows[0].DNI,
      role: 'user'
    });
  } catch (e) {
    console.error('Login apoderado error:', e);
    return res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

// ================== PREDICCIÓN (INSERT + LLAMADA A PYTHON POR HTTP + UPDATE) ==================
app.post('/prediccion', requireDNI, async (req, res) => {
  const creado_por_dni = Number(req.dni);

  try {
    const b = req.body || {};
    const dniPaciente = String(b.DNI || b.dni || '').trim();

    if (!/^\d{8}$/.test(dniPaciente)) {
      return res.status(400).json({ success:false, message:'DNI del paciente inválido' });
    }
    if (!b.paciente || !b.fecha_cita || !b.distrito) {
      return res.status(400).json({ success:false, message:'Faltan campos requeridos (paciente/fecha_cita/distrito)' });
    }

    const trimStr = (x) => String(x || '').trim();
    const toNum   = (x) => (x === '' || x === null || x === undefined) ? null : Number(x);

    // Humedad fallback (solo para la BD; el microservicio recalcula por distrito)
    let humedad = b['humedad (%)'];
    if (humedad === undefined || humedad === '' || humedad === null) {
      const h = HUMEDAD_FIJA[trimStr(b.distrito)] ?? 0;
      humedad = h;
    }

    // Índice alérgico
    const rinitis  = Number(b['presencia de rinitis alergica u otras alergias'] || 0);
    const expo     = Number(b['exposicion a alergenos'] || 0);
    const mascota  = Number(b['presencia de mascotas en el hogar'] || 0);
    const tipoMasc = Number(b['tipo de mascotas'] || 0);
    const indice_alergico = rinitis + expo + mascota + (tipoMasc === 2 ? 1 : 0);

    // 1) INSERT en tu tabla pacientes_asma
    const sqlInsert = `
      INSERT INTO pacientes_asma (
        creado_por_dni, dni, paciente, genero, annos, fecha_cita, distrito, distrito_cod, \`humedad (%)\`,
        \`historial familiar de asma\`, \`familiares con asma\`,
        \`antecedentes de enfermedades respiratorias\`, \`tipo de enfermedades respiratorias\`,
        \`presencia de mascotas en el hogar\`, \`cantidad de mascotas\`, \`tipo de mascotas\`,
        \`exposicion a alergenos\`, \`frecuencia de episodios de sibilancias\`,
        \`presencia de rinitis alergica u otras alergias\`, \`frecuencia de actividad fisica\`,
        indice_alergico, target, probabilidad_riesgo, interpretacion
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    const paramsInsert = [
      creado_por_dni,
      Number(dniPaciente),
      trimStr(b.paciente),
      trimStr(b.genero),
      toNum(b.annos),
      trimStr(b.fecha_cita),        // YYYY-MM-DD
      trimStr(b.distrito),
      trimStr(b.distrito_cod),
      Number(humedad),

      toNum(b['historial familiar de asma']),
      toNum(b['familiares con asma']),
      toNum(b['antecedentes de enfermedades respiratorias']),
      toNum(b['tipo de enfermedades respiratorias']),
      toNum(b['presencia de mascotas en el hogar']),
      toNum(b['cantidad de mascotas']),
      toNum(b['tipo de mascotas']),
      toNum(b['exposicion a alergenos']),
      toNum(b['frecuencia de episodios de sibilancias']),
      toNum(b['presencia de rinitis alergica u otras alergias']),
      toNum(b['frecuencia de actividad fisica']),
      Number(indice_alergico),

      null, null, null
    ];
    await pool.execute(sqlInsert, paramsInsert);

    // 2) LLAMAR AL BACKEND PYTHON POR HTTP (FastAPI)
    const mlBaseUrl =
      process.env.ML_API_URL
      || 'https://pythonnuevo-asg0e6hjfxdsafer.chilecentral-01.azurewebsites.net';

    // 👇 Payload alineado con PacienteIn (usando aliases con espacios)
    const payloadForPython = {
      dni: dniPaciente,
      paciente: trimStr(b.paciente),
      genero: Number(b.genero || 0),
      fecha_cita: trimStr(b.fecha_cita),
      distrito: trimStr(b.distrito),

      "humedad (%)": Number(humedad),
      annos: Number(b.annos || 0),
      "historial familiar de asma": Number(b['historial familiar de asma'] || 0),
      "familiares con asma": Number(b['familiares con asma'] || 0),
      "antecedentes de enfermedades respiratorias": Number(b['antecedentes de enfermedades respiratorias'] || 0),
      "tipo de enfermedades respiratorias": Number(b['tipo de enfermedades respiratorias'] || 0),
      "presencia de mascotas en el hogar": Number(b['presencia de mascotas en el hogar'] || 0),
      "cantidad de mascotas": Number(b['cantidad de mascotas'] || 0),
      "tipo de mascotas": Number(b['tipo de mascotas'] || 0),
      "exposicion a alergenos": Number(b['exposicion a alergenos'] || 0),
      "frecuencia de episodios de sibilancias": Number(b['frecuencia de episodios de sibilancias'] || 0),
      "presencia de rinitis alergica u otras alergias": Number(b['presencia de rinitis alergica u otras alergias'] || 0),
      "frecuencia de actividad fisica": Number(b['frecuencia de actividad fisica'] || 0),
      indice_alergico: Number(indice_alergico)
    };

    console.log('📡 Llamando API ML en:', `${mlBaseUrl}/prediccion`);
    console.log('📦 Payload que se envía al ML:', payloadForPython);

    let pred;
    try {
      const mlResponse = await axios.post(
        `${mlBaseUrl}/prediccion`,
        payloadForPython,
        { timeout: 15000 }
      );

      console.log('✅ Respuesta ML status:', mlResponse.status);
      console.log('✅ Respuesta ML data:', mlResponse.data);

      pred = mlResponse.data;

    } catch (err) {
      const status = err.response?.status;
      const data   = err.response?.data;

      console.error('❌ Error llamando API ML');
      console.error('   URL:', `${mlBaseUrl}/prediccion`);
      console.error('   Status:', status);
      console.error('   Data:', data);
      console.error('   Message:', err.message);

      return res.status(500).json({
        success: false,
        message: 'Error llamando al predictor',
        ml_status: status,
        ml_error: data || err.message,
        ml_url: `${mlBaseUrl}/prediccion`,
      });
    }

    const prob = Number(pred.probabilidad_riesgo || 0);
    const interpr = String(pred.interpretacion || '');
    const target_pred = Number(
      pred.target !== undefined ? pred.target : (pred.target_pred ?? 0)
    );

    // 3) UPDATE de ESA MISMA FILA CON LOS RESULTADOS DEL MODELO
    const sqlUpdate = `
      UPDATE pacientes_asma
      SET probabilidad_riesgo = ?, interpretacion = ?, target = ?
      WHERE dni = ? AND fecha_cita = ? AND paciente = ?
        AND \`humedad (%)\` = ? AND indice_alergico = ?
      LIMIT 1
    `;
    const [upd] = await pool.execute(sqlUpdate, [
      prob, interpr, target_pred,
      Number(dniPaciente), String(b.fecha_cita), String(b.paciente),
      Number(humedad), Number(indice_alergico)
    ]);

    if (upd.affectedRows === 0) {
      console.warn('⚠️ UPDATE no encontró la fila recién insertada. Revisa valores de matching.');
    }

    // 4) RESPUESTA AL FRONTEND
    return res.json({
      success: true,
      target: target_pred,
      probabilidad_riesgo: prob,
      interpretacion: interpr
    });

  } catch (e) {
    console.error('❌ /prediccion error:', e);
    return res.status(500).json({ success:false, message:'Error en el servidor', detail: e.message });
  }
});


    // 3) UPDATE de ESA MISMA FILA CON LOS RESULTADOS DEL MODELO
    const sqlUpdate = `
      UPDATE pacientes_asma
      SET probabilidad_riesgo = ?, interpretacion = ?, target = ?
      WHERE dni = ? AND fecha_cita = ? AND paciente = ?
        AND \`humedad (%)\` = ? AND indice_alergico = ?
      LIMIT 1
    `;
    const [upd] = await pool.execute(sqlUpdate, [
      prob, interpr, target_pred,
      Number(dniPaciente), String(b.fecha_cita), String(b.paciente),
      Number(humedad), Number(indice_alergico)
    ]);

    if (upd.affectedRows === 0) {
      console.warn('⚠️ UPDATE no encontró la fila recién insertada. Revisa valores de matching.');
    }

    // 4) RESPUESTA AL FRONTEND
    return res.json({
      success: true,
      target: target_pred,
      probabilidad_riesgo: prob,
      interpretacion: interpr
    });

  } catch (e) {
    console.error('❌ /prediccion error:', e);
    return res.status(500).json({ success:false, message:'Error en el servidor', detail: e.message });
  }
});


// ================== Formularios ==================
// 🔒 Lista SOLO los formularios creados por el apoderado autenticado
// header requerido: x-dni (DNI del apoderado)
// 🔒 Lista SOLO los formularios creados por el apoderado autenticado
// header: x-dni (DNI del apoderado)
app.get('/api/forms/mine', requireDNI, async (req, res) => {
  try {
    const creadorDNI = String(req.dni);
    const sql = `
      SELECT dni, paciente, fecha_cita, annos
      FROM pacientes_asma
      WHERE creado_por_dni = ?
      ORDER BY fecha_cita DESC
    `;
    console.log('🔎 [forms/mine] ejecutando SQL con DNI =', creadorDNI); // <--- LOG
    const [rows] = await pool.execute(sql, [creadorDNI]);
    console.log('📦 [forms/mine] rowsCount =', rows.length, 'sample =', rows[0]); // <--- LOG

    return res.json({ success:true, data: rows });
  } catch (e) {
    console.error('GET /api/forms/mine:', e);
    return res.status(500).json({ success:false, message:'Error al listar' });
  }
});

// GET /api/forms/recent?limit=5&offset=0   (x-role: doctor)
// ⬅️ PÓNLO ANTES de app.get('/api/forms/:dni', ...)

// === PON ESTO ARRIBA, antes de app.get('/api/forms/:dni', requireDoctor, ...) ===
app.get('/api/forms/recent', requireDoctor, async (req, res) => {
  try {
    // sanitizar y acotar
    const limit  = Math.min(parseInt(req.query.limit ?? '5', 10) || 5, 50);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10) || 0, 0);

    // 👇 inyectamos números (ya validados) para evitar el bug de placeholders en LIMIT/OFFSET
    const sql = `
      SELECT
        paciente,
        dni,
        fecha_cita,
        annos,
        genero,
        distrito,
        target,
        probabilidad_riesgo,
        interpretacion
      FROM pacientes_asma
      ORDER BY fecha_cita DESC, dni DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /api/forms/recent ERROR:', e);
    return res.status(500).json({
      success:false,
      message:'Error al listar recientes',
      detail: e.message
    });
  }
});



// GET /api/forms/detail?dni=XXXXXXXX&fecha=YYYY-MM-DD&paciente=Nombre Apellido
app.get('/api/forms/detail', requireDoctor, async (req, res) => {
  try {
    const { dni, fecha, paciente } = req.query;
    if (!/^\d{8}$/.test(String(dni)) || !fecha || !paciente) {
      return res.status(400).json({ success:false, message:'Parámetros inválidos' });
    }
    const [rows] = await pool.execute(
      `SELECT *
         FROM pacientes_asma
        WHERE dni = ?
          AND fecha_cita = ?
          AND paciente = ?
        ORDER BY fecha_cita DESC
        LIMIT 1`,
      [Number(dni), String(fecha), String(paciente)]
    );
    return res.json({ success:true, data: rows[0] || null });
  } catch (e) {
    console.error('GET /api/forms/detail ERROR:', e);
    return res.status(500).json({ success:false, message:'Error al obtener detalle' });
  }
});




// Solo médico
// Solo médico
app.get('/api/forms/:dni', requireDoctor, async (req, res) => {
  try {
    const dni = Number(req.params.dni);
    if (!dni || String(dni).length !== 8) {
      return res.status(400).json({ success:false, message:'DNI inválido' });
    }
    const [rows] = await pool.execute(
      `SELECT dni, paciente, fecha_cita, annos, target, probabilidad_riesgo, interpretacion
         FROM pacientes_asma
        WHERE dni = ?
        ORDER BY fecha_cita DESC`,
      [dni]
    );
    res.json({ success:true, data: rows });
  } catch (e) {
    console.error('GET /api/forms/:dni:', e);
    res.status(500).json({ success:false, message:'Error al listar' });
  }
});

//------------
// ================== Formularios (doctor) ==================
// Últimos formularios (paginados) -> por defecto 5
// GET /api/forms/recent?limit=5&offset=0
// ================== Formularios (doctor) ==================
// GET /api/forms/recent?limit=5&offset=0
// ================== Formularios recientes (doctor) ==================
// GET /api/forms/recent?limit=5&offset=0
// Header requerido: x-role=doctor




//---------------


// ================== Users (mock/local) ==================
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DNI as id, usuario as username, nombres as name, correo as email, DNI as dni FROM registros WHERE tipo_usuario = ?',
      ['user']
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, name, email, dni } = req.body;
  try {
    await pool.execute(
      `INSERT INTO registros (DNI, tipo_usuario, nombres, apellidos, usuario, contraseña, correo, fecha_de_nacimiento)
       VALUES (?, 'user', ?, '', ?, ?, ?, '2000-01-01')`,
      [Number(dni), name, username, password, email]
    );
    res.json({ success:true, message:'Usuario creado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params; // DNI
  const { username, password, name, email } = req.body;
  try {
    await pool.execute(
      `UPDATE registros
       SET usuario = COALESCE(?, usuario),
           contraseña = COALESCE(?, contraseña),
           nombres = COALESCE(?, nombres),
           correo = COALESCE(?, correo)
       WHERE DNI = ? AND tipo_usuario = 'user'`,
      [username, password, name, email, Number(id)]
    );
    res.json({ success:true, message:'Usuario actualizado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params; // DNI
  try {
    await pool.execute(
      'DELETE FROM registros WHERE DNI = ? AND tipo_usuario = ?',
      [Number(id), 'user']
    );
    res.json({ success:true, message:'Usuario eliminado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Error en el servidor' });
  }
});

// ================== Doctors (mock/local) ==================
app.get('/api/doctors', (req, res) => {
  const doctorList = doctors.map(d => ({
    id: d.id, username: d.username, name: d.name, email: d.email, specialty: d.specialty
  }));
  res.json({ success: true, data: doctorList });
});

app.post('/api/doctors', (req, res) => {
  const { username, password, name, email, specialty } = req.body;
  const newDoctor = { id: Date.now(), username, password, role: 'doctor', name, email, specialty };
  doctors.push(newDoctor);
  res.json({ success: true, message: 'Doctor creado correctamente', data: newDoctor });
});

app.put('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, name, email, specialty } = req.body;
  const idx = doctors.findIndex(u => u.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ success:false, message:'Doctor no encontrado' });
  doctors[idx] = { ...doctors[idx], username: username || doctors[idx].username, password: password || doctors[idx].password, name: name || doctors[idx].name, email: email || doctors[idx].email, specialty: specialty || doctors[idx].specialty };
  res.json({ success:true, message:'Doctor actualizado correctamente', data: doctors[idx] });
});

app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const idx = doctors.findIndex(u => u.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ success:false, message:'Doctor no encontrado' });
  doctors.splice(idx, 1);
  res.json({ success:true, message:'Doctor eliminado correctamente' });
});

// ================== Patients (mock/local) ==================
app.get('/api/patients', (req, res) => {
  res.json({ success:true, data: patients });
});

app.post('/api/patients', (req, res) => {
  const patientData = req.body;
  const newPatient = { id: Date.now(), ...patientData, createdBy: req.headers['user-id'] || 1 };
  patients.push(newPatient);
  res.json({ success:true, message:'Paciente creado correctamente', data: newPatient });
});

app.put('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const patientData = req.body;
  const idx = patients.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ success:false, message:'Paciente no encontrado' });
  patients[idx] = { ...patients[idx], ...patientData };
  res.json({ success:true, message:'Paciente actualizado correctamente', data: patients[idx] });
});

app.delete('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const idx = patients.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ success:false, message:'Paciente no encontrado' });
  patients.splice(idx, 1);
  res.json({ success:true, message:'Paciente eliminado correctamente' });
});

// ================== Root ==================
app.get('/', (req, res) => {
  res.json({
    message: 'API del Centro Médico del ASMA funcionando correctamente',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/login/doctor',
      'POST /api/auth/login/apoderado',
      'POST /api/auth/register',
      'POST /prediccion',
      'GET  /api/forms/mine',
      'GET  /api/forms/:dni (doctor)',
    ]
  });
});

// ================== Start ==================
app.listen(PORT, () => {
  console.log(`🚀 Servidor del Centro Médico del ASMA corriendo en http://localhost:${PORT}`);
  console.log(`API en http://localhost:${PORT}`);
});
// ================== fin server.js ==================
