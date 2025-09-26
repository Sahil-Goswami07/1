// Rule-based validation for certificates.
// Returns { ok: boolean, reasons: string[] }
import University from '../models/University.js';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';

// Reasonable default patterns (adjust later if needed)
// certNo: mixture of uppercase letters/digits length 10-20, must contain at least 2 letters and 2 digits
const CERT_NO_REGEX = /^[A-Z0-9]{10,20}$/;
// rollNo: pattern similar (observed examples like 23EJCIT054) -> 2 digits + 5-8 alphanumerics + 3 digits
const ROLL_REGEX = /^[0-9]{2}[A-Z]{2,6}[0-9]{3}$/i;

export async function validateRules({ cert, student, university }) {
  const reasons = [];
  if (!cert) {
    reasons.push('Certificate missing');
    return { ok: false, reasons };
  }
  // Certificate number format
  if (!CERT_NO_REGEX.test(cert.certNo || '')) {
    reasons.push('Invalid certificate number format');
  }
  // Roll pattern
  if (student && student.rollNo && !ROLL_REGEX.test(student.rollNo)) {
    reasons.push('Roll number format anomaly');
  }
  // University existence
  if (!university) {
    reasons.push('University not found');
  }
  // Marks range
  if (cert.marksPercent != null) {
    const m = Number(cert.marksPercent);
    if (isNaN(m) || m < 0 || m > 100) reasons.push('Marks out of range');
  }
  return { ok: reasons.length === 0, reasons };
}

export const patterns = { CERT_NO_REGEX, ROLL_REGEX };
