import VerificationLog from '../models/VerificationLog.js';

export async function listLogs(req, res) {
  const filter = {};
  if (req.user.role === 'universityAdmin') filter.universityId = req.user.universityId;
  const logs = await VerificationLog.find(filter).sort({ verifiedAt: -1 }).limit(500).lean();
  res.json(logs);
}
