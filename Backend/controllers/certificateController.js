import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';

export async function listCertificates(req, res) {
  const { certNo } = req.query;
  const filter = { universityId: req.user.universityId };
  if (certNo) filter.certNo = certNo;
  const certs = await Certificate.find(filter).limit(500).populate('studentId').lean();
  res.json(certs);
}
