import { Router } from 'express';
import Student from '../models/Student.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Student.findOne({ email });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

router.post('/', auth(['Admin']), async (req, res) => {
  const data = req.body;
  const created = await Student.create(data);
  res.status(201).json(created);
});

router.get('/', auth(['Admin']), async (req, res) => {
  const items = await Student.find().lean();
  res.json(items);
});

router.get('/:id', auth(['Admin']), async (req, res) => {
  const item = await Student.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', auth(['Admin']), async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(updated);
});

router.delete('/:id', auth(['Admin']), async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
