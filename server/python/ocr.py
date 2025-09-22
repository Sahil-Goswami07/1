import sys, json, re, os

def preprocess_image_for_ocr(image_path: str):
    try:
        import cv2
        import numpy as np
        img = cv2.imread(image_path)
        if img is None:
            return None
        h, w = img.shape[:2]
        target_w = 1600
        scale = target_w / max(1, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        # Otsu threshold
        _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_preproc.png")
        cv2.imwrite(tmp, th)
        return tmp
    except Exception:
        return None

def try_easyocr_extract(image_path: str):
    try:
        import easyocr
    except Exception:
        return None
    try:
        reader = easyocr.Reader(['en','hi'], gpu=False)
        # Prefer preprocessed image if available
        pre = preprocess_image_for_ocr(image_path)
        use_path = pre if pre else image_path
        lines = reader.readtext(use_path, detail=0)
        text = "\n".join(lines)
        return text
    except Exception:
        return None

def parse_fields(text: str):
    def find(regex, flags=re.I):
        m = re.search(regex, text, flags)
        if not m:
            return ''
        # Return the last non-empty captured group (usually the value)
        if m.lastindex:
            for i in range(m.lastindex, 0, -1):
                val = m.group(i)
                if val and val.strip():
                    return val.strip()
        # Fallback to group(1)
        return m.group(1).strip()

    cert_no = find(r"(cert(?:ificate)?|ref|sr)\s*(?:id|no\.?|number)?\s*[:#]?\s*([A-Z0-9\-\/]{6,})") or find(r"certificate\s*id\s*[:#]?\s*([A-Z0-9\-\/]{6,})")
    roll_no = find(r"(roll|enrol|enroll|enrollment|registration|reg|usn|srn|seat|index)\s*(?:no\.?|number)?\s*[:#]?\s*([A-Z0-9\-\/]{3,})")
    marks = find(r"(?:marks|percentage|percent|cgpa|grade)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]+)?)")
    year = find(r"(?:year|session|passing|pass\s*year|issued)\s*[:#]?\s*((?:19|20)\d{2})")

    name = find(r"name(?:\s*of\s*(?:the\s*)?candidate)?\s*[:#]?\s*([A-Za-z][A-Za-z\s\.]{2,})")
    if not name:
        m = re.search(r"this\s+is\s+to\s+certify\s+that\s+([A-Za-z][^\n,]{2,})", text, re.I)
        if m:
            name = m.group(1).strip()
    if not name:
        # heuristic: first line with 2+ capitalized words
        for line in text.splitlines():
            words = [w for w in re.findall(r"[A-Za-z]+", line) if len(w) > 1]
            caps = sum(1 for w in words if w[0].isupper())
            if caps >= 2 and len(words) >= 2:
                name = " ".join(words[:3])
                break

    institution = ''
    for line in text.splitlines():
        if re.search(r"(University|College|Institute|Board|Academy|School|Polytechnic)", line, re.I):
            institution = line.strip()
            break

    fields = {
        "name": name or "",
        "rollNo": roll_no or "",
        "certNo": cert_no or "",
        "marksPercent": float(marks) if marks else None,
        "institution": institution or "",
        "year": int(year) if year else None,
    }
    return fields

def pdf_first_page_to_tmp_image(pdf_path: str):
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_path)
        if len(pdf) == 0:
            return None
        page = pdf[0]
        bitmap = page.render(scale=2).to_pil()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_firstpage.png")
        bitmap.save(tmp)
        return tmp
    except Exception:
        return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no file"}))
        sys.exit(1)
    file_path = sys.argv[1]
    ext = os.path.splitext(file_path)[1].lower()

    text = None
    if ext in (".png", ".jpg", ".jpeg", ".webp"):
        text = try_easyocr_extract(file_path)
    elif ext == ".pdf":
        img = pdf_first_page_to_tmp_image(file_path)
        if img:
            text = try_easyocr_extract(img)

    fields = None
    if text:
        fields = parse_fields(text)

    if not fields:
        # Minimal empty placeholders if OCR failed
        fields = {
            "name": "",
            "rollNo": "",
            "certNo": "",
            "marksPercent": None,
            "institution": "",
            "year": None,
        }

    print(json.dumps({"fields": fields, "text": text or ""}))

if __name__ == "__main__":
    main()
