import VerificationLog from '../models/VerificationLog.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import { Parser as CsvParser } from 'json2csv';

export async function listLogs(req, res) {
  try {
    const { status, anomaliesOnly, minAnomaly, maxAnomaly } = req.query;
    const filter = {};
    if (req.user.role === 'universityAdmin') filter.universityId = req.user.universityId;

    // status filtering (allow comma-separated)
    if (status) {
      const statuses = status.split(',').map(s => s.trim().toLowerCase());
      filter.status = { $in: statuses };
    }

    // anomaliesOnly shortcut: fetch suspicious or fake
    if (anomaliesOnly === 'true') {
      filter.status = { $in: ['suspicious', 'fake'] };
    }

    // anomaly score range
    const anomalyRange = {};
    if (minAnomaly !== undefined) anomalyRange.$gte = Number(minAnomaly);
    if (maxAnomaly !== undefined) anomalyRange.$lte = Number(maxAnomaly);
    if (Object.keys(anomalyRange).length) filter.anomalyScore = anomalyRange;

    const logs = await VerificationLog.find(filter).sort({ verifiedAt: -1 }).limit(500).lean();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

export async function exportAnomaliesCsv(req, res) {
  try {
    const filter = req.user.role === 'universityAdmin'
      ? { universityId: req.user.universityId, status: { $in: ['suspicious', 'fake'] } }
      : { status: { $in: ['suspicious', 'fake'] } };
    const logs = await VerificationLog.find(filter).sort({ verifiedAt: -1 }).limit(5000).lean();
    const fields = [
      'certNo',
      'status',
      'score',
      'anomalyScore',
      'anomalyReasons',
      'reasons',
      'verifiedAt',
      'universityId'
    ];
    const parser = new CsvParser({ fields, transforms: [item => ({
      ...item,
      anomalyReasons: (item.anomalyReasons || []).join('; '),
      reasons: (item.reasons || []).join('; ')
    })] });
    const csv = parser.parse(logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="anomalies.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
