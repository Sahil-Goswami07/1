"""
rtu_api/ocr/preprocessor.py

Image preprocessing pipeline optimised for real photographed RTU marksheets.

Problems addressed:
  - Watermarks    → adaptive thresholding isolates foreground text
  - Noise         → Gaussian blur before thresholding
  - Skew          → Hough-line based deskewing
  - Uneven light  → CLAHE (Contrast Limited Adaptive Histogram Equalization)

Public API:
  preprocess_image(image: np.ndarray) -> np.ndarray
"""

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert BGR or RGBA image to single-channel grayscale."""
    if len(image.shape) == 2:
        return image  # already grayscale
    if image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _apply_clahe(gray: np.ndarray) -> np.ndarray:
    """
    CLAHE (Contrast Limited Adaptive Histogram Equalization).
    Corrects uneven lighting without washing out already-bright regions.
    """
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def _denoise(gray: np.ndarray) -> np.ndarray:
    """Light Gaussian blur to suppress high-frequency noise before thresholding."""
    return cv2.GaussianBlur(gray, (3, 3), 0)


def _threshold(denoised: np.ndarray) -> np.ndarray:
    """
    Adaptive Gaussian thresholding.

    Preferred over Otsu for RTU marksheets because:
      - Otsu picks a single global threshold → fails under watermarks / shadows.
      - Adaptive thresholding computes a local threshold per 31×31 block,
        making it robust to gradients across the page.

    The constant C=10 is subtracted from the mean to bias toward keeping more
    foreground structure while suppressing background noise.
    """
    binary = cv2.adaptiveThreshold(
        denoised,
        maxValue=255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        thresholdType=cv2.THRESH_BINARY,
        blockSize=31,
        C=10,
    )
    return binary


def _deskew(binary: np.ndarray) -> np.ndarray:
    """
    Detect the dominant text skew angle and rotate the image to correct it.

    Algorithm:
      1. Find all non-zero pixels (text foreground).
      2. Compute the minimum-area bounding rectangle of these pixels via
         cv2.minAreaRect – this gives the dominant text orientation.
      3. If the detected angle is within a reasonable range (±20°), apply
         the correction; otherwise skip (avoid rotating grossly incorrect
         images like inverted scans).
    """
    coords = np.column_stack(np.where(binary > 0))
    if len(coords) < 100:
        return binary  # not enough foreground pixels to estimate angle

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]  # angle in range (-90, 0]

    # Normalise to (-45, 45] range:
    # minAreaRect returns angles in (-90, 0]; values close to -90 mean near 0° tilt.
    if angle < -45:
        angle += 90

    # Skip correction for extreme or negligible angles
    if abs(angle) < 0.5 or abs(angle) > 20:
        return binary

    h, w = binary.shape[:2]
    center = (w // 2, h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, scale=1.0)
    return cv2.warpAffine(
        binary, rotation_matrix, (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _scale_to_min_width(image: np.ndarray, min_width: int = 1600) -> np.ndarray:
    """
    Tesseract performs best at ~300 DPI.  Camera photos are often smaller.
    Scale up while preserving aspect ratio so OCR has enough resolution.
    """
    h, w = image.shape[:2]
    if w >= min_width:
        return image
    scale = min_width / w
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Full preprocessing pipeline for an RTU marksheet image.

    Steps:
      1. Scale up to at least 1600px wide (better OCR resolution)
      2. Convert to grayscale
      3. Apply CLAHE (fix uneven lighting)
      4. Gaussian blur (reduce noise)
      5. Adaptive threshold (binarize; suppress watermarks)
      6. Deskew

    Args:
        image: Raw image as a NumPy array (BGR, BGRA, or grayscale).

    Returns:
        Preprocessed binary image ready for pytesseract.
    """
    image   = _scale_to_min_width(image, min_width=1600)
    gray    = _to_grayscale(image)
    equated = _apply_clahe(gray)
    blurred = _denoise(equated)
    binary  = _threshold(blurred)
    result  = _deskew(binary)
    return result
