import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import University from '../models/University.js';

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  let uniInfo = null;
  if (user.role === 'universityAdmin' && user.universityId) {
    const uni = await University.findById(user.universityId).lean();
    if (!uni) return res.status(403).json({ error: 'University record missing' });
    if (uni.status !== 'approved') return res.status(403).json({ error: 'University not approved yet' });
    uniInfo = { universityId: uni._id, universityName: uni.name, universityCode: uni.code };
  }
  const token = jwt.sign({ id: user._id, role: user.role, universityId: user.universityId || null }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
  res.json({ token, role: user.role, email: user.email, ...uniInfo });
}

export async function registerUniversityAdmin(req, res) {
  const { email, password, universityCode, universityName } = req.body;
  if (!email || !password || !universityCode) return res.status(400).json({ error: 'Missing fields' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User exists' });
  let uni = await University.findOne({ code: universityCode });
  if (!uni) {
    uni = await University.create({ name: universityName || universityCode, code: universityCode, status: 'pending' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash: hash, role: 'universityAdmin', universityId: uni._id });
  res.status(201).json({ id: user._id, universityId: uni._id, status: uni.status });
}

// Public self-service university application (no auth). Creates pending university + admin user.
export async function publicUniversityApply(req, res) {
  const { email, password, universityCode, universityName, address, contactEmail } = req.body;
  if (!email || !password || !universityCode) return res.status(400).json({ error: 'Missing required fields' });
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ error: 'Email already registered' });
  let uni = await University.findOne({ code: universityCode });
  if (!uni) {
    uni = await University.create({ name: universityName || universityCode, code: universityCode, address, contactEmail: contactEmail || email, status: 'pending' });
  } else if (uni.status === 'rejected') {
    return res.status(400).json({ error: 'University previously rejected; contact support' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash: hash, role: 'universityAdmin', universityId: uni._id });
  res.status(201).json({ message: 'Application submitted. Await approval.', universityId: uni._id });
}
