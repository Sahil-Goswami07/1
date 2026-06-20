import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import University from '../models/University.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth';
  await connectDB(uri);
  console.log('[seed] Connected to MongoDB');

  // ==========================================
  // 1. STEP 1: CONFIGURE UNIVERSITY DATA
  // ==========================================
  const universityData = {
    code: 'RTU-KOTA',
    name: 'Rajasthan Technical University',
    status: 'approved',
    contactEmail: 'admin@rtu.ac.in',
    // Assets must be placed in: Backend/public/uploads/
    sealImage: '/uploads/seals/rtu_official_seal.png', 
    logoImage: '/uploads/logos/rtu_official_logo.png',
    templateImage: '/uploads/templates/rtu_empty_template.png',
    // Crop box percentages (0 - 100) where seal and logo reside in the template
    sealPosition: { x: 75, y: 75, width: 20, height: 20 },
    logoPosition: { x: 5, y: 5, width: 15, height: 15 }
  };

  let uni = await University.findOne({ code: universityData.code });
  if (!uni) {
    uni = await University.create(universityData);
    console.log(`[seed] Created university: ${universityData.name}`);
  } else {
    // Update existing university configurations
    Object.assign(uni, universityData);
    await uni.save();
    console.log(`[seed] Updated configuration for university: ${universityData.name}`);
  }

  // ==========================================
  // 2. STEP 2: CONFIGURE STUDENT DATA
  // ==========================================
  const studentData = {
    rollNo: '23EJCIT054', // Matches candidate roll
    enrollmentNo: '23E1JCITM45P054', // Matches certificate / enrollment identifier
    name: 'SAHIL GOSWAMI',
    fatherName: 'SANJAY GOSWAMI',
    course: 'B.TECH IT',
    graduationYear: 2027,
    universityId: uni._id
  };

  let student = await Student.findOne({ rollNo: studentData.rollNo, universityId: uni._id });
  if (!student) {
    student = await Student.create(studentData);
    console.log(`[seed] Created student record for: ${studentData.name}`);
  } else {
    Object.assign(student, studentData);
    await student.save();
    console.log(`[seed] Student record updated for: ${studentData.name}`);
  }

  // ==========================================
  // 3. STEP 3: CONFIGURE CERTIFICATE DATA
  // ==========================================
  const certificateData = {
    certNo: studentData.enrollmentNo, // The primary key (enrollment/certificate number)
    studentId: student._id,
    marksPercent: 84.5,
    universityId: uni._id,
    issueDate: new Date('2025-06-15')
  };

  let cert = await Certificate.findOne({ certNo: certificateData.certNo, universityId: uni._id });
  if (!cert) {
    cert = await Certificate.create(certificateData);
    console.log(`[seed] Created certificate record: ${certificateData.certNo}`);
  } else {
    Object.assign(cert, certificateData);
    await cert.save();
    console.log(`[seed] Certificate record updated: ${certificateData.certNo}`);
  }

  console.log('\n[seed] SUCCESS: Seed data complete.');
  console.log('You can now upload the certificate in the UI and verify.');
  
  await mongoose.disconnect();
}

main().catch(e => {
  console.error('Seed error', e);
  process.exit(1);
});
