## EduAuth — Secure Academic Certificates (MERN + Python)

A full-stack skeleton for verifying educational certificates using a three-layer pipeline: OCR (Python), Registry Check (MongoDB), and Forgery Detection (Python/OpenCV). React (Vite + Tailwind) powers the UI; Node/Express exposes REST APIs and generates signed PDF reports.

### Folder Structure

- `/server` — Node/Express API, MongoDB models, verification worker, Python scripts, seed data.
- `/src` — React frontend (Vite) already set up with Home + Dashboards; you can later move it to `/client` if desired.

### Prerequisites

- Node.js >= 18
- Python 3.9+
- Local MongoDB running at `mongodb://127.0.0.1:27017/eduauth`

### Setup

```powershell
# 1) Install dependencies (frontend + backend)
npm install
cd server; npm install; cd ..

# 2) Configure environment
Copy-Item server/.env.example server/.env

# 3) Seed sample data (admin + Ankit Sharma + matching certificate)
cd server; npm run seed; cd ..

# 4) Run dev servers (two terminals recommended)
cd server; npm run dev
npm run dev
```

Frontend: http://localhost:5173  |  Backend: http://localhost:5000

### Build (frontend)

```powershell
npm run build
npm run preview
```

### API Endpoints

- `POST /api/verify` — multipart/form-data with `file`; runs OCR + registry + forgery pipeline; returns `{ id, status, score, report, pdf }`.
- `GET /api/reports/:id` — fetches signed PDF report.
- `POST /api/students` — create student (Admin JWT required).
- `POST /api/certificates` — create certificate (Admin JWT required).

### Notes

- Python scripts are stubbed for demo in `server/python/ocr.py` and `server/python/forgery.py`; replace with EasyOCR/Tesseract and OpenCV/skimage implementations.
- The frontend includes Admin and University dashboards; add Upload and Result pages to consume `/api/verify`.

### Python runtime

- Auto-detection: backend tries `python`, `py -3`, `py`, then `python3`. You can override with `PYTHON_EXECUTABLE`.

```powershell
# Windows example
$env:PYTHON_EXECUTABLE = "py -3"
# or full path
$env:PYTHON_EXECUTABLE = "C:\\Users\\you\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"
```

- Install Python deps:

```powershell
py -3 -m pip install -r server/python/requirements.txt
# or
python -m pip install -r server/python/requirements.txt
```

- Cleanup: If you see a nested `server/server` directory from earlier path issues, you can remove it to avoid confusion.
