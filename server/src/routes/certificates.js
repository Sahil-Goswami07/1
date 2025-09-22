import { Router } from 'express';
import Certificate from '../models/Certificate.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/', auth(['Admin']), async (req, res) => {
  const created = await Certificate.create(req.body);
  res.status(201).json(created);
});

router.get('/', auth(['Admin']), async (req, res) => {
  const items = await Certificate.find().populate('studentId', 'name rollNo institution').lean();
  res.json(items);
});

router.get('/:id', auth(['Admin']), async (req, res) => {
  const item = await Certificate.findById(req.params.id).populate('studentId').lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', auth(['Admin']), async (req, res) => {
  const updated = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json(updated);
});

router.delete('/:id', auth(['Admin']), async (req, res) => {
  await Certificate.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
