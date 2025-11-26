# ================== main.py ==================
import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Any

# ============ CONFIGURACIÓN DEL MODELO ============

# Nombre del archivo .pkl (cámbialo si tu modelo se llama diferente)
MODEL_PATH = os.getenv("MODEL_PATH", "modelo_asma_rf_azure.pkl")

if not os.path.exists(MODEL_PATH):
    # Si ves este error en los logs de Azure, es porque el .pkl no está junto a main.py
    raise RuntimeError(f"No se encuentra el archivo de modelo: {MODEL_PATH}. "
                       f"Verifica que esté subido al mismo directorio en Azure.")

# FEATURES por defecto, por si el .pkl no las trae adentro
FEATURES_DEFAULT = [
    "humedad (%)",
    "historial familiar de asma",
    "familiares con asma",
    "antecedentes de enfermedades respiratorias",
    "tipo de enfermedades respiratorias",
    "presencia de mascotas en el hogar",
    "cantidad de mascotas",
    "tipo de mascotas",
    "exposicion a alergenos",
    "frecuencia de episodios de sibilancias",
    "presencia de rinitis alergica u otras alergias",
    "frecuencia de actividad fisica",
    "indice_alergico",
]

# Carga del modelo
bundle: Any = joblib.load(MODEL_PATH)

if isinstance(bundle, dict):
    RF_MODEL = bundle.get("modelo") or bundle.get("model") or bundle
    FEATURES = bundle.get("features") or bundle.get("feature_names") or FEATURES_DEFAULT
    THRESHOLD = float(bundle.get("umbral", 0.5))
else:
    RF_MODEL = bundle
    FEATURES = FEATURES_DEFAULT
    THRESHOLD = 0.5

# Por si acaso, garantizamos que FEATURES tenga al menos los de defecto
if not FEATURES:
    FEATURES = FEATURES_DEFAULT

# ============ CONSTANTES ============

HUMEDAD_FIJA = {
    "ate": 83.9,
    "callao": 88.4,
    "comas": 85.6,
    "los olivos": 70.3,
    "miraflores": 75.3,
    "san isidro": 84.9,
    "san juan de lurigancho": 87.0,
    "surco": 84.7,
}

# ============ APP FASTAPI ============

app = FastAPI(
    title="Asma Predict API",
    version="1.0.0",
    description="Microservicio de predicción de riesgo de asma infantil (solo modelo ML)."
)

# CORS (puedes restringir luego a tu backend Node)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # luego puedes cambiar a ["https://tu-backend.azurewebsites.net"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ ESQUEMA DE ENTRADA ============

class PacienteIn(BaseModel):
    # Campos meta (no se usan para la predicción, pero Node puede enviarlos igual)
    dni: str
    paciente: str
    genero: int = Field(..., description="M=0, F=1 (no se usa en el modelo)")
    fecha_cita: str
    distrito: str

    # Features del modelo
    # Nota: usamos alias para que puedas enviar nombres con espacios si quieres,
    # pero Node también puede usar los nombres de los atributos (sin espacios).
    humedad: Optional[float] = Field(None, alias="humedad (%)")
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
        allow_population_by_field_name = True  # permite usar el nombre del campo o el alias


# ============ FUNCIONES AUXILIARES ============

def interpretar(prob: float, th: float, margen: float = 0.10) -> str:
    """
    Devuelve un texto amigable según la probabilidad y el umbral.
    """
    if prob >= th + margen:
        return "Riesgo ALTO (positivo)"
    if prob >= th - margen:
        return "Riesgo MEDIO (cercano al umbral)"
    return "Riesgo BAJO (negativo)"


def mapear_humedad_por_distrito(distrito: str) -> float:
    """
    Usa la humedad fija según el distrito. Si el distrito no está mapeado, lanza error 400.
    """
    d = (distrito or "").strip().lower()
    if d not in HUMEDAD_FIJA:
        raise HTTPException(
            status_code=400,
            detail=f"Distrito desconocido o no mapeado para humedad: '{distrito}'. "
                   f"Configura HUMEDAD_FIJA en main.py."
        )
    return float(HUMEDAD_FIJA[d])


# ============ ENDPOINTS ============

@app.get("/health")
def health():
    """
    Endpoint simple para verificar que la API y el modelo están cargados.
    """
    return {
        "ok": True,
        "modelo_cargado": MODEL_PATH,
        "features_esperadas": FEATURES,
        "umbral": THRESHOLD,
    }


@app.post("/prediccion")
def prediccion(p: PacienteIn):
    """
    Recibe los datos del paciente y devuelve:
    - target (0/1)
    - probabilidad_riesgo
    - interpretacion (texto)
    """
    # 1) Determinar humedad según distrito (ignoramos lo que venga en 'humedad' para que sea consistente)
    humedad_val = mapear_humedad_por_distrito(p.distrito)

    # 2) Construir la fila con los nombres EXACTOS que espera el modelo
    fila = {
        "humedad (%)": humedad_val,
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

    # 3) Verificar que todas las features requeridas por el modelo están presentes
    for f in FEATURES:
        if f not in fila:
            raise HTTPException(
                status_code=400,
                detail=f"Falta la feature requerida por el modelo: '{f}'. "
                       f"Revisa el mapeo en main.py."
            )

    # 4) Crear DataFrame en el orden que espera el modelo
    X = pd.DataFrame([fila], columns=FEATURES)

    # 5) Predicción
    try:
        proba = RF_MODEL.predict_proba(X)[:, 1][0]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al predecir con el modelo: {str(e)}"
        )

    prob = round(float(proba), 4)
    target_pred = int(prob >= THRESHOLD)
    texto = interpretar(prob, THRESHOLD)

    # 6) Respuesta (Node puede usar esto para hacer el UPDATE en MySQL)
    return {
        "target": target_pred,
        "probabilidad_riesgo": prob,
        "interpretacion": texto,
        "umbral": THRESHOLD,
    }
