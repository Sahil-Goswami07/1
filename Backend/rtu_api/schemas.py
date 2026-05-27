"""
rtu_api/schemas.py

Pydantic models for request validation, response serialization, and
inter-module type contracts.
"""

from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ---------------------------------------------------------------------------
# OCR / Extraction schemas
# ---------------------------------------------------------------------------

class RTUFields(BaseModel):
    """Raw fields extracted from an RTU marksheet via OCR."""
    name: Optional[str] = None
    roll: Optional[str] = None
    enrollment: Optional[str] = None
    father_name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    sgpa: Optional[float] = None
    cgpa: Optional[float] = None
    semester: Optional[int] = None

    # Internal: keep the raw OCR text for debugging
    raw_text: Optional[str] = Field(default=None, exclude=True)


# ---------------------------------------------------------------------------
# Student CRUD schemas
# ---------------------------------------------------------------------------

class StudentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    roll: str = Field(..., min_length=3, max_length=50)
    enrollment: str = Field(..., min_length=5, max_length=50)
    father_name: Optional[str] = Field(None, max_length=200)
    college: Optional[str] = Field(None, max_length=300)
    branch: Optional[str] = Field(None, max_length=100)


class StudentRead(StudentCreate):
    id: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Marksheet schemas
# ---------------------------------------------------------------------------

class MarksheetCreate(BaseModel):
    student_id: int
    semester: int = Field(..., ge=1, le=8)
    sgpa: float = Field(..., ge=0.0, le=10.0)
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    year: Optional[int] = Field(None, ge=2000, le=2100)


class MarksheetRead(MarksheetCreate):
    id: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Verification request / response schemas
# ---------------------------------------------------------------------------

class NameComparisonResult(BaseModel):
    """Detailed output from compare_names_strict()."""
    score: float = Field(..., description="0.0–1.0 weighted similarity")
    matched_tokens: list[tuple[str, str]]
    failed_tokens: list[str]
    passed: bool
    reason: str


class CGPAResult(BaseModel):
    """Output from calculate_cgpa()."""
    computed_cgpa: float
    percentage: float
    sgpa_list: list[float]


class VerificationResult(BaseModel):
    """Final output returned to the caller after verification."""
    status: str          # VERIFIED | FAILED | SUSPICIOUS
    score: float         # 0.0–1.0 aggregate confidence
    reasons: list[str]
    fields_matched: list[str]
    fields_failed: list[str]
    name_comparison: Optional[NameComparisonResult] = None
    cgpa_result: Optional[CGPAResult] = None
    ocr_fields: Optional[RTUFields] = None
    db_student: Optional[StudentRead] = None
