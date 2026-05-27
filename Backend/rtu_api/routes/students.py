"""
rtu_api/routes/students.py

CRUD endpoints for the students and marksheets tables.
These are admin-only endpoints used to seed/manage the authoritative DB.

Endpoints:
  POST   /students              → create student
  GET    /students/{enrollment} → fetch student + all marksheets
  POST   /students/{enrollment}/marksheets → add a semester marksheet
  GET    /students              → list all students (paginated)
"""

from __future__ import annotations
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Student, Marksheet
from schemas import StudentCreate, StudentRead, MarksheetCreate, MarksheetRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students", tags=["Students"])


# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=StudentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student",
)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)) -> StudentRead:
    existing = db.query(Student).filter(Student.enrollment == payload.enrollment).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with enrollment {payload.enrollment!r} already exists",
        )
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    logger.info("Created student: enrollment=%s", student.enrollment)
    return StudentRead.model_validate(student)


@router.get(
    "",
    response_model=list[StudentRead],
    summary="List all students (paginated)",
)
def list_students(
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db:    Session = Depends(get_db),
) -> list[StudentRead]:
    students = db.query(Student).offset(skip).limit(limit).all()
    return [StudentRead.model_validate(s) for s in students]


@router.get(
    "/{enrollment}",
    response_model=StudentRead,
    summary="Fetch a student by enrollment number",
)
def get_student(enrollment: str, db: Session = Depends(get_db)) -> StudentRead:
    student = (
        db.query(Student)
        .filter(Student.enrollment == enrollment.upper())
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No student with enrollment {enrollment!r}",
        )
    return StudentRead.model_validate(student)


# ---------------------------------------------------------------------------
# Marksheet endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/{enrollment}/marksheets",
    response_model=MarksheetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a semester marksheet for a student",
)
def add_marksheet(
    enrollment: str,
    payload:    MarksheetCreate,
    db:         Session = Depends(get_db),
) -> MarksheetRead:
    student = (
        db.query(Student)
        .filter(Student.enrollment == enrollment.upper())
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check for duplicate semester
    existing = (
        db.query(Marksheet)
        .filter(
            Marksheet.student_id == student.id,
            Marksheet.semester == payload.semester,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Semester {payload.semester} already exists for this student",
        )

    data = payload.model_dump()
    data["student_id"] = student.id          # enforce correct FK
    marksheet = Marksheet(**data)
    db.add(marksheet)
    db.commit()
    db.refresh(marksheet)
    return MarksheetRead.model_validate(marksheet)


@router.get(
    "/{enrollment}/marksheets",
    response_model=list[MarksheetRead],
    summary="List all marksheets for a student",
)
def list_marksheets(enrollment: str, db: Session = Depends(get_db)) -> list[MarksheetRead]:
    student = (
        db.query(Student)
        .filter(Student.enrollment == enrollment.upper())
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    sheets = (
        db.query(Marksheet)
        .filter(Marksheet.student_id == student.id)
        .order_by(Marksheet.semester)
        .all()
    )
    return [MarksheetRead.model_validate(s) for s in sheets]
