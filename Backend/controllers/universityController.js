import University from '../models/University.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import VerificationLog from '../models/VerificationLog.js';

export async function listUniversities(req, res) {
  const list = await University.find();
  res.json(list);
}

export async function approveUniversity(req, res) {
  const uni = await University.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
  if (!uni) return res.status(404).json({ error: 'Not found' });
  res.json(uni);
}

export async function deleteUniversity(req, res) {
  await University.findByIdAndDelete(req.params.id);
  await User.deleteMany({ universityId: req.params.id });
  await Student.deleteMany({ universityId: req.params.id });
  await Certificate.deleteMany({ universityId: req.params.id });
  res.json({ ok: true });
}

export async function analytics(req, res) {
  const [universities, students, certs, logs] = await Promise.all([
    University.countDocuments({ status: 'approved' }),
    Student.countDocuments(),
    Certificate.countDocuments(),
    VerificationLog.countDocuments(),
  ]);
  res.json({ universities, students, certificates: certs, verifications: logs });
}
