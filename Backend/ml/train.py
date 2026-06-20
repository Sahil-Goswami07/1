import os
import sys
import json
import math
from datetime import datetime
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
import joblib

"""
Train an IsolationForest on certificate metadata.
Environment variables expected:
  MONGO_URI (fallback mongodb://localhost:27017/eduauth)
  DB_NAME   (optional)
Model saved as ml/model.pkl relative to repo root (invoked from Backend/).
Features per certificate:
  marksPercent (filled with median if missing)
  issueYear
  certNoLength
  nameLength (student name length)
  rollPatternScore (heuristic: length ratio & uppercase proportion)
"""

def get_env(name, default=None):
    return os.environ.get(name, default)

MONGO_URI = get_env('MONGO_URI', 'mongodb://localhost:27017/eduauth')
DB_NAME = get_env('DB_NAME', None)

client = MongoClient(MONGO_URI)
if DB_NAME is None:
    # derive DB from URI last path
    default_db = client.get_default_database()
    DB_NAME = default_db.name if default_db is not None else 'eduauth'

db = client[DB_NAME]
certs_col = db['certificates']
students_col = db['students']

certs = list(certs_col.find({}, {'certNo':1,'marksPercent':1,'issueDate':1,'studentId':1}))
if not certs:
    print(json.dumps({'error':'no certificates found'}))
    sys.exit(1)

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
        issueYear = datetime.fromisoformat(issue.replace('Z','')) .year if issue else 0
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
        'rollPatternScore': rollPatternScore,
        'logoSimilarity': 1.0,
        'sealSimilarity': 1.0,
        'metadataRisk': 0.0,
        'tamperingScore': 0.0,
        'layoutSimilarity': 1.0,
        'qrScore': 1.0
    })

df = pd.DataFrame(rows)
# Impute median for marks
if df['marksPercent'].isna().all():
    df['marksPercent'] = 0
else:
    df['marksPercent'] = df['marksPercent'].fillna(df['marksPercent'].median())

# IsolationForest expects numeric matrix
X = df[['marksPercent','issueYear','certNoLength','nameLength','rollPatternScore','logoSimilarity','sealSimilarity','metadataRisk','tamperingScore','layoutSimilarity','qrScore']].values

model = IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
model.fit(X)

script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, 'model.pkl')
joblib.dump({'model': model}, model_path)
print(json.dumps({'ok': True, 'saved': model_path, 'samples': len(df)}))
