from PIL import ImageEnhance, ImageFilter

def preprocess_image(image, target_size=(1200, 1600)):
  """
  Stage 1: Preprocesses certificate image.
  Converts to RGB, resizes, applies Gaussian denoising, boosts contrast,
  and normalizes average brightness to a baseline.
  """
  # 1. Convert to RGB
  img = image.convert("RGB")
  
  # 2. Resize
  img = img.resize(target_size)
  
  # 3. Denoise
  img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
  
  # 4. Contrast enhancement
  img = ImageEnhance.Contrast(img).enhance(1.2)
  
  # 5. Normalize brightness (adjust target average to ~127 gray)
  gray = img.convert("L")
  pixels = list(gray.getdata())
  avg_brightness = sum(pixels) / len(pixels) if pixels else 0
  if avg_brightness > 0:
    factor = 127.0 / avg_brightness
    # Keep adjustment factor in a realistic safety range (0.6 - 1.4)
    factor = max(0.6, min(1.4, factor))
    img = ImageEnhance.Brightness(img).enhance(factor)
    
  return img
