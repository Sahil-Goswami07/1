import VerificationLog from '../models/VerificationLog.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

// Lightweight aggregation for dashboard / hackathon demo.
// If performance becomes an issue, replace with cached rollups.
export async function getMetrics(req, res) {
  try {
    const uniFilter = req.user && req.user.role === 'universityAdmin' ? { universityId: req.user.universityId } : {};

    // Basic counts in parallel
    const [studentCount, certificateCount, totalVerifications] = await Promise.all([
      Student.countDocuments(uniFilter),
      Certificate.countDocuments(uniFilter),
      VerificationLog.countDocuments(uniFilter)
    ]);

    // Group by status & compute aggregated metrics (score, anomaly)
    const pipeline = [
      { $match: uniFilter },
      { $project: { status: 1, score: 1, anomalyScore: 1, createdAt: 1, verifiedAt: 1 } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScoreStatus: { $avg: '$score' },
        avgAnomalyStatus: { $avg: '$anomalyScore' }
      }}
    ];
    const grouped = await VerificationLog.aggregate(pipeline);
    const statusMap = grouped.reduce((acc, g) => { acc[g._id || 'unknown'] = g; return acc; }, {});

    const verifiedCount = statusMap['verified']?.count || 0;
    const suspiciousCount = statusMap['suspicious']?.count || 0;
    const fakeCount = statusMap['fake']?.count || 0;

    // Overall averages (avoid second pass by separate pipeline for simplicity)
    const avgAgg = await VerificationLog.aggregate([
      { $match: uniFilter },
      { $group: { _id: null, avgScore: { $avg: '$score' }, avgAnomaly: { $avg: '$anomalyScore' } } }
    ]);
    const avgScore = avgAgg[0]?.avgScore || 0;
    const avgAnomaly = avgAgg[0]?.avgAnomaly || 0;

    // Placeholder latency (no timing instrumentation stored yet)
    const avgLatencyMs = null; // Could be instrumented later

    const anomalyRate = totalVerifications ? ((suspiciousCount + fakeCount) / totalVerifications) * 100 : 0;
    const verifiedRate = totalVerifications ? (verifiedCount / totalVerifications) * 100 : 0;

    return res.json({
      students: studentCount,
      certificates: certificateCount,
      totalVerifications,
      statuses: {
        verified: verifiedCount,
        suspicious: suspiciousCount,
        fake: fakeCount
      },
      avgScore: Number(avgScore.toFixed(2)),
      avgAnomaly: Number(avgAnomaly.toFixed(3)),
      verifiedRate: Number(verifiedRate.toFixed(2)),
      anomalyRate: Number(anomalyRate.toFixed(2)),
      avgLatencyMs, // placeholder
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
