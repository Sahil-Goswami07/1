import Student from '../models/Student.js';

export async function listStudents(req, res) {
  const query = { universityId: req.user.universityId };
  const students = await Student.find(query).limit(500).lean();
  res.json(students);
}

export async function updateStudent(req, res) {
  const { id } = req.params;
  const student = await Student.findOneAndUpdate({ _id: id, universityId: req.user.universityId }, req.body, { new: true });
  if (!student) return res.status(404).json({ error: 'Not found' });
  res.json(student);
}

export async function deleteStudent(req, res) {
  const { id } = req.params;
  const deleted = await Student.findOneAndDelete({ _id: id, universityId: req.user.universityId });
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}
