import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    course: { type: String, required: true },
    institution: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    role: { type: String, enum: ['Student', 'Employer', 'Admin'], default: 'Student' },
    email: { type: String },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Student', StudentSchema);
