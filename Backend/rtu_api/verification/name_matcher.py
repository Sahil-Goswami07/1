"""
rtu_api/verification/name_matcher.py

Strict, fraud-sensitive name comparison for RTU certificate verification.

Algorithm:
  1. Normalize both names (uppercase, remove noise, apply OCR confusion map).
  2. Tokenize into words.
  3. For each DB token, find the best matching OCR token using
     RapidFuzz's token_ratio (handles transpositions, extra chars).
  4. A token "passes" only if its best match ≥ TOKEN_SIMILARITY_THRESHOLD.
  5. Failed tokens (including those with no acceptable partner) → FAIL.
  6. Final score = weighted average similarity of all DB tokens.
  7. Overall PASSES only if score ≥ NAME_OVERALL_THRESHOLD AND zero failed tokens.

Public API:
  compare_names_strict(ocr_name, db_name, settings) -> NameComparisonResult
"""

from __future__ import annotations
import re
import unicodedata

from rapidfuzz import fuzz

from config import Settings, get_settings
from schemas import NameComparisonResult

# ---------------------------------------------------------------------------
# OCR character confusion corrections (applied to names only)
# ---------------------------------------------------------------------------
_OCR_CORRECTIONS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"0"), "O"),
    (re.compile(r"1"), "I"),
    (re.compile(r"5"), "S"),
    (re.compile(r"8"), "B"),
    (re.compile(r"6"), "G"),
]


def _normalize(raw: str) -> str:
    """
    Normalize a name string:
      1. Remove diacritics (é → e)
      2. Uppercase
      3. Apply OCR character confusions (digit→letter)
      4. Strip everything except A-Z and spaces
      5. Collapse multiple spaces
    """
    # Remove diacritics
    s = unicodedata.normalize("NFD", raw)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.upper()
    # Apply OCR corrections
    for pattern, replacement in _OCR_CORRECTIONS:
        s = pattern.sub(replacement, s)
    # Keep only alphabetic characters and spaces
    s = re.sub(r"[^A-Z ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _tokenize(name: str) -> list[str]:
    """Split normalized name into non-empty tokens."""
    return [t for t in name.split() if t]


# ---------------------------------------------------------------------------
# Public: compare_names_strict
# ---------------------------------------------------------------------------

def compare_names_strict(
    ocr_name: str,
    db_name: str,
    settings: Settings | None = None,
) -> NameComparisonResult:
    """
    Strict token-level name comparison using RapidFuzz.

    Args:
        ocr_name:  Name as extracted by OCR (may be noisy).
        db_name:   Authoritative name from the database.
        settings:  App settings (reads thresholds from here).

    Returns:
        NameComparisonResult with score, matched/failed tokens, and verdict.

    Example:
        OCR:  "GOTM KUMAR JHA"
        DB:   "GOUTAM KUMAR JHA"
          → GOUTAM has no match above 90% → failed_tokens=["GOUTAM"] → FAIL
    """
    cfg = settings or get_settings()
    per_token_threshold = cfg.token_similarity_threshold * 100   # rapidfuzz uses 0–100
    overall_threshold   = cfg.name_overall_threshold             # 0–1

    norm_ocr = _normalize(ocr_name)
    norm_db  = _normalize(db_name)

    ocr_tokens = _tokenize(norm_ocr)
    db_tokens  = _tokenize(norm_db)

    if not ocr_tokens or not db_tokens:
        return NameComparisonResult(
            score=0.0,
            matched_tokens=[],
            failed_tokens=db_tokens,
            passed=False,
            reason="one or both names produced no tokens after normalization",
        )

    matched_tokens: list[tuple[str, str]] = []
    failed_tokens:  list[str]             = []
    used_ocr_indices: set[int]            = set()
    token_scores: list[float]             = []

    for db_tok in db_tokens:
        best_score = 0.0
        best_idx   = -1

        for i, ocr_tok in enumerate(ocr_tokens):
            if i in used_ocr_indices:
                continue
            # token_ratio handles length differences better than plain ratio
            sim = fuzz.token_ratio(db_tok, ocr_tok)
            if sim > best_score:
                best_score = sim
                best_idx   = i

        if best_score >= per_token_threshold and best_idx != -1:
            used_ocr_indices.add(best_idx)
            matched_tokens.append((ocr_tokens[best_idx], db_tok))
            token_scores.append(best_score / 100.0)
        else:
            failed_tokens.append(db_tok)
            token_scores.append(0.0)  # failed token contributes 0

    # Weighted average: every DB token has equal weight
    overall_score = sum(token_scores) / len(token_scores) if token_scores else 0.0

    passed = len(failed_tokens) == 0 and overall_score >= overall_threshold

    # Build a human-readable reason
    if passed:
        if overall_score >= 0.99:
            reason = "exact match"
        else:
            reason = f"all tokens matched (avg similarity {overall_score:.0%})"
    elif failed_tokens:
        reason = f"token mismatch: {', '.join(failed_tokens)} not found in OCR output"
    else:
        reason = f"low overall similarity ({overall_score:.0%} < {overall_threshold:.0%} threshold)"

    return NameComparisonResult(
        score=round(overall_score, 4),
        matched_tokens=matched_tokens,
        failed_tokens=failed_tokens,
        passed=passed,
        reason=reason,
    )
