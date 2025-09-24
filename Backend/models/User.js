import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superAdmin', 'universityAdmin'], required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
