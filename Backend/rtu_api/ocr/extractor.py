"""
rtu_api/ocr/extractor.py

Two-layer OCR + RTU field extraction:

  extract_text(file_bytes, mime_type) -> str
      • Image files  → preprocess_image() → pytesseract
      • PDF files    → pdf2image → preprocess each page → pytesseract
      • Multi-page:  merge all page texts with a page separator

  extract_rtu_fields(text) -> RTUFields
      • Regex patterns calibrated for RTU marksheet layout
      • Returns None for any field that cannot be extracted reliably

Note on imports:
  Heavy dependencies (cv2, pytesseract, pdf2image) are imported lazily
  inside the functions that need them.  This lets extract_rtu_fields()
  be imported and unit-tested without OpenCV or Tesseract installed.
"""

from __future__ import annotations
import re
import logging

from schemas import RTUFields

logger = logging.getLogger(__name__)

# Page Segmentation Mode 1: Automatic page segmentation with OSD.
_TESS_CONFIG = r"--oem 3 --psm 1"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Internal helpers (lazy-import cv2 / pytesseract only when called)
# ---------------------------------------------------------------------------

def _pil_to_cv2(pil_image: object) -> object:
    """Convert a PIL Image (RGB) to OpenCV BGR numpy array."""
    import cv2
    import numpy as np
    rgb = np.array(pil_image.convert("RGB"))  # type: ignore[attr-defined]
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _ocr_one_image(cv2_image: object) -> str:
    """Preprocess one image frame and run Tesseract OCR on it.

    Fallback strategy: run OCR on both the preprocessed and the original
    grayscale image, then keep whichever produced the longer result.
    This prevents aggressive preprocessing from hurting camera images
    while still benefitting digital scans.
    """
    import pytesseract
    from ocr.preprocessor import preprocess_image

    # --- Preprocessed path ---
    try:
        preprocessed = preprocess_image(cv2_image)  # type: ignore[arg-type]
        text_preprocessed = pytesseract.image_to_string(
            preprocessed, lang="eng", config=_TESS_CONFIG
        ).strip()
    except Exception:
        logger.exception("Preprocessing failed; will use original only")
        text_preprocessed = ""

    # --- Original grayscale path (fallback) ---
    try:
        import cv2
        gray_original = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2GRAY) \
            if len(cv2_image.shape) == 3 else cv2_image  # type: ignore[union-attr]
        text_original = pytesseract.image_to_string(
            gray_original, lang="eng", config=_TESS_CONFIG
        ).strip()
    except Exception:
        logger.exception("Original-image OCR failed")
        text_original = ""

    # Keep the result with more content (more chars = more fields extracted)
    if len(text_preprocessed) >= len(text_original):
        return text_preprocessed
    logger.debug(
        "Using original OCR (%d chars) over preprocessed (%d chars)",
        len(text_original), len(text_preprocessed),
    )
    return text_original


def _pdf_to_cv2_images(file_bytes: bytes) -> list:
    """
    Convert a PDF to a list of OpenCV images (one per page).
    Requires poppler to be installed and, on Windows, poppler_path set in .env.
    """
    from pdf2image import convert_from_bytes
    from config import get_settings
    settings = get_settings()

    kwargs: dict = {"dpi": 300, "fmt": "png"}
    if settings.poppler_path:
        kwargs["poppler_path"] = settings.poppler_path

    pil_images = convert_from_bytes(file_bytes, **kwargs)
    return [_pil_to_cv2(img) for img in pil_images]


# ---------------------------------------------------------------------------
# Public: extract_text
# ---------------------------------------------------------------------------

def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """
    Run OCR on an uploaded certificate (image or PDF) and return merged text.

    All heavy imports (cv2, pytesseract, pdf2image) are loaded here at
    call time so that import of this module does not require OpenCV/Tesseract.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        mime_type:  MIME type string, e.g. "image/jpeg" or "application/pdf".

    Returns:
        Concatenated OCR text from all pages.
    """
    import cv2
    import numpy as np
    import pytesseract
    from config import get_settings

    # Configure Tesseract executable path (Windows)
    settings = get_settings()
    if settings.tesseract_cmd and settings.tesseract_cmd != "tesseract":
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    if mime_type == "application/pdf":
        cv2_images = _pdf_to_cv2_images(file_bytes)
        logger.debug("PDF converted to %d page(s)", len(cv2_images))
    else:
        # Accept 'image/jpg' as alias (non-standard but sent by some browsers)
        np_array = np.frombuffer(file_bytes, dtype=np.uint8)
        cv2_img  = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if cv2_img is None:
            raise ValueError(
                f"Could not decode image with MIME type {mime_type!r}. "
                "Ensure the file is a valid JPEG, PNG, or TIFF."
            )
        cv2_images = [cv2_img]

    page_texts = []
    for idx, img in enumerate(cv2_images):
        try:
            text = _ocr_one_image(img)
            page_texts.append(text)
            logger.debug("Page %d OCR: %d chars", idx + 1, len(text))
        except Exception:
            logger.exception("OCR failed on page %d", idx + 1)

    return "\n\n--- PAGE BREAK ---\n\n".join(page_texts)


# ---------------------------------------------------------------------------
# RTU-specific regex patterns
# ---------------------------------------------------------------------------
# RTU marksheets use consistent labels; these patterns are calibrated to the
# typical OCR output for RTU header blocks.
#
# Common OCR deviations handled:
#   • Extra spaces between label colons:  "Roll No :"  vs  "Roll No:"
#   • Mixed case labels
#   • Colons sometimes misread as "|" or "-"

