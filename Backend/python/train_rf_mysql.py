# train_rf_mysql.py
import numpy as np
import pandas as pd
import joblib
from sqlalchemy import create_engine, text
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# ========= CONFIG DB (ajusta usuario/clave si aplica) =========
DB_URL = "mysql+pymysql://root:admin@localhost:3306/asma"
TABLE  = "pacientes_asma"
TARGET = "target"
SEED   = 42

# ========= HUMEDAD FIJA POR DISTRITO (por si falta 'humedad (%)') =========
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

# ========= CONEXIÓN Y CARGA =========
engine = create_engine(DB_URL)
df = pd.read_sql(f"SELECT * FROM {TABLE};", engine)
print(f"✅ Datos cargados: {len(df)} filas")

# ========= LIMPIEZA BÁSICA =========
# descarta filas sin dni (dni es la llave que usaremos para actualizar)
if "dni" not in df.columns:
    raise ValueError("La tabla no tiene columna 'dni' (se requiere para actualizar).")

# normaliza fecha (no se usa para entrenar)
if "fecha_cita" in df.columns:
    df["fecha_cita"] = pd.to_datetime(df["fecha_cita"], errors="coerce")

# si no existe 'humedad (%)' intenta derivarla desde 'distrito'
if "humedad (%)" not in df.columns and "distrito" in df.columns:
    dnorm = df["distrito"].astype(str).str.strip().str.lower()
    df["humedad (%)"] = dnorm.map(HUMEDAD_FIJA).astype(float)

# ignora columnas administrativas/no predictoras
IGNORE = {"creado_por_dni", "dni", "paciente", "genero", "fecha_cita", "distrito"}

# asegúrate de tener TARGET
if TARGET not in df.columns:
    raise ValueError(f"No existe la columna '{TARGET}' en {TABLE}")

# convierte target a 0/1 y quita filas sin target válido
df[TARGET] = (
    df[TARGET]
    .astype(str)
    .str.strip()
    .str.lower()
    .replace({
        "asma": 1, "sí asma": 1, "si asma": 1, "positivo": 1, "1": 1,
        "no asma": 0, "sin asma": 0, "negativo": 0, "0": 0,
        "nan": np.nan, "none": np.nan, "": np.nan
    })
)
df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")

antes = len(df)
df = df.dropna(subset=["dni", TARGET])
df[TARGET] = df[TARGET].astype(int)
print(f"🔎 Filas totales: {antes} | Filas con dni y target válido: {len(df)}")

# ========= DEFINIR FEATURES =========
# Excluir target, probabilidad/interpretación si ya existen y las IGNORE
excluir = {TARGET, "probabilidad_riesgo", "interpretacion"} | IGNORE
FEATURES = [c for c in df.columns if c not in excluir]

if "humedad (%)" not in FEATURES:
    print("⚠️ Nota: 'humedad (%)' no está en FEATURES (no existe o no se pudo derivar).")

if len(FEATURES) == 0:
    raise ValueError("No hay columnas de entrada (FEATURES) para entrenar.")

print(f"🧩 FEATURES ({len(FEATURES)}): {FEATURES}")

# convierte todas las features a numérico (rellena NaN con 0)
for c in FEATURES:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df[FEATURES] = df[FEATURES].fillna(0)

# ========= MATRICES =========
X = df[FEATURES].copy()
y = df[TARGET].copy()
dni_series = df["dni"].astype(str).copy()  # guardamos dni para update posterior

# ========= SPLIT (80/20) =========
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.20, stratify=y, random_state=SEED
)

# ========= ENTRENAR RF =========
rf = RandomForestClassifier(
    n_estimators=800,
    max_depth=12,
    min_samples_split=4,
    min_samples_leaf=2,
    max_features="sqrt",
    class_weight="balanced",
    random_state=SEED,
    n_jobs=-1
)
rf.fit(X_tr, y_tr)

# ========= EVALUACIÓN =========
y_pred = rf.predict(X_te)
acc = accuracy_score(y_te, y_pred)
print(f"🎯 Accuracy (test): {acc*100:.2f}%")
print(classification_report(y_te, y_pred, digits=3))

# ========= PROBABILIDADES E INTERPRETACIÓN =========
probs_full = rf.predict_proba(X)[:, 1]
df["probabilidad_riesgo"] = np.round(probs_full, 4)

def interpretar(p):
    if p >= 0.75:
        return "Riesgo ALTO (positivo)"
    elif p >= 0.45:
        return "Riesgo MEDIO (cercano al umbral)"
    else:
        return "Riesgo BAJO (negativo)"

df["interpretacion"] = df["probabilidad_riesgo"].apply(interpretar)

# ========= GUARDAR MODELO =========
joblib.dump(
    {"modelo": rf, "features": FEATURES, "accuracy": float(acc)},
    "modelo_asma_final.pkl"
)
print("💾 Modelo guardado en modelo_asma_final.pkl")

# ========= ACTUALIZAR EN LA MISMA TABLA (JOIN por dni) =========
print("🟢 Actualizando columnas en la tabla principal...")

tmp_name = "tmp_pred_asma"
df_tmp = pd.DataFrame({
    "dni": dni_series,
    "probabilidad_riesgo": df["probabilidad_riesgo"],
    "interpretacion": df["interpretacion"],
})
# crea/reescribe tabla temporal
df_tmp.to_sql(tmp_name, engine, if_exists="replace", index=False)

# hace UPDATE por dni (asegúrate que tipos son compatibles)
with engine.begin() as conn:
    update_sql = f"""
        UPDATE {TABLE} t
        JOIN {tmp_name} s ON CAST(t.dni AS CHAR) = CAST(s.dni AS CHAR)
        SET
          t.probabilidad_riesgo = s.probabilidad_riesgo,
          t.interpretacion      = s.interpretacion
    """
    conn.execute(text(update_sql))
    conn.execute(text(f"DROP TABLE IF EXISTS {tmp_name};"))

print("✅ Tabla actualizada: probabilidad_riesgo e interpretacion listas.")
