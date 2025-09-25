import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduauth');
  const users = await User.find({ $or: [ { passwordHash: { $exists: false } }, { passwordHash: null } ] });
  let migrated = 0;
  for (const u of users) {
    const stored = u.password;
    if (!stored) continue;
    if (String(stored).startsWith('$2')) {
      // looks like bcrypt hash
      u.passwordHash = stored;
      u.password = undefined;
      await u.save();
      migrated++;
    } else {
      // plaintext: cannot know true password; skip migration unless ADMIN user
      console.log(`Skipping plaintext for ${u.email}. Ask user to reset password.`);
    }
  }
  console.log(`Migrated ${migrated} users to passwordHash.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
