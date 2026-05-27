"""
rtu_api/routes/verify.py

POST /verify  –  Upload a marksheet (image or PDF) and verify it.

Flow:
  1. Accept multipart file upload + optional enrollment override
  2. Run OCR (preprocess → Tesseract)
  3. Extract RTU fields
  4. Look up student by enrollment in DB
  5. Load all marksheets for CGPA cross-check
  6. Run verify_certificate()
  7. Persist audit log
  8. Return VerificationResult
"""

from __future__ import annotations
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from models import Student, Marksheet, VerificationLog
from schemas import VerificationResult
from ocr.extractor import extract_text, extract_rtu_fields
from verification.verifier import verify_certificate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verify", tags=["Verification"])

# Allowed MIME types for uploaded marksheets
_ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",    # non-standard alias sent by some mobile browsers
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "application/pdf",
}


@router.post(
    "",
    response_model=VerificationResult,
    summary="Verify an RTU marksheet",
    description=(
        "Upload a marksheet image or PDF. "
        "The system will run OCR, extract RTU fields, and compare them "
        "against the database record identified by the enrollment number."
    ),
)
async def verify_marksheet(
    file:       UploadFile     = File(..., description="Marksheet image (JPG/PNG/PDF)"),
    enrollment: Optional[str]  = Form(None, description="Override enrollment number (if OCR misses it)"),
    db:         Session        = Depends(get_db),
) -> VerificationResult:
    # ── Validate file type ────────────────────────────────────────────────────
    mime = file.content_type or ""
    if mime not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type: {mime!r}. "
                f"Allowed: {sorted(_ALLOWED_MIME)}"
            ),
        )

    # ── Read file bytes ───────────────────────────────────────────────────────
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # ── OCR ───────────────────────────────────────────────────────────────────
    try:
        raw_text = extract_text(file_bytes, mime)
    except Exception as exc:
        logger.exception("OCR failed")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"OCR processing failed: {exc}",
        )

    # ── Extract RTU fields ────────────────────────────────────────────────────
    ocr_fields = extract_rtu_fields(raw_text)

    # Allow caller to supply enrollment if OCR missed it
    if enrollment:
        ocr_fields.enrollment = enrollment.upper().strip()

    if not ocr_fields.enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Enrollment number could not be extracted from the document. "
                "Please provide it via the `enrollment` form field."
            ),
        )

    # ── DB lookup ─────────────────────────────────────────────────────────────
    db_student: Student | None = (
        db.query(Student)
        .filter(Student.enrollment == ocr_fields.enrollment)
        .first()
    )

    if db_student is None:
        _log_failed(db, ocr_fields, "FAILED", 0.0, ["Enrollment not found in database"])
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No student found with enrollment {ocr_fields.enrollment!r}",
        )

    # Fetch all marksheets for CGPA cross-check, ordered by semester
    db_marksheets: list[Marksheet] = (
        db.query(Marksheet)
        .filter(Marksheet.student_id == db_student.id)
        .order_by(Marksheet.semester)
        .all()
    )

    # ── Verify ────────────────────────────────────────────────────────────────
    result = verify_certificate(ocr_fields, db_student, db_marksheets)

    # ── Persist audit log ─────────────────────────────────────────────────────
    _persist_log(db, db_student, ocr_fields, result)

    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _persist_log(
    db: Session,
    student: Student,
    ocr: "RTUFields",
    result: VerificationResult,
) -> None:
    try:
        log = VerificationLog(
            student_id=student.id,
            enrollment_queried=ocr.enrollment or "",
            status=result.status,
            score=result.score,
            reasons=json.dumps(result.reasons),
            ocr_name=ocr.name,
            ocr_roll=ocr.roll,
            ocr_sgpa=ocr.sgpa,
            ocr_cgpa=ocr.cgpa,
        )
        db.add(log)
        db.commit()
    except Exception:
        logger.exception("Failed to persist verification log")
        db.rollback()


def _log_failed(
    db: Session,
    ocr: "RTUFields",
    status: str,
    score: float,
    reasons: list[str],
) -> None:
    try:
        log = VerificationLog(
            student_id=None,
            enrollment_queried=ocr.enrollment or "",
            status=status,
            score=score,
            reasons=json.dumps(reasons),
            ocr_name=ocr.name,
            ocr_roll=ocr.roll,
        )
        db.add(log)
        db.commit()
    except Exception:
        logger.exception("Failed to persist failed verification log")
        db.rollback()
