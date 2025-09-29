// Lightweight scoring test (no Jest) to validate verifyCertificate logic for a happy path scenario.
// Run with: node ./tests/scoring.test.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import { verifyCertificate } from '../controllers/verifyController.js';

dotenv.config();

function mockReqRes(body, user){
  const req = { body, files: {}, user };
  const res = {
    statusCode: 200,
    _json: null,
    status(c){ this.statusCode = c; return this; },
    json(o){ this._json = o; return this; }
  };
  return { req, res };
}

async function main(){
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduauth_test';
  await connectDB(uri);
  await Student.deleteMany({ testFixture: true });
  await Certificate.deleteMany({ testFixture: true });

  // Seed student & certificate
  const student = await Student.create({
    name: 'ALICE JOHNSON',
    rollNo: '23EJCCS001',
    course: 'B.TECH CSE',
    graduationYear: 2026,
    universityId: new mongoose.Types.ObjectId(),
    testFixture: true
  });
  const cert = await Certificate.create({
    certNo: '23E1JCCSM45P001',
    studentId: student._id,
    marksPercent: 87,
    universityId: student.universityId,
    testFixture: true
  });

  const { req, res } = mockReqRes({ certNo: cert.certNo, rollNo: student.rollNo }, { role: 'universityAdmin', universityId: student.universityId });
  await verifyCertificate(req, res);

  if (res.statusCode !== 200) {
    console.error('[FAIL] Expected status 200 got', res.statusCode);
    process.exit(1);
  }
  const r = res._json;
  const passed = r.status === 'VERIFIED' && r.score >= 70 && (r.fieldsMatched||[]).includes('rollNo');
  if (!passed) {
    console.error('[FAIL] Unexpected verification result:', r);
    process.exit(1);
  }
  console.log('[PASS] Scoring happy path verified:', { score: r.score, status: r.status, matched: r.fieldsMatched });
  await mongoose.disconnect();
}

main().catch(e => { console.error('Test execution error', e); process.exit(1); });
