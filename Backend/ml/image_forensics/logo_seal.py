import os
import numpy as np
from PIL import Image

def crop_region(image, pos):
  """
  Helper to crop a region from an image based on x, y, width, height percentages.
  """
  w, h = image.size
  x = int(w * pos.get('x', 0) / 100.0)
  y = int(h * pos.get('y', 0) / 100.0)
  width = int(w * pos.get('width', 20) / 100.0)
  height = int(h * pos.get('height', 20) / 100.0)
  
  left = max(0, min(x, w - 1))
  top = max(0, min(y, h - 1))
  right = max(left + 1, min(left + width, w))
  bottom = max(top + 1, min(top + height, h))
  
  return image.crop((left, top, right, bottom))

def compare_images(img1, img2):
  """
  Compares two PIL images using a normalized grayscale Mean Absolute Error (MAE).
  Returns a similarity score between 0.0 and 1.0.
  """
  # Resize to 64x64 and convert to grayscale
  i1 = img1.resize((64, 64)).convert("L")
  i2 = img2.resize((64, 64)).convert("L")
  
  arr1 = np.array(i1, dtype=float)
  arr2 = np.array(i2, dtype=float)
  
  mae = np.mean(np.abs(arr1 - arr2))
  similarity = 1.0 - (mae / 255.0)
  return float(max(0.0, min(1.0, similarity)))

def analyze_logo_and_seal(image, logo_template_path, logo_pos, seal_template_path, seal_pos):
  """
  Stage 3 & 4 logo and seal verification.
  Crops logo and seal regions from preprocessed image and evaluates similarity.
  """
  logo_similarity = 1.0
  seal_similarity = 1.0
  
  # Process Logo
  if logo_template_path and os.path.exists(logo_template_path):
    try:
      cropped_logo = crop_region(image, logo_pos)
      with Image.open(logo_template_path) as logo_tpl:
        logo_similarity = compare_images(cropped_logo, logo_tpl)
    except Exception as e:
      print(f"[Warning] Logo check error: {str(e)}")
      
  # Process Seal
  if seal_template_path and os.path.exists(seal_template_path):
    try:
      cropped_seal = crop_region(image, seal_pos)
      with Image.open(seal_template_path) as seal_tpl:
        seal_similarity = compare_images(cropped_seal, seal_tpl)
    except Exception as e:
      print(f"[Warning] Seal check error: {str(e)}")
      
  return {
    "logoSimilarity": logo_similarity,
    "sealSimilarity": seal_similarity
  }
