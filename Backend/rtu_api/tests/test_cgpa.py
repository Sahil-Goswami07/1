"""
rtu_api/tests/test_cgpa.py

Unit tests for calculate_cgpa() and validate_cgpa().

Run:
  python tests/test_cgpa.py
  # or via pytest
  python -m pytest tests/test_cgpa.py -v
"""

from __future__ import annotations
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from verification.cgpa_calculator import calculate_cgpa, validate_cgpa

_passed = 0
_failed = 0


def check(cond: bool, label: str) -> None:
    global _passed, _failed
    if cond:
        print(f"  ✅  {label}")
        _passed += 1
    else:
        print(f"  ❌  {label}", file=sys.stderr)
        _failed += 1


# ── calculate_cgpa ────────────────────────────────────────────────────────────
print("\n── calculate_cgpa: 4-semester average")
r = calculate_cgpa([7.5, 8.0, 7.8, 8.2])
print("  ", r)
check(r.computed_cgpa == 7.88, f"computed_cgpa == 7.88 (got {r.computed_cgpa})")
check(r.percentage == round(7.88 * 9.5, 2), "percentage = cgpa × 9.5")

print("\n── calculate_cgpa: single semester")
r = calculate_cgpa([9.0])
check(r.computed_cgpa == 9.0, "single sem → cgpa = that sgpa")
check(r.percentage == 85.5, f"9.0 × 9.5 = 85.5 (got {r.percentage})")

print("\n── calculate_cgpa: ValueError on empty list")
try:
    calculate_cgpa([])
    check(False, "should have raised ValueError")
except ValueError:
    check(True, "ValueError raised for empty list")

print("\n── calculate_cgpa: ValueError on out-of-range SGPA")
try:
    calculate_cgpa([11.0])
    check(False, "should have raised ValueError for 11.0")
except ValueError:
    check(True, "ValueError raised for SGPA > 10")

# ── validate_cgpa ─────────────────────────────────────────────────────────────
print("\n── validate_cgpa: within tolerance")
ok, msg = validate_cgpa(7.88, 7.90, tolerance=0.05)
check(ok, f"7.88 vs 7.90 within ±0.05 → ok  [{msg}]")

print("\n── validate_cgpa: outside tolerance")
ok, msg = validate_cgpa(7.88, 8.10, tolerance=0.05)
check(not ok, f"7.88 vs 8.10 → not ok  [{msg}]")

print("\n── validate_cgpa: exact match")
ok, msg = validate_cgpa(8.0, 8.0, tolerance=0.05)
check(ok, "exact match → ok")

print(f"\n══ Results: {_passed} passed, {_failed} failed ══\n")
if _failed:
    sys.exit(1)


# pytest-compatible functions
def test_average_four_semesters():
    r = calculate_cgpa([7.5, 8.0, 7.8, 8.2])
    assert r.computed_cgpa == 7.88


def test_percentage_conversion():
    r = calculate_cgpa([8.0])
    assert r.percentage == 76.0


def test_empty_raises():
    try:
        calculate_cgpa([])
        assert False, "should raise"
    except ValueError:
        pass


def test_out_of_range_raises():
    try:
        calculate_cgpa([10.5])
        assert False, "should raise"
    except ValueError:
        pass


def test_validate_within_tolerance():
    ok, _ = validate_cgpa(7.88, 7.90, 0.05)
    assert ok


def test_validate_outside_tolerance():
    ok, _ = validate_cgpa(7.88, 8.10, 0.05)
    assert not ok
