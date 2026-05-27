"""
rtu_api/main.py

FastAPI application entry point for the RTU Certificate Verification Service.

Start with:
  cd Backend/rtu_api
  uvicorn main:app --reload --port 8000

Or set API_PORT in .env and run:
  python main.py
"""

from __future__ import annotations
import logging
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import Base, engine
from routes.verify import router as verify_router
from routes.students import router as students_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Create tables (idempotent – safe to call on every startup)
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="RTU Certificate Verification API",
    description=(
        "OCR-powered certificate verification system for "
        "Rajasthan Technical University marksheets. "
        "Supports image and PDF uploads with strict field-level validation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS – adjust origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(verify_router)
app.include_router(students_router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"], summary="Service health check")
def health() -> dict:
    return {"status": "ok", "service": "rtu-verify"}


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=settings.debug,
    )
