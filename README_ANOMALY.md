# Anomaly Detection Layer

This system adds a second-phase AI anomaly classification on top of deterministic certificate field verification.

## Pipeline Overview
1. Deterministic Scoring (Node.js)
   - Field comparison (cert no, roll, marks %, graduation year, student name with fuzzy normalization)
   - Weighted score (0–100) from `config/scoring.js`
2. Rule Validation
   - Format regex checks (certificate number, roll number)
   - Marks range sanity (0–100)
   - University presence / data existence
   - Failures contribute reasons and can immediately elevate status
3. ML Anomaly Scoring (Python)
   - Primary: TensorFlow Autoencoder (`ml/train_autoencoder.py` -> `model.h5`)
   - Fallback: IsolationForest (`ml/train.py` -> `model.pkl`)
   - Feature Vector (ordered):
     1. marksPercent (0–100)
     2. issueYear (YYYY or 0 if missing)
     3. certNoLength
     4. nameLength (student name chars)
     5. rollPatternScore (ratio of alnum vs total simplified heuristic)
   - Autoencoder reconstruction error mapped to 0–1 anomalyScore
4. Status Mapping
   - Base statuses (verified / partial / failed) from scoring
   - Elevated AI statuses:
     - VERIFIED: rule ok & anomalyScore <= 0.7
     - SUSPICIOUS: rule ok but anomalyScore > 0.7 OR soft rule concerns
     - FAKE: hard rule failure (format / structural) OR anomalyReasons indicating severe issue
   - Values stored in `VerificationLog.status`

## Key Files
| Component | Path |
|-----------|------|
| Rule Validator | `utils/ruleValidator.js` |
| Anomaly Service (Node) | `services/mlAnomaly.js` |
| Verification Controller | `controllers/verifyController.js` |
| Log Schema | `models/VerificationLog.js` |
| TF Training | `ml/train_autoencoder.py` |
| TF Scoring | `ml/score_tf.py` |
| IF Training | `ml/train.py` |
| IF Scoring | `ml/score.py` |

## Configuration
- Deterministic scoring weights & policy: `config/scoring.js`
- Anomaly threshold currently hard-coded at 0.7 in `verifyController.js` (search for `anomalyScore > 0.7`). You can externalize it into `scoring.js` or an env var (`ANOMALY_THRESHOLD`) if runtime tuning is needed.

## Retraining the Autoencoder
1. Gather a CSV or JSON export of known-good (normal) verification logs.
2. Construct training dataset rows with the 5 features in the correct order.
3. Update/extend `train_autoencoder.py` to load your dataset instead of synthetic placeholder (current script may have scaffolding lines; replace with your loader).
4. Create / activate Python environment inside `Backend/ml` directory.
5. Install dependencies:
```
pip install -r requirements.txt
```
6. Run training:
```
python train_autoencoder.py
```
7. The script outputs:
   - `model.h5`
   - `feature_mins.npy`
   - `feature_maxs.npy`
8. Copy or keep these files in `Backend/ml/` so the Node service can locate them at runtime.
9. (Optional) Retrain fallback IsolationForest if you want updated baseline:
```
python train.py
```

## Scoring Internals (Autoencoder)
- Input features normalized using persisted mins/maxs.
- Reconstruction MSE computed per sample.
- Error transformed to 0–1 via logistic mapping: `score = 1 / (1 + exp(-k*(err - m)))` where `k` and `m` chosen heuristically (see `score_tf.py`). Higher = more anomalous.

## Adding / Modifying Features
1. Update feature extraction in `services/mlAnomaly.js` (function `buildFeatureVector`).
2. Update training scripts to match new feature ordering.
3. Regenerate normalization arrays and model.
4. Ensure backward compatibility or perform coordinated deploy (old model vs new vector mismatch).

## CSV Export
- Endpoint: `GET /api/logs/export/anomalies.csv`
- Auth: universityAdmin or superAdmin
- Fields: certNo, status, score, anomalyScore, anomalyReasons, reasons, verifiedAt, universityId
- Implemented using `json2csv` dependency.

## Frontend Components
- Verification UI with anomaly score + expandable signals: `Frontend/src/pages/Verify.jsx`
- Suspicious / Fake overview table: `Frontend/src/pages/SuspiciousLogs.jsx`
- Download button leverages the export endpoint (make sure `VITE_API_BASE` env is set if deploying remotely).

## Operational Notes
- If `model.h5` is absent, system will automatically fallback to IsolationForest scoring.
- Missing feature values default to neutral (0 or derived length) to avoid runtime crashes; consider stricter handling if data completeness is required.
- Keep an eye on distribution drift; periodic retraining recommended once enough trustworthy data is accumulated.

## Planned Improvements (Roadmap)
- Externalize anomaly threshold to config / UI slider.
- Batch scoring / Python worker persistence (reduce process spawn cost).
- Visualization of feature contributions (SHAP / reconstruction heatmap) for transparency.
- Alerting / webhook on FAKE detection events.

## Troubleshooting
| Symptom | Cause | Remedy |
|---------|-------|--------|
| Anomaly score always ~0.5 | Placeholder / random weights or poor feature scaling | Recompute mins/maxs; verify feature order | 
| All logs SUSPICIOUS after retrain | Threshold too low / model underfit | Re-evaluate threshold or train with more normal data |
| Node error: cannot find model.h5 | File missing or path moved | Re-run training and ensure files reside in `ml/` |
| Python spawn ENOENT | Python not installed / PATH misconfigured | Install Python 3.10+ and ensure accessible to Node process |

---
Maintainer Notes: keep this document updated whenever feature vector or threshold logic changes.
