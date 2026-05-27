"""
rtu_api/models.py

SQLAlchemy ORM models for RTU certificate verification.

Schema:
  students   – one row per RTU student (enrollment number is PRIMARY KEY surrogate)
  marksheets – one row per semester marksheet for a student
  verification_logs – audit trail of every API verification call
"""

from __future__ import annotations
from datetime import datetime
from sqlalchemy import (
    Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


# ---------------------------------------------------------------------------
# students
# ---------------------------------------------------------------------------

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    roll: Mapped[str] = mapped_column(String(50), nullable=False)
    enrollment: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    father_name: Mapped[str | None] = mapped_column(String(200))
    college: Mapped[str | None] = mapped_column(String(300))
    branch: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # One student → many marksheets
    marksheets: Mapped[list[Marksheet]] = relationship(
        "Marksheet", back_populates="student", cascade="all, delete-orphan"
    )
    # One student → many verification logs
    logs: Mapped[list[VerificationLog]] = relationship(
        "VerificationLog", back_populates="student", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Student id={self.id} enrollment={self.enrollment!r} name={self.name!r}>"


# ---------------------------------------------------------------------------
# marksheets
# ---------------------------------------------------------------------------

class Marksheet(Base):
    __tablename__ = "marksheets"
    __table_args__ = (
        UniqueConstraint("student_id", "semester", name="uq_student_semester"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)   # 1–8
    sgpa: Mapped[float] = mapped_column(Float, nullable=False)
    cgpa: Mapped[float | None] = mapped_column(Float)                # cumulative up to this sem
    year: Mapped[int | None] = mapped_column(Integer)                # exam year
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    student: Mapped[Student] = relationship("Student", back_populates="marksheets")

    def __repr__(self) -> str:
        return f"<Marksheet student_id={self.student_id} sem={self.semester} sgpa={self.sgpa}>"


# ---------------------------------------------------------------------------
# verification_logs  – audit trail
# ---------------------------------------------------------------------------

class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    enrollment_queried: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # VERIFIED / FAILED / SUSPICIOUS
    score: Mapped[float] = mapped_column(Float, nullable=False)
    reasons: Mapped[str | None] = mapped_column(Text)                # JSON-encoded list
    ocr_name: Mapped[str | None] = mapped_column(String(200))
    ocr_roll: Mapped[str | None] = mapped_column(String(50))
    ocr_sgpa: Mapped[float | None] = mapped_column(Float)
    ocr_cgpa: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    student: Mapped[Student | None] = relationship("Student", back_populates="logs")
