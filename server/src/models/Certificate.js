import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema(
  {
    certNo: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    issueDate: { type: Date, required: true },
    marksPercent: { type: Number, required: true },
    certificateHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', CertificateSchema);
