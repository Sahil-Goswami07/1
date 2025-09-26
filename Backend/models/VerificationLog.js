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
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  verifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('VerificationLog', verificationLogSchema);