_LABEL_SEP = r"\s*[:\-|]?\s*"          # separator between label and value (optional)

_PATTERNS: dict[str, str] = {
    # Student name — father-name collision handled in extract_rtu_fields()
    # by skipping lines containing "Father", so no lookbehind needed here.
    # [^\n]{2,60}: capture to end of line only (no cross-line capture)
    "name": (
        r"[Nn]ame" + _LABEL_SEP +
        r"([A-Za-z][^\n]{2,60})"
    ),
    # Father's name — use .{0,5} to match 's / s / 's / ' s variants
    # Capture only to end of line.
    "father_name": (
        r"[Ff]ather.{0,5}[Nn]ame" + _LABEL_SEP +
        r"([A-Za-z][^\n]{2,60})"
    ),
    # Roll number — alphanumeric, typically 8–15 chars for RTU
    # Separator is optional to handle OCR output like "Roll No 23EJCCS189"
    "roll": (
        r"[Rr]oll\s*[Nn]o\.?" + _LABEL_SEP +
        r"([A-Z0-9]{4,20})"
    ),
    # Enrollment number — RTU enrollment: digits + letters, 8–20 chars
    # Separator is optional; also matches "Enrolment" (single l)
    "enrollment": (
        r"[Ee]nroll?ment\s*[Nn]o\.?" + _LABEL_SEP +
        r"([A-Z0-9]{6,20})"
    ),
    # College name — may span to end of line
    "college": (
        r"[Cc]ollege\s*(?:[Nn]ame)?" + _LABEL_SEP +
        r"(.{5,100})"
    ),
    # Branch / Programme
    "branch": (
        r"[Bb]ranch\s*(?:\/\s*[Pp]rogramme)?" + _LABEL_SEP +
        r"([A-Za-z][A-Za-z\s\.\(\)\/]{2,60})"
    ),
    # SGPA — decimal number 0.00–10.00
    "sgpa": (
        r"SGPA\s*(?:\([^)]*\))?" + _LABEL_SEP +
        r"(\d{1,2}(?:\.\d{1,3})?)"
    ),
    # CGPA
    "cgpa": (
        r"CGPA\s*(?:\([^)]*\))?" + _LABEL_SEP +
        r"(\d{1,2}(?:\.\d{1,3})?)"
    ),
    # Semester number
    "semester": (
        r"[Ss]emester\s*(?:[Nn]o\.?\s*)?" + _LABEL_SEP +
        r"([1-8](?:st|nd|rd|th)?)"
    ),
}

# Compile all patterns once at import time
_COMPILED: dict[str, re.Pattern] = {
    key: re.compile(pat, re.IGNORECASE)
    for key, pat in _PATTERNS.items()
}


# ---------------------------------------------------------------------------
# Public: extract_rtu_fields
# ---------------------------------------------------------------------------

def _clean_str(raw: str | None) -> str | None:
    """Strip trailing noise from a captured string field."""
    if raw is None:
        return None
    cleaned = raw.strip().strip(".,|;:")
    return cleaned if cleaned else None


def _parse_float(raw: str | None) -> float | None:
    if raw is None:
        return None
    try:
        return float(raw.strip())
    except ValueError:
        return None


def _parse_semester(raw: str | None) -> int | None:
    if raw is None:
        return None
    try:
        m = re.search(r"\d+", raw)
        return int(m.group()) if m else None
    except ValueError:
        return None


def extract_rtu_fields(text: str) -> RTUFields:
    """
    Extract RTU marksheet fields from raw OCR text using compiled regex patterns.

    Name collision guard:
      The "name" pattern is applied only on lines that do NOT also contain
      "Father" to avoid capturing father's name into the student name field.

    Args:
        text: Raw OCR text (possibly multi-page, separated by PAGE BREAK markers).

    Returns:
        RTUFields populated with whatever could be reliably extracted.
        Fields that could not be found are left as None.
    """
    # --- Name: search line by line to avoid father-name collision ---
    candidate_name: str | None = None
    for line in text.splitlines():
        if re.search(r"[Ff]ather", line):
            continue  # skip lines containing "Father"
        m = _COMPILED["name"].search(line)
        if m:
            candidate_name = _clean_str(m.group(1))
            if candidate_name and len(candidate_name) >= 3:
                break

    # --- All other fields: search full text ---
    def first_match(key: str) -> str | None:
        m = _COMPILED[key].search(text)
        return m.group(1) if m else None

    father_name_raw = _clean_str(first_match("father_name"))
    roll_raw        = _clean_str(first_match("roll"))
    enrollment_raw  = _clean_str(first_match("enrollment"))
    college_raw     = _clean_str(first_match("college"))
    branch_raw      = _clean_str(first_match("branch"))
    sgpa_raw        = first_match("sgpa")
    cgpa_raw        = first_match("cgpa")
    semester_raw    = first_match("semester")

    # Upper-case identifiers for consistent comparison (all already guarded by if)
    roll_raw        = roll_raw.upper().replace(" ", "") if roll_raw else None
    enrollment_raw  = enrollment_raw.upper().replace(" ", "") if enrollment_raw else None
    candidate_name  = candidate_name.upper() if candidate_name else None
    father_name_raw = father_name_raw.upper() if father_name_raw else None

    return RTUFields(
        name=candidate_name,
        roll=roll_raw,
        enrollment=enrollment_raw,
        father_name=father_name_raw,
        college=college_raw,
        branch=branch_raw,
        sgpa=_parse_float(sgpa_raw),
        cgpa=_parse_float(cgpa_raw),
        semester=_parse_semester(semester_raw),
        raw_text=text,
    )
