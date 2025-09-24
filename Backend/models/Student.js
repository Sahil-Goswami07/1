import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  course: String,
  graduationYear: Number,
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }
}, { timestamps: true });

studentSchema.index({ rollNo: 1, universityId: 1 }, { unique: true });

export default mongoose.model('Student', studentSchema);
