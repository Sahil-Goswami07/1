import os, sys, json, joblib
import numpy as np

"""
Score a single feature vector using saved IsolationForest model.
Input: JSON on stdin {"features":[marksPercent, issueYear, certNoLength, nameLength, rollPatternScore]}
Output: {"anomalyScore": float}
Anomaly score normalized to 0-1 where higher = more anomalous.
"""

model_path = os.path.join('Backend','ml','model.pkl')
if not os.path.exists(model_path):
    print(json.dumps({'error':'model not found'}))
    sys.exit(1)

bundle = joblib.load(model_path)
model = bundle['model']
raw = sys.stdin.read()
try:
    data = json.loads(raw)
    feats = data['features']
except Exception as e:
    print(json.dumps({'error':'invalid input','detail':str(e)}))
    sys.exit(1)

arr = np.array(feats).reshape(1,-1)
# IsolationForest decision_function: higher => less anomalous; we invert
# decision_function gives centered scores ~ higher normal; we transform to 0..1 anomaly
score = model.decision_function(arr)[0]
pred = model.predict(arr)[0]  # -1 anomalous, 1 normal
# For normalization, collect training score range if stored later; simple sigmoid-like transform now
norm = 1 / (1 + np.exp(5*score))  # invert & squash
if pred == -1 and norm < 0.5:
    norm = max(norm, 0.7)  # ensure clearly anomalous
print(json.dumps({'anomalyScore': float(norm)}))
