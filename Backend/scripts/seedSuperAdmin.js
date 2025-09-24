import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD required in env');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduauth');
  let user = await User.findOne({ email });
  if (user) {
    console.log('Super admin already exists');
  } else {
    const hash = await bcrypt.hash(password, 10);
    user = await User.create({ email, passwordHash: hash, role: 'superAdmin' });
    console.log('Super admin created:', user.email);
  }
  process.exit(0);
}
run();
