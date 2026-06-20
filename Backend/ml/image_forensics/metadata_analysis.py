def analyze_metadata(image):
  """
  Stage 2: Metadata analysis.
  Extracts creation/modification software, timestamps, DPI, color profiles,
  and camera make/model from EXIF/image headers.
  Computes a metadataRisk score between 0.0 and 1.0.
  """
  info = image.info or {}
  
  # Get EXIF tags
  exif = {}
  try:
    exif_raw = image.getexif()
    if exif_raw:
      exif = {tag: exif_raw[tag] for tag in exif_raw}
  except Exception:
    pass

  # 305 is Software tag in standard EXIF
  software = str(info.get("software", "")).strip()
  if not software and 305 in exif:
    software = str(exif[305]).strip()
      
  dpi = info.get("dpi", None)
  has_icc = "icc_profile" in info
  
  # Camera indicators (271 is Make, 272 is Model)
  make = str(exif.get(271, "")).strip()
  model = str(exif.get(272, "")).strip()
  
  # Timestamp (306 is DateTime)
  timestamp = str(exif.get(306, "")).strip()
  
  risk = 0.0
  reasons = []
  
  # Evaluate risk factors based on edit software signatures
  software_lower = software.lower()
  if any(tool in software_lower for tool in ["photoshop", "gimp", "adobe", "illustrator", "paint", "pixelmator", "affinity", "corel"]):
    risk += 0.80
    reasons.append(f"Edited with digital editing software: {software}")
  elif software:
    risk += 0.15
    reasons.append(f"Exported/compiled via software: {software}")
      
  # No color profile (ICC) is typical for stripped/edited web uploads
  if not has_icc:
    risk += 0.10
    reasons.append("Color profile (ICC) missing or stripped")
      
  # Camera metadata checks
  if make or model:
    # Camera capture implies physical scan/photo, reducing risk of pure digital forgery
    risk = max(0.0, risk - 0.20)
    reasons.append(f"Captured by physical hardware device: {make} {model}")
  else:
    # Digitally rendered vectors / exports are easier to alter
    risk += 0.10
    reasons.append("No hardware camera metadata (digitally compiled export)")
      
  # Bound risk between 0.0 and 1.0
  risk = float(max(0.0, min(1.0, risk)))
  
  return {
    "software": software or "Unknown",
    "make_model": f"{make} {model}".strip() or "Unknown",
    "timestamp": timestamp or "Unknown",
    "dpi": str(dpi) if dpi else "Unknown",
    "has_icc_profile": has_icc,
    "metadataRisk": risk,
    "reasons": reasons
  }
