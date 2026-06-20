import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import universityRoutes from './routes/universities.js';
import dataRoutes from './routes/data.js';
import studentRoutes from './routes/students.js';
import certificateRoutes from './routes/certificates.js';
import logRoutes from './routes/logs.js';
import legacyVerify from './routes/verify.js';
// authMiddleware imported inside route files as needed
import bcrypt from 'bcrypt';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// DB
connectDB(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth');

// Ensure a super admin exists (helpful for fresh environments)
(async () => {
	try {
		const email = process.env.ADMIN_EMAIL;
		const password = process.env.ADMIN_PASSWORD;
		if (!email || !password) return; // skip if not configured
		let user = await User.findOne({ email }).lean();
		if (!user) {
			const hash = await bcrypt.hash(password, 10);
			await User.create({ email, passwordHash: hash, role: 'superAdmin' });
			console.log(`[bootstrap] Super admin created for ${email}`);
		} else if (!user.passwordHash && user.password && String(user.password).startsWith('$2')) {
			// migrate legacy 'password' hash to 'passwordHash'
			await User.updateOne({ _id: user._id }, { $set: { passwordHash: user.password }, $unset: { password: 1 } });
			console.log('[bootstrap] Migrated legacy password hash to passwordHash');
		}
	} catch (e) {
		console.warn('[bootstrap] Super admin setup skipped:', e.message);
	}
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/university/data', dataRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/verify-legacy', legacyVerify); // keeps OCR + metadata + anomaly pipeline

// Placeholder simple verify using DB only (certNo + rollNo)
// Implemented earlier as controller in verifyController, mount here too
import verifyAPIRouter from './routes/verifyDB.js';
app.use('/api/verify', verifyAPIRouter);

// Metrics endpoint (protected) – quick aggregation for dashboard
import { getMetrics } from './controllers/metricsController.js';
import { authenticate, authorize } from './middlewares/authMiddleware.js';
app.get('/api/metrics', authenticate, authorize('universityAdmin','superAdmin'), getMetrics);

// Template download endpoints (simple, no auth yet – optionally protect later)
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, 'templates');
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'Backend', 'public', 'uploads')));
app.get('/api/templates/import/csv', (req, res) => {
	const p = path.join(templatesDir, 'bulk_import_template.csv');
	if (!fs.existsSync(p)) {
		if (process.env.DEBUG_EXCEL === '1') console.log('[template] CSV missing at', p);
		return res.status(404).json({ message: 'Template not found' });
	}
	res.download(p, 'bulk_import_template.csv');
});
app.get('/api/templates/import/xlsx', (req, res) => {
	try {
		const headers = ['rollNo','enrollmentNo','name','fatherName','course','graduationYear','certNo','marks','issueDate'];
		const sample = [
			{
				rollNo: '23EJCEC301', enrollmentNo: '23E1JCECF40P301', name: 'KANIKA MAHESHWARI', fatherName: 'VIMAL MALPANI', course: 'B.TECH CSE', graduationYear: 2027, certNo: 'RTU-2025-III-23EJCEC301', marks: 84.2, issueDate: '2025-06-15'
			},
			{
				rollNo: '23EJCCS189', enrollmentNo: '23E1JCCSM45P189', name: 'SAHIL GIRI', fatherName: 'JITENDRA GIRI', course: 'B.TECH CSE', graduationYear: 2028, certNo: 'RTU-2024-II-23EJCCS189', marks: 78.5, issueDate: '2024-12-20'
			}
		];
		const ws = xlsx.utils.json_to_sheet(sample, { header: headers });
		// Ensure header order explicitly
		ws['!cols'] = headers.map(()=>({ wch: 18 }));
		const wb = xlsx.utils.book_new();
		xlsx.utils.book_append_sheet(wb, ws, 'Import');
		const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
		res.setHeader('Content-Disposition', 'attachment; filename="bulk_import_template.xlsx"');
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return res.send(buf);
	} catch (e) {
		return res.status(500).json({ message: 'Failed to build template', error: e.message });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API running on :'+PORT));
