import os
import numpy as np
from PIL import Image, ImageFilter

def compute_tampering_score(image):
  """
  Stage 7: Tampering detection.
  1. Error Level Analysis (ELA): Saves at JPEG quality 95, computes pixel deviation
     between original and compressed version.
  2. Noise Inconsistency: Extracts high-frequency noise using a high-pass filter
     and measures noise variance / standard deviation.
  Returns a combined tamperingScore between 0.0 and 1.0.
  """
  temp_path = f"temp_ela_{os.getpid()}.jpg"
  ela_score = 0.0
  
  # 1. ELA Computation
  try:
    rgb_img = image.convert("RGB")
    rgb_img.save(temp_path, "JPEG", quality=95)
    with Image.open(temp_path) as compressed:
      arr_orig = np.array(rgb_img, dtype=float)
      arr_comp = np.array(compressed, dtype=float)
      
    diff = np.abs(arr_orig - arr_comp)
    ela_val = np.mean(diff)
    
    # ELA scale mapping: standard compressed artifacts fall under 5.0 mean deviation.
    # Scores above this indicate edited resaved pixels.
    ela_score = min(1.0, ela_val / 10.0)
  except Exception as e:
    print(f"[Warning] ELA calculation failed: {str(e)}")
    ela_score = 0.1  # Baseline
  finally:
    if os.path.exists(temp_path):
      try:
        os.remove(temp_path)
      except Exception:
        pass
        
  # 2. Noise Inconsistency Analysis
  try:
    gray = image.convert("L")
    blurred = gray.filter(ImageFilter.GaussianBlur(radius=2.0))
    
    arr_gray = np.array(gray, dtype=float)
    arr_blurred = np.array(blurred, dtype=float)
    
    # High-pass filter noise extraction
    noise = np.abs(arr_gray - arr_blurred)
    noise_std = np.std(noise)
    
    # Clean vector exports have noise std < 1.0. Scan files or edited composites
    # have higher standard deviations.
    noise_score = min(1.0, noise_std / 30.0)
  except Exception as e:
    print(f"[Warning] Noise analysis failed: {str(e)}")
    noise_score = 0.1

  # Weighted combination (60% ELA, 40% Noise structural variance)
  tampering_score = 0.6 * ela_score + 0.4 * noise_score
  return float(max(0.0, min(1.0, tampering_score)))
