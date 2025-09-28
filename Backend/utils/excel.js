import xlsx from 'xlsx';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

// Basic patterns (can be externalized later)
const ROLL_PATTERN = /^(\d{2})EJ[A-Z]{3,4}\d{3}$/; // loose inference
const ENROLL_PATTERN = /^(\d{2})E1J[A-Z]{3,4}[A-Z]\d{2}P\d{3}$/; // inference based on samples

function normString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export async function importExcel(buffer, universityId) {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  if (process.env.DEBUG_EXCEL === '1') {
    console.log('[excel import] rows:', rows.length, 'sample:', rows[0]);
  }
  const students = [];
  const certs = [];
  const errors = [];
  const normalization = { rollNoChanged: 0, enrollmentNoChanged: 0, certNoFromEnrollment: 0, certNoNormalized: 0, rollNoNormalized: 0, enrollmentNoNormalized: 0 };
  let skippedCerts = 0;
  let rowIndex = 1; // 1-based with header row assumed above
  for (const r of rows) {
    // Expected columns (extended): rollNo, enrollmentNo, name, fatherName, course, certNo, issueDate, marks, graduationYear
    const graduationYearRaw = r.graduationYear || r.GraduationYear || r.Year;
    let rollNo = normString(r.rollNo || r.RollNo || r.Roll || r['Roll No']);
    let enrollmentNo = normString(r.enrollmentNo || r.EnrollmentNo || r['Enrollment No'] || r.enrollment || r.Enrollment);
    const name = normString(r.name || r.Name);
    const fatherName = normString(r.fatherName || r.FatherName || r["Father's Name"] || r.father || r.Father);
    const course = normString(r.course || r.Course);
    const marksPercent = r.marks || r.Marks || r.marksPercent;
    let certNo = normString(r.certNo || r.CertNo || r['Certificate No'] || r.CertificateNo);

    // Normalization helpers
    const normalizeId = v => v ? v.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : v;
    const orig = { rollNo, enrollmentNo, certNo };
    if (rollNo) {
      const n = normalizeId(rollNo);
      if (n !== rollNo) { normalization.rollNoNormalized++; rollNo = n; }
    }
    if (enrollmentNo) {
      const n = normalizeId(enrollmentNo);
      if (n !== enrollmentNo) { normalization.enrollmentNoNormalized++; enrollmentNo = n; }
    }
    if (certNo) {
      const n = normalizeId(certNo);
      if (n !== certNo) { normalization.certNoNormalized++; certNo = n; }
    }
    // Auto-fill certNo from enrollmentNo when missing
    if (!certNo && enrollmentNo) { certNo = enrollmentNo; normalization.certNoFromEnrollment++; }

    const graduationYear = graduationYearRaw ? Number(String(graduationYearRaw).trim()) : undefined;
    // Issue date parse
    const rawIssue = r.issueDate || r.IssueDate || r['Issue Date'];
    let issueDate = null;
    if (rawIssue) {
      const parsed = new Date(rawIssue);
      if (!isNaN(parsed.getTime())) issueDate = parsed; else errors.push({ row: rowIndex, field: 'issueDate', message: 'Invalid date format' });
    }

    // Field validations
  if (!rollNo) errors.push({ row: rowIndex, field: 'rollNo', message: 'Missing rollNo' });
  else if (!ROLL_PATTERN.test(rollNo)) errors.push({ row: rowIndex, field: 'rollNo', message: 'rollNo does not match expected pattern' });
  if (enrollmentNo && !ENROLL_PATTERN.test(enrollmentNo)) errors.push({ row: rowIndex, field: 'enrollmentNo', message: 'enrollmentNo pattern mismatch' });
    if (!name) errors.push({ row: rowIndex, field: 'name', message: 'Missing name' });
    if (graduationYear && (graduationYear < 2000 || graduationYear > new Date().getFullYear() + 8)) errors.push({ row: rowIndex, field: 'graduationYear', message: 'graduationYear out of plausible range' });
    if (marksPercent && (isNaN(Number(marksPercent)) || Number(marksPercent) < 0 || Number(marksPercent) > 100)) errors.push({ row: rowIndex, field: 'marks', message: 'marks must be 0-100' });

    // Build student if minimally viable
    if (rollNo) {
      students.push({
        name,
        rollNo,
        enrollmentNo: enrollmentNo || undefined,
        fatherName: fatherName || undefined,
        course: course || undefined,
        graduationYear,
        universityId,
      });
    }

    if (certNo) {
      certs.push({
        certNo,
        marksPercent: marksPercent === '' ? undefined : marksPercent,
        issueDate,
        rollNo, // temp mapping
        universityId,
      });
    } else if (rollNo) {
      skippedCerts++;
    }
    rowIndex++;
  }
  // Upsert logic simplified: insertMany ignore duplicates via ordered:false
  let insertedStudents = 0; let duplicateStudents = 0;
  if (students.length) {
    try {
      const res = await Student.insertMany(students, { ordered: false });
      insertedStudents = res.length;
    } catch (e) {
      // Mongoose bulk insert with ordered:false still throws but partial docs inserted.
      if (e.writeErrors) {
        insertedStudents = students.length - e.writeErrors.length;
        duplicateStudents = e.writeErrors.length;
      }
    }
  }
  // Need studentId for certificates => fetch by rollNo mapping
  const existingStudents = await Student.find({ universityId, rollNo: { $in: students.map(s=>s.rollNo) } });
  const studentMap = new Map(existingStudents.map(s => [s.rollNo, s._id]));
  for (const c of certs) {
    if (c.rollNo) {
      const sId = studentMap.get(c.rollNo) || null;
      if (sId) c.studentId = sId;
    }
    delete c.rollNo; // cleanup
  }
  const finalCerts = certs.filter(c => c.studentId && c.certNo);
  let insertedCerts = 0; let duplicateCerts = 0;
  if (finalCerts.length) {
    try {
      const res = await Certificate.insertMany(finalCerts, { ordered: false });
      insertedCerts = res.length;
    } catch (e) {
      if (e.writeErrors) {
        insertedCerts = finalCerts.length - e.writeErrors.length;
        duplicateCerts = e.writeErrors.length;
      }
    }
  }
  return { students: students.length, certificates: finalCerts.length, insertedStudents, duplicateStudents, insertedCerts, duplicateCerts, skippedCerts, errors, normalization };
}
