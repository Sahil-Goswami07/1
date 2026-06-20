import sys
import os
import json
from PIL import Image

# Add current folder to path to enable package relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from preprocessor import preprocess_image
from metadata_analysis import analyze_metadata
from logo_seal import analyze_logo_and_seal
from layout import analyze_layout
from tampering import compute_tampering_score

def run_pipeline():
  """
  Main execution entrypoint for image forensics analysis.
  Reads parameters from stdin:
  {
    "image_path": "...",
    "logo_template_path": "..." or null,
    "logo_pos": {"x": 5, "y": 5, "width": 15, "height": 15},
    "seal_template_path": "..." or null,
    "seal_pos": {"x": 75, "y": 75, "width": 20, "height": 20},
    "template_path": "..." or null
  }
  """
  try:
    # Read payload from standard input
    raw_input = sys.stdin.read()
    params = json.loads(raw_input)
    
    image_path = params.get("image_path")
    if not image_path or not os.path.exists(image_path):
      print(json.dumps({"error": f"Certificate image file not found at {image_path}"}))
      return

    # Load original image
    with Image.open(image_path) as raw_img:
      # Stage 2: Metadata analysis (on raw original)
      meta_res = analyze_metadata(raw_img)
      
      # Stage 7: Tampering detection (on raw original)
      tampering_score = compute_tampering_score(raw_img)
      
      # Stage 1: Preprocessing
      preprocessed_img = preprocess_image(raw_img)
      
      # Stage 3 & 4: Logo & Seal matching
      logo_template_path = params.get("logo_template_path")
      logo_pos = params.get("logo_pos", {"x": 5, "y": 5, "width": 15, "height": 15})
      seal_template_path = params.get("seal_template_path")
      seal_pos = params.get("seal_pos", {"x": 75, "y": 75, "width": 20, "height": 20})
      
      logo_seal_res = analyze_logo_and_seal(
        preprocessed_img,
        logo_template_path,
        logo_pos,
        seal_template_path,
        seal_pos
      )
      
      # Stage 6: Layout matching
      template_path = params.get("template_path")
      layout_similarity = analyze_layout(preprocessed_img, template_path)

    # Return pipeline output
    output = {
      "logoSimilarity": logo_seal_res["logoSimilarity"],
      "sealSimilarity": logo_seal_res["sealSimilarity"],
      "metadataRisk": meta_res["metadataRisk"],
      "tamperingScore": tampering_score,
      "layoutSimilarity": layout_similarity,
      "metadata": {
        "software": meta_res["software"],
        "make_model": meta_res["make_model"],
        "timestamp": meta_res["timestamp"],
        "dpi": meta_res["dpi"],
        "has_icc_profile": meta_res["has_icc_profile"]
      }
    }
    
    print(json.dumps(output))
    
  except Exception as e:
    print(json.dumps({"error": f"Image forensics pipeline crashed: {str(e)}"}))

if __name__ == "__main__":
  run_pipeline()
