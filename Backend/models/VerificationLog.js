import mongoose from 'mongoose';

const verificationLogSchema = new mongoose.Schema({
  certNo: String,
  status: String,
  score: Number,
  reasons: [String],
  fieldsMatched: [String],
  fieldsMismatched: [String],
  scoreBreakdown: {},
  ocrName: String,
  // Raw similarity metrics for analytics (optional)
  nameSimilarity: Number, // 0-1 raw
  nameTokens: { o: [String], s: [String] },
  // Anomaly detection layer
  anomalyScore: Number, // 0-1 numeric score from model (higher => more anomalous)
  anomalyReasons: [String], // rule or model derived reasons
  sealSimilarity: Number, // 0-100 similarity score for official seal check
  extractedSealPath: String, // Path to the cropped seal from the verified document
  logoSimilarity: Number, // 0-100 similarity score for official logo check
  layoutSimilarity: Number, // 0-100 similarity score for official layout template check
  tamperingScore: Number, // 0-100 tampering likelihood score (from ELA/noise analyses)
  metadataRisk: Number, // 0-100 metadata manipulation risk score
  qrScore: Number, // 0-100 QR content matching score
  imageAnomalyScore: Number, // 0-1 overall anomaly score calculated from neural model
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  verifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('VerificationLog', verificationLogSchema);
