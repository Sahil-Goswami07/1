"""
rtu_api/tests/test_extractor.py

Unit tests for extract_rtu_fields().  No real marksheet needed — tests
exercise the regex patterns against synthetic OCR text strings.

Run:
  python tests/test_extractor.py
"""

from __future__ import annotations
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ocr.extractor import extract_rtu_fields

_p = _f = 0


def check(cond: bool, label: str) -> None:
    global _p, _f
    if cond:
        print(f"  ✅  {label}")
        _p += 1
    else:
        print(f"  ❌  {label}", file=sys.stderr)
        _f += 1


# --- Synthetic RTU marksheet header text ---
SAMPLE_TEXT = """
RAJASTHAN TECHNICAL UNIVERSITY, KOTA

Name : GOUTAM KUMAR JHA
Father's Name : SATYENDRA KUMAR JHA
Roll No : 21EJCIT054
Enrollment No : 21RTEEC1234567
College Name : Government Engineering College, Ajmer
Branch : Electronics & Communication Engineering
Semester : 5th

SGPA : 8.20
CGPA : 7.95
"""

print("\n── Standard RTU header block")
r = extract_rtu_fields(SAMPLE_TEXT)
print("  ", r.model_dump(exclude={"raw_text"}))
check(r.name == "GOUTAM KUMAR JHA",           "name extracted correctly")
check(r.father_name == "SATYENDRA KUMAR JHA",  "father_name extracted correctly")
check(r.roll == "21EJCIT054",                  "roll extracted correctly")
check(r.enrollment == "21RTEEC1234567",         "enrollment extracted correctly")
check(r.sgpa == 8.20,                          "SGPA = 8.20")
check(r.cgpa == 7.95,                          "CGPA = 7.95")
check(r.semester == 5,                         "semester = 5")


# --- Name must NOT capture father's name ---
print("\n── Name ≠ Father's Name collision guard")
text2 = """
Name : ANJALI SHARMA
Father's Name : RAMESH SHARMA
Enrollment No : 22RTECS9876543
Roll No : 22EJCSE007
SGPA : 7.50
"""
r2 = extract_rtu_fields(text2)
check(r2.name == "ANJALI SHARMA",   "name is student, not father")
check(r2.father_name == "RAMESH SHARMA", "father_name captured separately")

# --- OCR with colons replaced by pipe ---
print("\n── OCR label separator as pipe (|)")
text3 = "Enrollment No | 20RTEEC0001111\nSGPA | 9.10\n"
r3 = extract_rtu_fields(text3)
check(r3.enrollment == "20RTEEC0001111", "enrollment with pipe separator")
check(r3.sgpa == 9.10,                  "SGPA with pipe separator")

# --- Missing fields return None ---
print("\n── Missing fields return None")
r4 = extract_rtu_fields("No relevant content here.")
check(r4.name is None,       "name is None when absent")
check(r4.enrollment is None, "enrollment is None when absent")

print(f"\n══ Results: {_p} passed, {_f} failed ══\n")
if _f:
    sys.exit(1)


# pytest wrappers
def test_standard_header():
    r = extract_rtu_fields(SAMPLE_TEXT)
    assert r.name == "GOUTAM KUMAR JHA"
    assert r.enrollment == "21RTEEC1234567"
    assert r.sgpa == 8.20
    assert r.cgpa == 7.95


def test_no_father_collision():
    r = extract_rtu_fields(
        "Name : ANJALI SHARMA\nFather's Name : RAMESH SHARMA\nEnrollment No : 22RTECS9876543\n"
    )
    assert r.name == "ANJALI SHARMA"


def test_missing_returns_none():
    r = extract_rtu_fields("Nothing here.")
    assert r.name is None
    assert r.enrollment is None
