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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// DB
connectDB(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth');

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API running on :'+PORT));
