# predictor_cli.py
import sys, json, joblib
import numpy as np

# Carga el modelo entrenado
bundle = joblib.load("modelo_asma_rf.pkl")
rf = bundle["modelo"]
features = bundle["features"]

def interpretar(p):
    if p >= 0.75:
        return "Riesgo ALTO (positivo)"
    elif p >= 0.45:
        return "Riesgo MEDIO (cercano al umbral)"
    else:
        return "Riesgo BAJO (negativo)"

def main():
    # Lee JSON por stdin
    raw = sys.stdin.read()
    data = json.loads(raw)

    # Construye vector en el MISMO orden de 'features'
    x = []
    for f in features:
        v = data.get(f, 0)
        try:
            v = float(v)
        except:
            v = 0.0
        x.append(v)

    prob = float(rf.predict_proba([x])[0,1])
    target_pred = 1 if prob >= 0.5 else 0
    resp = {
        "probabilidad_riesgo": round(prob, 4),
        "interpretacion": interpretar(prob),
        "target_pred": int(target_pred)
    }
    print(json.dumps(resp))

if __name__ == "__main__":
    main()
