# predictor_cli.py
import time
import joblib
import numpy as np
import json
import sys

# Leer datos desde Node (JSON)
entrada = json.loads(sys.stdin.read())  # Node envía datos por stdin

modelo_dict = joblib.load('modelo_asma_rf.pkl')
modelo = modelo_dict["modelo"]

entrada_np = np.array([entrada])

inicio = time.time()
pred = modelo.predict(entrada_np)[0]
fin = time.time()

tiempo = fin - inicio

# Devolver predicción Y tiempo a Node
print(json.dumps({
    "prediccion": int(pred),
    "tiempo_respuesta": tiempo
}))
