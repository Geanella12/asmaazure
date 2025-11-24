import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# ============ Config ============
load_dotenv()
DB_URL = os.getenv("DB_URL", "mysql+pymysql://root:admin@127.0.0.1:3306/asma")
PORT = int(os.getenv("PORT", "3000"))
MODEL_PATH = "train_rf_asma.pkl"

# distritos → humedad fija (blindaje)
HUMEDAD_FIJA = {
    "ate": 83.9, "callao": 88.4, "comas": 85.6, "los olivos": 70.3,
    "miraflores": 75.3, "san isidro": 84.9, "san juan de lurigancho": 87.0, "surco": 84.7
}

# Carga modelo
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"No encuentro {MODEL_PATH}. Entrena antes y coloca el .pkl junto a este main.py")
bundle = joblib.load(MODEL_PATH)
rf = bundle["modelo"]
TH = float(bundle.get("umbral", 0.5))
FEATURES = bundle["features"]  # debe coincidir con lo entrenado

# Conexión MySQL
engine = create_engine(DB_URL, pool_pre_ping=True)

# ============ FastAPI ============
app = FastAPI(title="Asma Predict API", version="1.0.0")

# CORS (permite tu frontend local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # cámbialo a tu dominio en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Schemas ============
class PacienteIn(BaseModel):
    # meta (no son features del modelo)
    dni: str
    paciente: str
    genero: int = Field(..., description="M=0, F=1")
    fecha_cita: str
    distrito: str

    # features exactas (nombres con espacios tal cual)
    humedad: float = Field(..., alias="humedad (%)")
    annos: int
    historial_familiar_asma: int = Field(..., alias="historial familiar de asma")
    familiares_con_asma: int = Field(..., alias="familiares con asma")
    antecedentes_enf_resp: int = Field(..., alias="antecedentes de enfermedades respiratorias")
    tipo_enf_resp: int = Field(..., alias="tipo de enfermedades respiratorias")
    presencia_mascotas: int = Field(..., alias="presencia de mascotas en el hogar")
    cantidad_mascotas: int = Field(..., alias="cantidad de mascotas")
    tipo_mascotas: int = Field(..., alias="tipo de mascotas")
    exposicion_alergenos: int = Field(..., alias="exposicion a alergenos")
    frec_sibilancias: int = Field(..., alias="frecuencia de episodios de sibilancias")
    rinitis_alergica: int = Field(..., alias="presencia de rinitis alergica u otras alergias")
    frec_actividad: int = Field(..., alias="frecuencia de actividad fisica")
    indice_alergico: float

    class Config:
        allow_population_by_field_name = True  # para usar alias como claves JSON


def interpretar(p: float, th: float, margen: float = 0.10) -> str:
    if p >= th + margen:
        return "Riesgo ALTO (positivo)"
    if p >= th - margen:
        return "Riesgo MEDIO (cercano al umbral)"
    return "Riesgo BAJO (negativo)"


def mapear_humedad_por_distrito(distrito: str) -> float:
    d = (distrito or "").strip().lower()
    if d not in HUMEDAD_FIJA:
        raise HTTPException(status_code=400, detail=f"Distrito desconocido: '{distrito}'.")
    return float(HUMEDAD_FIJA[d])


