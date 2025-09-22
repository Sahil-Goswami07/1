import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import studentsRoute from './routes/students.js';
import certificatesRoute from './routes/certificates.js';
import reportsRoute from './routes/reports.js';
import verifyRoute from './routes/verify/index.js';
import 'express-async-errors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '../reports');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*'}));

app.use('/api/students', studentsRoute);
app.use('/api/certificates', certificatesRoute);
app.use('/api/reports', reportsRoute);
app.use('/api/verify', verifyRoute);

app.use('/reports', express.static(REPORTS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const port = process.env.PORT || 5000;
connectDB(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduauth').then(() => {
  app.listen(port, () => console.log(`Server listening on :${port}`));
});
