import xlsx from 'xlsx';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

export async function importExcel(buffer, universityId) {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  if (process.env.DEBUG_EXCEL === '1') {
    console.log('[excel import] rows:', rows.length, 'sample:', rows[0]);
  }
  const students = [];
  const certs = [];
  let skippedCerts = 0;
  for (const r of rows) {
    // Expected columns: rollNo, name, course, certNo, issueDate, marks, institution, graduationYear
    const graduationYearRaw = r.graduationYear || r.GraduationYear || r.Year;
    const student = {
      name: r.name || r.Name,
      rollNo: r.rollNo || r.RollNo || r.Roll || r['Roll No'],
      course: r.course || r.Course,
      graduationYear: graduationYearRaw ? Number(String(graduationYearRaw).trim()) : undefined,
      universityId,
    };
    if (student.rollNo) students.push(student);
    const rawIssue = r.issueDate || r.IssueDate || r['Issue Date'];
    let issueDate = null;
    if (rawIssue) {
      const parsed = new Date(rawIssue);
      if (!isNaN(parsed.getTime())) issueDate = parsed;
    }
  const certNo = r.certNo || r.CertNo || r['Certificate No'] || r.CertificateNo;
    if (certNo) {
      certs.push({
        certNo,
        marksPercent: r.marks || r.Marks || r.marksPercent,
        issueDate,
        rollNo: student.rollNo, // temp for mapping
        universityId,
      });
    } else {
      skippedCerts++;
    }
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
  return { students: students.length, certificates: finalCerts.length, insertedStudents, duplicateStudents, insertedCerts, duplicateCerts, skippedCerts };
}
