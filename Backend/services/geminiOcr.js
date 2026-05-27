/**
 * services/geminiOcr.js
 *
 * Uses Google Gemini 1.5 Flash (vision model) to extract RTU marksheet fields
 * directly from an image. Works for photographed marksheets where Tesseract fails.
 *
 * Requires: GEMINI_API_KEY in your .env file
 * Get a free key at: https://aistudio.google.com/app/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';

// RTU-specific extraction prompt — tells Gemini exactly what to find
const RTU_EXTRACTION_PROMPT = `You are an OCR expert reading an RTU (Rajasthan Technical University) marksheet.

Extract ONLY these exact fields from the marksheet image and return them as a JSON object:

{
  "rollNumber": "the Roll No value, e.g. 23EJCCS189",
  "enrollmentNumber": "the Enrollment No value, e.g. 23E1JCCSM45P189",
  "candidateName": "student full name in UPPERCASE, e.g. SAHIL GIRI",
  "fatherName": "father full name in UPPERCASE, e.g. JITENDRA GIRI",
  "sgpa": "SGPA decimal value as a number, e.g. 8.88",
  "cgpa": "CGPA decimal value as a number, e.g. 8.84",
  "semester": "semester number as integer, e.g. 2",
  "collegeName": "name of the college"
}

Rules:
- Return ONLY valid JSON. No markdown code blocks. No explanation.
- If a field is not found or unclear, set it to null.
- Roll numbers and Enrollment numbers are alphanumeric (letters + digits only, no spaces).
- Names should be in full UPPERCASE.
- Numbers (sgpa, cgpa, semester) must be numeric types, not strings.`;

/**
 * Extract RTU fields from an image file using Gemini Vision.
 *
 * @param {string} filePath  - absolute path to the uploaded temp file
 * @param {string} mimetype  - MIME type: image/jpeg | image/png | image/webp etc.
 * @returns {object|null}    - extracted fields object, or null on failure
 */
export async function extractWithGemini(filePath, mimetype) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[GEMINI-OCR] GEMINI_API_KEY not set — skipping Gemini extraction');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Read image and convert to base64
    const imageBytes  = await fs.readFile(filePath);
    const base64Image = imageBytes.toString('base64');

    console.log('[GEMINI-OCR] Sending image to Gemini Vision API...');

    const result = await model.generateContent([
      RTU_EXTRACTION_PROMPT,
      {
        inlineData: {
          data:     base64Image,
          mimeType: mimetype,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    console.log('[GEMINI-OCR] Raw response:', responseText.slice(0, 300));

    // Parse the JSON response
    // Gemini sometimes wraps in ```json ... ``` — strip it
    const cleaned = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const fields = JSON.parse(cleaned);

    // Normalize: uppercase IDs, strip spaces from IDs
    if (fields.rollNumber)       fields.rollNumber       = String(fields.rollNumber).toUpperCase().replace(/\s+/g, '');
    if (fields.enrollmentNumber) fields.enrollmentNumber = String(fields.enrollmentNumber).toUpperCase().replace(/\s+/g, '');
    if (fields.candidateName)    fields.candidateName    = String(fields.candidateName).toUpperCase().trim();
    if (fields.fatherName)       fields.fatherName       = String(fields.fatherName).toUpperCase().trim();

    console.log('[GEMINI-OCR] Extracted fields:', JSON.stringify(fields, null, 2));
    return fields;

  } catch (err) {
    console.log('[GEMINI-OCR] Failed:', err.message);
    return null;
  }
}
