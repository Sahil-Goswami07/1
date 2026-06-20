import os
import numpy as np
from PIL import Image, ImageFilter

def analyze_layout(cert_image, template_path):
  """
  Stage 6: Layout verification.
  Compares the structural layout of the certificate against the official blank template.
  Uses heavy Gaussian blurring to filter out text contents while keeping layout grid structures.
  """
  if not template_path or not os.path.exists(template_path):
    return 1.0  # Default to perfect layout match if no template is configured

  try:
    with Image.open(template_path) as template_img:
      # Resize to 128x128
      c_res = cert_image.resize((128, 128)).convert("L")
      t_res = template_img.resize((128, 128)).convert("L")
      
      # Apply heavy blur to mask out actual characters/text
      c_blur = c_res.filter(ImageFilter.GaussianBlur(radius=8.0))
      t_blur = t_res.filter(ImageFilter.GaussianBlur(radius=8.0))
      
      arr_c = np.array(c_blur, dtype=float)
      arr_t = np.array(t_blur, dtype=float)
      
      # Compute Mean Absolute Error
      mae = np.mean(np.abs(arr_c - arr_t))
      similarity = 1.0 - (mae / 255.0)
      return float(max(0.0, min(1.0, similarity)))
  except Exception as e:
    print(f"[Warning] Layout matching error: {str(e)}")
    return 0.5  # Return baseline mismatch if processing fails