@app.post("/prediccion")
def prediccion(p: PacienteIn):
    # 1) Blindaje: forzar humedad según distrito
    humedad_fija = mapear_humedad_por_distrito(p.distrito)

    # 2) Preparar features en el orden EXACTO del entrenamiento
    fila = {
        "humedad (%)": humedad_fija,  # ignoramos lo que venga del front; usamos la fija
        "historial familiar de asma": p.historial_familiar_asma,
        "familiares con asma": p.familiares_con_asma,
        "antecedentes de enfermedades respiratorias": p.antecedentes_enf_resp,
        "tipo de enfermedades respiratorias": p.tipo_enf_resp,
        "presencia de mascotas en el hogar": p.presencia_mascotas,
        "cantidad de mascotas": p.cantidad_mascotas,
        "tipo de mascotas": p.tipo_mascotas,
        "exposicion a alergenos": p.exposicion_alergenos,
        "frecuencia de episodios de sibilancias": p.frec_sibilancias,
        "presencia de rinitis alergica u otras alergias": p.rinitis_alergica,
        "frecuencia de actividad fisica": p.frec_actividad,
        "indice_alergico": p.indice_alergico,
    }

    # asegurar que coincidan las features
    for f in FEATURES:
        if f not in fila:
            raise HTTPException(status_code=400, detail=f"Falta feature requerida: '{f}'")

    X = pd.DataFrame([fila], columns=FEATURES)
    prob = float(rf.predict_proba(X)[:, 1][0])
    prob = round(prob, 4)
    target_pred = int(prob >= TH)
    interpre = interpretar(prob, TH)

    # 3) Guardar/actualizar en MySQL
    #   3a) upsert en pacientes_asma (básico). Si tu tabla ya existe con PK en 'paciente', esto hará REPLACE.
    try:
        with engine.begin() as conn:
            # crear tabla si no existe (simple)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pacientes_asma (
                  dni VARCHAR(20), paciente VARCHAR(100), genero INT, fecha_cita DATE,
                  distrito VARCHAR(64),
                  `humedad (%)` DECIMAL(5,2),
                  annos INT,
                  `historial familiar de asma` INT,
                  `familiares con asma` INT,
                  `antecedentes de enfermedades respiratorias` INT,
                  `tipo de enfermedades respiratorias` INT,
                  `presencia de mascotas en el hogar` INT,
                  `cantidad de mascotas` INT,
                  `tipo de mascotas` INT,
                  `exposicion a alergenos` INT,
                  `frecuencia de episodios de sibilancias` INT,
                  `presencia de rinitis alergica u otras alergias` INT,
                  `frecuencia de actividad fisica` INT,
                  indice_alergico DECIMAL(5,2)
                );
            """))
            # insert (puedes mejorar a UPSERT con PK según tu esquema)
            conn.execute(
                text("""
                    INSERT INTO pacientes_asma
                    (dni, paciente, genero, fecha_cita, distrito, `humedad (%)`, annos,
                     `historial familiar de asma`, `familiares con asma`,
                     `antecedentes de enfermedades respiratorias`, `tipo de enfermedades respiratorias`,
                     `presencia de mascotas en el hogar`, `cantidad de mascotas`, `tipo de mascotas`,
                     `exposicion a alergenos`, `frecuencia de episodios de sibilancias`,
                     `presencia de rinitis alergica u otras alergias`, `frecuencia de actividad fisica`,
                     indice_alergico)
                    VALUES
                    (:dni, :paciente, :genero, :fecha_cita, :distrito, :humedad, :annos,
                     :hist_hist, :fam_asma,
                     :ant_resp, :tipo_resp,
                     :pres_masc, :cant_masc, :tipo_masc,
                     :expo_alerg, :frec_sib,
                     :rinitis, :frec_act,
                     :indice)
                """),
                {
                    "dni": p.dni, "paciente": p.paciente, "genero": p.genero, "fecha_cita": p.fecha_cita,
                    "distrito": p.distrito, "humedad": humedad_fija, "annos": p.annos,
                    "hist_hist": p.historial_familiar_asma, "fam_asma": p.familiares_con_asma,
                    "ant_resp": p.antecedentes_enf_resp, "tipo_resp": p.tipo_enf_resp,
                    "pres_masc": p.presencia_mascotas, "cant_masc": p.cantidad_mascotas, "tipo_masc": p.tipo_mascotas,
                    "expo_alerg": p.exposicion_alergenos, "frec_sib": p.frec_sibilancias,
                    "rinitis": p.rinitis_alergica, "frec_act": p.frec_actividad,
                    "indice": p.indice_alergico
                }
            )

            #   3b) upsert tablas de salida simples
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS probabilidad_riesgo (paciente VARCHAR(100), probabilidad_riesgo DECIMAL(6,4));
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS interpretacion (paciente VARCHAR(100), interpretacion VARCHAR(64));
            """))

            # limpia previos y escribe actuales (simple)
            conn.execute(text("DELETE FROM probabilidad_riesgo WHERE paciente=:pac"), {"pac": p.paciente})
            conn.execute(text("INSERT INTO probabilidad_riesgo (paciente, probabilidad_riesgo) VALUES (:pac, :pr)"),
                         {"pac": p.paciente, "pr": prob})
            conn.execute(text("DELETE FROM interpretacion WHERE paciente=:pac"), {"pac": p.paciente})
            conn.execute(text("INSERT INTO interpretacion (paciente, interpretacion) VALUES (:pac, :it)"),
                         {"pac": p.paciente, "it": interpre})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir en MySQL: {e}")

    # 4) Respuesta para el frontend
    return {
        "target": target_pred,                 # predicción binaria por umbral guardado
        "probabilidad_riesgo": prob,          # 0..1 (redondeado a 4)
        "interpretacion": interpre
        # "archivo_pdf": ""  # si luego generas PDFs, aquí mandas base64 o URL
    }


@app.get("/health")
def health():
    # chequear DB y modelo
    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
    return {"ok": True, "umbral": TH, "features": FEATURES}
