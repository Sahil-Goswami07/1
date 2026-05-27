"""
rtu_api/verification/verifier.py

Core certificate verification engine for RTU marksheets.

Decision hierarchy (strict order):
  1. Enrollment number MUST match       → immediate FAILED if not
  2. Roll number check                  → deducts from score if mismatch
  3. Name check (strict token matching) → deducts heavily; FAILED if any token corrupt
  4. SGPA/CGPA cross-validation        → advisory; adds to SUSPICIOUS but not FAILED

Scoring:
  Each field has a weight (sum = 1.0).
  Final score = sum of weights for fields that passed.
  status:
    VERIFIED   → score >= 0.85 AND enrollment matched AND name passed
    SUSPICIOUS → score >= 0.50
    FAILED     → otherwise

Public API:
  verify_certificate(ocr_fields, db_student, db_marksheets, settings) -> VerificationResult
"""

from __future__ import annotations
import json
import logging
from typing import Optional

from config import Settings, get_settings
from models import Student, Marksheet
from schemas import RTUFields, VerificationResult, NameComparisonResult, CGPAResult
from verification.name_matcher import compare_names_strict
from verification.cgpa_calculator import calculate_cgpa, validate_cgpa

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field weights (must sum to 1.0)
# ---------------------------------------------------------------------------
_WEIGHTS = {
    "enrollment": 0.35,   # primary key – highest weight
    "roll":       0.20,
    "name":       0.30,   # strict; if name fails the whole cert is suspicious
    "cgpa":       0.15,   # advisory cross-check
}

# Thresholds
_VERIFIED_MIN_SCORE  = 0.85
_SUSPICIOUS_MIN_SCORE = 0.50


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_id(value: str | None) -> str:
    """Strip spaces and uppercase an identifier string for comparison."""
    if not value:
        return ""
    return value.upper().replace(" ", "")


# ---------------------------------------------------------------------------
# Public: verify_certificate
# ---------------------------------------------------------------------------

