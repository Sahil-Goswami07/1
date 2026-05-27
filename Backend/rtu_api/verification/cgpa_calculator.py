"""
rtu_api/verification/cgpa_calculator.py

CGPA computation and validation as per RTU grading norms.

Formulae:
  CGPA     = arithmetic mean of all semester SGPAs
  Percentage = CGPA × 9.5   (RTU standard conversion factor)

Public API:
  calculate_cgpa(sgpa_list) -> CGPAResult
  validate_cgpa(computed, extracted, tolerance) -> (bool, str)
"""

from __future__ import annotations
from schemas import CGPAResult


# RTU conversion factor (per university prospectus)
_CGPA_TO_PERCENTAGE_FACTOR = 9.5


def calculate_cgpa(sgpa_list: list[float]) -> CGPAResult:
    """
    Compute CGPA and equivalent percentage from a list of semester SGPAs.

    RTU treats each semester equally in the CGPA calculation (simple average).
    Weighted by credit hours would require per-subject data, which marksheets
    do not always expose; the simple average is the university's published formula.

    Args:
        sgpa_list: One SGPA per semester, e.g. [7.5, 8.0, 7.8, 8.2].
                   Must not be empty.

    Returns:
        CGPAResult with computed_cgpa, percentage, and the input list.

    Raises:
        ValueError: If sgpa_list is empty or contains invalid values.
    """
    if not sgpa_list:
        raise ValueError("sgpa_list must contain at least one SGPA value")

    # Validate individual values
    for i, s in enumerate(sgpa_list):
        if not (0.0 <= s <= 10.0):
            raise ValueError(
                f"SGPA at index {i} is {s}, which is outside the valid range [0, 10]"
            )

    computed_cgpa = round(sum(sgpa_list) / len(sgpa_list), 2)
    percentage    = round(computed_cgpa * _CGPA_TO_PERCENTAGE_FACTOR, 2)

    return CGPAResult(
        computed_cgpa=computed_cgpa,
        percentage=percentage,
        sgpa_list=list(sgpa_list),
    )


def validate_cgpa(
    computed: float,
    extracted: float,
    tolerance: float = 0.05,
) -> tuple[bool, str]:
    """
    Validate that the CGPA extracted by OCR is consistent with the value
    computed from individual semester SGPAs stored in the database.

    Args:
        computed:   CGPA calculated from DB SGPAs via calculate_cgpa().
        extracted:  CGPA value read from the marksheet by OCR.
        tolerance:  Maximum allowed absolute difference (default ±0.05).

    Returns:
        (True, "CGPA matches")  if |computed - extracted| <= tolerance
        (False, reason_str)     otherwise
    """
    diff = abs(computed - extracted)
    if diff <= tolerance:
        return True, f"CGPA matches (computed={computed}, extracted={extracted}, diff={diff:.3f})"
    return (
        False,
        f"CGPA mismatch: computed {computed} vs extracted {extracted} "
        f"(diff={diff:.3f} exceeds tolerance={tolerance})",
    )
