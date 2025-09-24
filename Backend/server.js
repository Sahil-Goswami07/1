// server.js
import express from 'express';
import fileUpload from 'express-fileupload';
import { runOCR } from './services/ocr.js';
import cors from 'cors';

const app = express();

// Enable CORS so frontend can call API
app.use(cors());

// Enable file uploads
app.use(
  fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);

// API route to verify certificate
app.post('/api/verify', async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.files || !req.files.certificate) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.certificate;

    // Optional: Log uploaded file info
    console.log('Uploaded file:', file.name, file.mimetype, file.tempFilePath);

    // Run OCR
    const result = await runOCR(file);

    res.json(result);
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
