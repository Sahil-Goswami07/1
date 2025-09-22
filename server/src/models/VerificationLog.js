import mongoose from 'mongoose';

const VerificationLogSchema = new mongoose.Schema(
  {
    certNo: { type: String, index: true },
    status: { type: String, enum: ['VERIFIED', 'SUSPICIOUS', 'LIKELY_FAKE'], required: true },
    score: { type: Number, required: true },
    reasons: [{ type: String }],
    verifiedAt: { type: Date, default: Date.now },
    reportPath: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('VerificationLog', VerificationLogSchema);
