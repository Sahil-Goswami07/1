import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) throw new Error('MongoDB URI missing');
  await mongoose.connect(uri, { autoIndex: true });
  console.log('MongoDB connected');
}
