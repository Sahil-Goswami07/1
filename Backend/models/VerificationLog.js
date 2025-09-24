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
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  verifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('VerificationLog', verificationLogSchema);
