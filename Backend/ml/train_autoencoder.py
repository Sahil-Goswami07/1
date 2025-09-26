import os, json, math
from datetime import datetime
import pandas as pd
import numpy as np
from pymongo import MongoClient
from tensorflow import keras
from tensorflow.keras import layers

"""
Train a simple dense autoencoder for anomaly detection on certificate metadata.
Saves model to Backend/ml/model.h5
Features used (same order for scoring):
  marksPercent, issueYear, certNoLength, nameLength, rollPatternScore
Anomaly score at inference = reconstruction error normalized 0..1
"""

MONGO_URI = os.environ.get('MONGO_URI','mongodb://localhost:27017/eduauth')
DB_NAME = os.environ.get('DB_NAME')
client = MongoClient(MONGO_URI)
if DB_NAME is None:
    DB_NAME = client.get_default_database().name if client.get_default_database() else 'eduauth'

db = client[DB_NAME]
certs_col = db['certificates']
students_col = db['students']
certs = list(certs_col.find({}, {'certNo':1,'marksPercent':1,'issueDate':1,'studentId':1}))
if not certs:
    print(json.dumps({'error':'no certificates found'}))
    raise SystemExit
student_ids = {c.get('studentId') for c in certs if c.get('studentId')}
student_map = {}
if student_ids:
    for s in students_col.find({'_id': {'$in': list(student_ids)}}, {'name':1,'rollNo':1}):
        student_map[s['_id']] = s

rows = []
for c in certs:
    marks = c.get('marksPercent')
    issue = c.get('issueDate')
    try:
        issueYear = datetime.fromisoformat(issue.replace('Z','')).year if issue else 0
    except Exception:
        issueYear = 0
    student = student_map.get(c.get('studentId'))
    nameLen = len(student.get('name','')) if student else 0
    roll = (student or {}).get('rollNo','')
    upper_ratio = sum(ch.isupper() for ch in roll)/len(roll) if roll else 0
    digit_ratio = sum(ch.isdigit() for ch in roll)/len(roll) if roll else 0
    rollPatternScore = (upper_ratio + digit_ratio)/2
    certNo = c.get('certNo','')
    rows.append({
        'marksPercent': marks if marks is not None else math.nan,
        'issueYear': issueYear,
        'certNoLength': len(certNo),
        'nameLength': nameLen,
        'rollPatternScore': rollPatternScore
    })

df = pd.DataFrame(rows)
if df['marksPercent'].isna().all():
    df['marksPercent'] = 0
else:
    df['marksPercent'] = df['marksPercent'].fillna(df['marksPercent'].median())

X = df[['marksPercent','issueYear','certNoLength','nameLength','rollPatternScore']].astype(float).values
# Normalize each feature (min-max) and store stats
mins = X.min(axis=0)
maxs = X.max(axis=0)
range_safe = np.where(maxs - mins == 0, 1, maxs - mins)
Xn = (X - mins)/range_safe

input_dim = Xn.shape[1]
encoding_dim = max(2, input_dim // 2)
inputs = keras.Input(shape=(input_dim,))
encoded = layers.Dense(8, activation='relu')(inputs)
encoded = layers.Dense(encoding_dim, activation='relu')(encoded)
decoded = layers.Dense(8, activation='relu')(encoded)
outputs = layers.Dense(input_dim, activation='sigmoid')(decoded)
model = keras.Model(inputs, outputs)
model.compile(optimizer='adam', loss='mse')
model.fit(Xn, Xn, epochs=30, batch_size=16, verbose=0)

# Save model + normalization stats
os.makedirs(os.path.join('Backend','ml'), exist_ok=True)
model_path = os.path.join('Backend','ml','model.h5')
model.save(model_path)
np.save(os.path.join('Backend','ml','norm_mins.npy'), mins)
np.save(os.path.join('Backend','ml','norm_maxs.npy'), maxs)
print(json.dumps({'ok':True,'samples':len(X),'saved':model_path}))
