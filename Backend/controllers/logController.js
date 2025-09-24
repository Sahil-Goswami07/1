import VerificationLog from '../models/VerificationLog.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

export async function listLogs(req, res) {
  const filter = {};
  if (req.user.role === 'universityAdmin') filter.universityId = req.user.universityId;
  const logs = await VerificationLog.find(filter).sort({ verifiedAt: -1 }).limit(500).lean();
  res.json(logs);
}

export async function stats(req, res) {
  try {
    const uniFilter = req.user.role === 'universityAdmin' ? { universityId: req.user.universityId } : {};
    const [studentCount, certificateCount, verificationCount, verifiedCount] = await Promise.all([
      Student.countDocuments(uniFilter),
      Certificate.countDocuments(uniFilter),
      VerificationLog.countDocuments(uniFilter),
      VerificationLog.countDocuments({ ...uniFilter, status: 'verified' })
    ]);
    const verifiedRate = verificationCount ? (verifiedCount / verificationCount) * 100 : 0;
    res.json({ students: studentCount, certificates: certificateCount, verifications: verificationCount, verifiedRate: Number(verifiedRate.toFixed(2)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function recentLogs(req, res) {
  try {
    const filter = req.user.role === 'universityAdmin' ? { universityId: req.user.universityId } : {};
    const logs = await VerificationLog.find(filter).sort({ verifiedAt: -1 }).limit(10).lean();
    res.json(logs.map(l => ({
      certNo: l.certNo,
      status: l.status,
      score: l.score,
      verifiedAt: l.verifiedAt || l.createdAt,
      universityId: l.universityId
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
