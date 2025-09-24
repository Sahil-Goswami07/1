import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  certNo: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  issueDate: Date,
  marksPercent: Number,
  certificateHash: String,
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual alias 'marks' so frontend can use a simpler name if desired
certificateSchema.virtual('marks').get(function() {
  return this.marksPercent;
});

certificateSchema.index({ certNo: 1, universityId: 1 }, { unique: true });

export default mongoose.model('Certificate', certificateSchema);
