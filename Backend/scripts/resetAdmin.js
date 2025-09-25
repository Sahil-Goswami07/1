import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD required in env');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduauth');
  let user = await User.findOne({ email });
  const hash = await bcrypt.hash(password, 10);
  if (user) {
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: hash, role: 'superAdmin' }, $unset: { password: 1 } });
    console.log('Super admin password reset for', email);
  } else {
    await User.create({ email, passwordHash: hash, role: 'superAdmin' });
    console.log('Super admin created:', email);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
