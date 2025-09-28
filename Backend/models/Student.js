import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  // Newly added optional identity fields to enhance verification & matching
  enrollmentNo: { type: String },
  fatherName: { type: String },
  course: String,
  graduationYear: Number,
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }
}, { timestamps: true });

studentSchema.index({ rollNo: 1, universityId: 1 }, { unique: true });
// Allow unique enrollmentNo within a university while letting null/undefined values coexist
studentSchema.index({ enrollmentNo: 1, universityId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Student', studentSchema);
