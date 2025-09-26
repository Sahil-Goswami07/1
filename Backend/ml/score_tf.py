import os, sys, json, numpy as np
from tensorflow import keras

"""Score using autoencoder model.h5.
Input stdin JSON: {"features":[... same order ...]}
Output: {"anomalyScore": float}
Reconstruction error mapped to 0..1.
"""
model_path = os.path.join('Backend','ml','model.h5')
mins_path = os.path.join('Backend','ml','norm_mins.npy')
maxs_path = os.path.join('Backend','ml','norm_maxs.npy')
if not os.path.exists(model_path):
    print(json.dumps({'error':'model not found'}))
    raise SystemExit

raw = sys.stdin.read()
try:
    data = json.loads(raw)
    feats = data['features']
except Exception as e:
    print(json.dumps({'error':'invalid input','detail':str(e)}))
    raise SystemExit

model = keras.models.load_model(model_path)
mins = np.load(mins_path)
maxs = np.load(maxs_path)
arr = np.array(feats, dtype=float).reshape(1,-1)
range_safe = np.where(maxs - mins == 0, 1, maxs - mins)
arr_n = (arr - mins)/range_safe
recon = model.predict(arr_n, verbose=0)
err = np.mean((recon - arr_n)**2)
# Map error to 0..1 with logistic scaling; adjust 25 factor based on empirical spread
anom = 1 - np.exp(-25 * err)
# Bound 0..1
anom = float(max(0.0, min(1.0, anom)))
print(json.dumps({'anomalyScore': anom, 'reconstructionError': float(err)}))
