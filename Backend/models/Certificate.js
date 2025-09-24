import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  certNo: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  issueDate: Date,
  marksPercent: Number,
  certificateHash: String,
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }
}, { timestamps: true });

certificateSchema.index({ certNo: 1, universityId: 1 }, { unique: true });

export default mongoose.model('Certificate', certificateSchema);