def verify_certificate(
    ocr_fields: RTUFields,
    db_student: Student,
    db_marksheets: list[Marksheet],
    settings: Settings | None = None,
) -> VerificationResult:
    """
    Verify an RTU certificate by comparing OCR-extracted fields against DB records.

    Args:
        ocr_fields:    Fields extracted from the uploaded marksheet (may have None).
        db_student:    The Student ORM record found by enrollment number.
        db_marksheets: All Marksheet rows for this student (for CGPA cross-check).
        settings:      App settings (thresholds, tolerances).

    Returns:
        VerificationResult with status, score, reasons, and per-field breakdowns.
    """
    cfg = settings or get_settings()

    reasons:        list[str] = []
    fields_matched: list[str] = []
    fields_failed:  list[str] = []
    score           = 0.0

    name_result: Optional[NameComparisonResult] = None
    cgpa_result: Optional[CGPAResult]           = None

    # ── 1. Enrollment number ─────────────────────────────────────────────────
    ocr_enrollment = _normalize_id(ocr_fields.enrollment)
    db_enrollment  = _normalize_id(db_student.enrollment)

    if not ocr_enrollment:
        reasons.append("Enrollment number not found in OCR output")
        fields_failed.append("enrollment")
        # Cannot proceed without enrollment number
        return VerificationResult(
            status="FAILED",
            score=0.0,
            reasons=reasons,
            fields_matched=fields_matched,
            fields_failed=fields_failed,
            ocr_fields=ocr_fields,
        )

    if ocr_enrollment == db_enrollment:
        score += _WEIGHTS["enrollment"]
        fields_matched.append("enrollment")
    else:
        reasons.append(
            f"Enrollment mismatch: OCR={ocr_enrollment!r} ≠ DB={db_enrollment!r}"
        )
        fields_failed.append("enrollment")
        # Enrollment is the primary key – immediate failure
        return VerificationResult(
            status="FAILED",
            score=_WEIGHTS["enrollment"] * 0,   # 0
            reasons=reasons,
            fields_matched=fields_matched,
            fields_failed=fields_failed,
            ocr_fields=ocr_fields,
        )

    # ── 2. Roll number ───────────────────────────────────────────────────────
    ocr_roll = _normalize_id(ocr_fields.roll)
    db_roll  = _normalize_id(db_student.roll)

    if ocr_roll and db_roll:
        if ocr_roll == db_roll:
            score += _WEIGHTS["roll"]
            fields_matched.append("roll")
        else:
            reasons.append(f"Roll number mismatch: OCR={ocr_roll!r} ≠ DB={db_roll!r}")
            fields_failed.append("roll")
    else:
        reasons.append("Roll number not found in OCR output (skipped)")

    # ── 3. Name (strict token matching) ──────────────────────────────────────
    if ocr_fields.name and db_student.name:
        name_result = compare_names_strict(ocr_fields.name, db_student.name, cfg)
        if name_result.passed:
            score += _WEIGHTS["name"]
            fields_matched.append("name")
        else:
            reasons.append(f"Name check failed: {name_result.reason}")
            fields_failed.append("name")
    else:
        reasons.append("Name not found in OCR output (skipped)")

    # ── 4. CGPA cross-validation ──────────────────────────────────────────────
    if db_marksheets:
        sgpa_list   = sorted(
            [m.sgpa for m in db_marksheets if m.sgpa is not None],
            key=lambda _: 0,  # stable sort preserves original order
        )
        if sgpa_list:
            try:
                cgpa_result = calculate_cgpa(sgpa_list)
                if ocr_fields.cgpa is not None:
                    cgpa_ok, cgpa_msg = validate_cgpa(
                        cgpa_result.computed_cgpa,
                        ocr_fields.cgpa,
                        cfg.cgpa_tolerance,
                    )
                    if cgpa_ok:
                        score += _WEIGHTS["cgpa"]
                        fields_matched.append("cgpa")
                    else:
                        reasons.append(f"CGPA validation: {cgpa_msg}")
                        fields_failed.append("cgpa")
                elif ocr_fields.sgpa is not None:
                    # Single-semester marksheet: just validate the SGPA value is plausible
                    latest   = db_marksheets[-1]  # last stored sem
                    sgpa_ok  = abs(latest.sgpa - ocr_fields.sgpa) <= 0.1
                    if sgpa_ok:
                        score += _WEIGHTS["cgpa"]
                        fields_matched.append("sgpa")
                    else:
                        reasons.append(
                            f"SGPA mismatch: OCR={ocr_fields.sgpa} ≠ DB={latest.sgpa}"
                        )
                        fields_failed.append("sgpa")
                else:
                    reasons.append("CGPA/SGPA not extracted from marksheet (skipped)")
            except ValueError as exc:
                logger.warning("CGPA calculation error: %s", exc)
                reasons.append(f"CGPA calculation skipped: {exc}")
    else:
        reasons.append("No marksheet records in DB for CGPA cross-check (skipped)")

    # ── 5. Determine final status ─────────────────────────────────────────────
    score = round(score, 4)

    # Name failure always downgrades to SUSPICIOUS at minimum
    name_failed = "name" in fields_failed

    if score >= _VERIFIED_MIN_SCORE and not name_failed:
        status = "VERIFIED"
    elif score >= _SUSPICIOUS_MIN_SCORE or name_failed:
        status = "SUSPICIOUS"
    else:
        status = "FAILED"

    from schemas import StudentRead
    return VerificationResult(
        status=status,
        score=score,
        reasons=reasons,
        fields_matched=fields_matched,
        fields_failed=fields_failed,
        name_comparison=name_result,
        cgpa_result=cgpa_result,
        ocr_fields=ocr_fields,
        db_student=StudentRead.model_validate(db_student),
    )
