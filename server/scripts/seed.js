import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import Student from '../src/models/Student.js';
import Certificate from '../src/models/Certificate.js';
import bcrypt from 'bcryptjs';

// Load .env from current working directory (server/.env when run via npm script)
dotenv.config();

async function seed() {
  await connectDB(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth');
  await Student.deleteMany({});
  await Certificate.deleteMany({});

  const admin = await Student.create({
    name: 'Admin', rollNo: 'ADMIN001', course: 'N/A', institution: 'EduAuth', graduationYear: 2025, role: 'Admin', email: 'admin@eduauth.local', passwordHash: await bcrypt.hash('admin123', 10)
  });

  const ankit = await Student.create({
    name: 'Ankit Sharma', rollNo: '19CS001', course: 'B.Tech CSE', institution: 'Rajasthan University', graduationYear: 2021, email: 'ankit@example.com'
  });

  await Certificate.create({
    certNo: 'RU2021CSE01',
    studentId: ankit._id,
    issueDate: new Date('2021-06-30'),
    marksPercent: 78.5,
    certificateHash: null
  });

  console.log('Seed completed');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
