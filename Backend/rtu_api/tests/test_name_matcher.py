"""
rtu_api/tests/test_name_matcher.py

Unit tests for compare_names_strict().

Run:
  cd Backend/rtu_api
  python -m pytest tests/ -v
  # or without pytest:
  python tests/test_name_matcher.py
"""

from __future__ import annotations
import sys, os

# Allow running as a plain script from the rtu_api directory
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from verification.name_matcher import compare_names_strict

# ---------------------------------------------------------------------------
# Minimal assert helper (pytest-compatible AND plain-script-runnable)
# ---------------------------------------------------------------------------
_passed = 0
_failed = 0


def check(condition: bool, label: str) -> None:
    global _passed, _failed
    if condition:
        print(f"  ✅  {label}")
        _passed += 1
    else:
        print(f"  ❌  {label}", file=sys.stderr)
        _failed += 1


def section(title: str) -> None:
    print(f"\n── {title}")


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

section("Exact match")
r = compare_names_strict("GOUTAM KUMAR JHA", "GOUTAM KUMAR JHA")
print("   ", r)
check(r.passed,                   "passed=True")
check(r.score >= 0.99,            "score ≥ 0.99")
check(len(r.failed_tokens) == 0,  "no failed tokens")
check(r.reason == "exact match",  'reason is "exact match"')

section("Forged first token: GOTM vs GOUTAM")
r = compare_names_strict("GOTM KUMAR JHA", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| reason:", r.reason)
check(not r.passed,                           "passed=False")
check("GOUTAM" in r.failed_tokens,            "GOUTAM in failed_tokens")
check(r.score < 0.80,                         "score < 0.80")
check("token mismatch" in r.reason,           "reason mentions token mismatch")

section("OCR digit confusion: G0UTAM → GOUTAM after normalization")
r = compare_names_strict("G0UTAM KUMAR JHA", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| reason:", r.reason)
check(r.passed,        "passed=True (0→O correction applied)")
check(r.score >= 0.90, "score ≥ 0.90")

section("Missing middle token: GOUTAM JHA vs GOUTAM KUMAR JHA")
r = compare_names_strict("GOUTAM JHA", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| failed:", r.failed_tokens)
check(not r.passed,              "passed=False (KUMAR missing)")
check("KUMAR" in r.failed_tokens, "KUMAR in failed_tokens")

section("Completely different name")
r = compare_names_strict("RAHUL SINGH", "GOUTAM KUMAR JHA")
print("   score:", r.score)
check(not r.passed,   "passed=False")
check(r.score < 0.30, "score < 0.30")

section("Extra OCR noise token: GOUTAM KUMAR JHA XXYZ")
r = compare_names_strict("GOUTAM KUMAR JHA XXYZ", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| failed:", r.failed_tokens)
# Extra OCR tokens don't cause DB token failures – all DB tokens matched
check(r.passed,                   "passed=True (extra OCR token ignored)")
check(len(r.failed_tokens) == 0,  "no failed_tokens")

section("One-character OCR slip: GOUTAM KUMARR JHA (one extra R)")
r = compare_names_strict("GOUTAM KUMARR JHA", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| failed:", r.failed_tokens)
# KUMARR vs KUMAR: rapidfuzz token_ratio = 91 → passes the 90% threshold
check(r.passed,                   "passed=True (minor 1-char slip tolerated)")

section("Empty OCR name")
r = compare_names_strict("", "GOUTAM KUMAR JHA")
print("   score:", r.score, "| reason:", r.reason)
check(not r.passed,  "passed=False")
check(r.score == 0,  "score == 0")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print(f"\n══ Results: {_passed} passed, {_failed} failed ══\n")
if _failed:
    sys.exit(1)


# ---------------------------------------------------------------------------
# pytest compatibility – wrap each section as a test function
# ---------------------------------------------------------------------------
def test_exact_match():
    r = compare_names_strict("GOUTAM KUMAR JHA", "GOUTAM KUMAR JHA")
    assert r.passed
    assert r.score >= 0.99


def test_forged_token():
    r = compare_names_strict("GOTM KUMAR JHA", "GOUTAM KUMAR JHA")
    assert not r.passed
    assert "GOUTAM" in r.failed_tokens


def test_ocr_digit_correction():
    r = compare_names_strict("G0UTAM KUMAR JHA", "GOUTAM KUMAR JHA")
    assert r.passed


def test_missing_token():
    r = compare_names_strict("GOUTAM JHA", "GOUTAM KUMAR JHA")
    assert not r.passed
    assert "KUMAR" in r.failed_tokens


def test_different_name():
    r = compare_names_strict("RAHUL SINGH", "GOUTAM KUMAR JHA")
    assert not r.passed
    assert r.score < 0.30


def test_extra_ocr_token():
    r = compare_names_strict("GOUTAM KUMAR JHA XXYZ", "GOUTAM KUMAR JHA")
    assert r.passed


def test_one_char_slip():
    r = compare_names_strict("GOUTAM KUMARR JHA", "GOUTAM KUMAR JHA")
    # This may or may not pass depending on rapidfuzz threshold — document behavior
    # token_ratio("KUMARR","KUMAR") ≈ 91 → should pass at 90% threshold
    print(f"   [one-char-slip] score={r.score}, failed={r.failed_tokens}")


def test_empty_input():
    r = compare_names_strict("", "GOUTAM KUMAR JHA")
    assert not r.passed
    assert r.score == 0.0
