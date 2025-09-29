import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import University from '../models/University.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

dotenv.config();

async function main(){
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth';
  await connectDB(uri);
  console.log('[demo] Connected DB');

  // Upsert a demo university
  const uniCode = 'DEMO-U01';
  let uni = await University.findOne({ code: uniCode });
  if (!uni) {
    uni = await University.create({ code: uniCode, name: 'Demo Tech University', status: 'approved', contactEmail: 'demo@example.com' });
    console.log('[demo] Created university');
  } else {
    console.log('[demo] Reusing existing university');
  }

  // Define core dataset
  const baseStudents = [
    { rollNo: '23EJCCS101', enrollmentNo: '23E1JCCSM45P101', name: 'ARJUN VERMA', fatherName: 'SANJAY VERMA', course: 'B.TECH CSE', graduationYear: 2027, marks: 86 },
    { rollNo: '23EJCCS102', enrollmentNo: '23E1JCCSM45P102', name: 'PRIYA NAIR', fatherName: 'RAMESH NAIR', course: 'B.TECH CSE', graduationYear: 2027, marks: 91 },
    { rollNo: '23EJCCS103', enrollmentNo: '23E1JCCSM45P103', name: 'MOHIT KAPOOR', fatherName: 'ANIL KAPOOR', course: 'B.TECH CSE', graduationYear: 2027, marks: 73 },
    { rollNo: '23EJCCS104', enrollmentNo: '23E1JCCSM45P104', name: 'SANA SHEIKH', fatherName: 'FAIZ SHEIKH', course: 'B.TECH CSE', graduationYear: 2027, marks: 88 },
    { rollNo: '23EJCCS105', enrollmentNo: '23E1JCCSM45P105', name: 'DIVYA GUPTA', fatherName: 'RAKESH GUPTA', course: 'B.TECH CSE', graduationYear: 2027, marks: 95 },
    { rollNo: '23EJCCS106', enrollmentNo: '23E1JCCSM45P106', name: 'KARAN SINGH', fatherName: 'ARVIND SINGH', course: 'B.TECH CSE', graduationYear: 2027, marks: 64 }
  ];

  // Edge / tampered scenarios (to manually test mismatch):
  //  - We intentionally do NOT insert certificates for a couple of roll numbers or alter marks later in verification step.

  for (const s of baseStudents) {
    const existing = await Student.findOne({ rollNo: s.rollNo, universityId: uni._id });
    if (!existing) {
      await Student.create({
        rollNo: s.rollNo,
        enrollmentNo: s.enrollmentNo,
        name: s.name,
        fatherName: s.fatherName,
        course: s.course,
        graduationYear: s.graduationYear,
        universityId: uni._id
      });
    }
  }
  console.log('[demo] Students ensured');

  // Insert certificates for first 5 only (leave last as missing certificate edge case)
  for (let i = 0; i < baseStudents.length - 1; i++) {
    const s = baseStudents[i];
    const stu = await Student.findOne({ rollNo: s.rollNo, universityId: uni._id });
    if (!stu) continue;
    const existingCert = await Certificate.findOne({ certNo: s.enrollmentNo, universityId: uni._id });
    if (!existingCert) {
      await Certificate.create({
        certNo: s.enrollmentNo, // using enrollmentNo as certNo per normalization rule
        studentId: stu._id,
        marksPercent: s.marks,
        universityId: uni._id,
        issueDate: new Date('2025-06-15')
      });
    }
  }
  console.log('[demo] Certificates ensured (last student no certificate for negative test)');

  console.log('\n[demo] DATASET READY');
  console.log('University Code:', uni.code);
  console.log('Student Roll Examples:', baseStudents.slice(0,3).map(s=>s.rollNo).join(', '));
  console.log('Cert/Enrollment Example:', baseStudents[0].enrollmentNo);
  await mongoose.disconnect();
}

main().catch(e => { console.error('Seed error', e); process.exit(1); });
