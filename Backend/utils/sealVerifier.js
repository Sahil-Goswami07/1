import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fromPath } from 'pdf2pic';

// Force inject GraphicsMagick and Ghostscript into PATH on Windows to support PDF rasterization
if (os.platform() === 'win32') {
  if (!process.env.PATH.includes('GraphicsMagick')) {
    process.env.PATH += ';C:\\Program Files\\GraphicsMagick-1.3.46-Q16';
  }
  if (!process.env.PATH.includes('gs10.07.0')) {
    process.env.PATH += ';C:\\Program Files (x86)\\gs\\gs10.07.0\\bin';
  }
}

/**
 * Convert first page of PDF to image buffer
 */
async function pdfToImageBuffer(pdfPath) {
  if (!pdfPath) throw new Error('PDF path is undefined');

  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    saveFilename: `temp_seal_${Date.now()}`,
    savePath: './tmp'
  };

  // Ensure tmp exists
  fs.mkdirSync('./tmp', { recursive: true });
  const storeAsImage = fromPath(pdfPath, options);
  const page1 = await storeAsImage(1);
  
  if (!page1 || !page1.path) {
    throw new Error('PDF conversion yielded no image path.');
  }
  
  const buff = fs.readFileSync(page1.path);
  try {
    fs.unlinkSync(page1.path);
  } catch (err) {
    // ignore clean up error
  }
  return buff;
}

/**
 * Verifies seal by cropping certificate and comparing against official university seal.
 * Returns { similarity: Number, extractedSealPath: String }
 */
export async function verifySeal({ university, file, logId }) {
  try {
    if (!university || !university.sealImage) {
      return { similarity: null, error: 'University has no official seal configured' };
    }

    const filePath = file.tempFilePath || file.path;
    if (!filePath) {
      return { similarity: null, error: 'Uploaded certificate file path not found' };
    }

    // Resolve official seal path on disk
    let officialSealPath = university.sealImage;
    if (officialSealPath.startsWith('/')) {
      officialSealPath = path.join(process.cwd(), 'Backend', 'public', officialSealPath);
    } else if (!path.isAbsolute(officialSealPath)) {
      officialSealPath = path.join(process.cwd(), 'Backend', officialSealPath);
    }

    if (!fs.existsSync(officialSealPath)) {
      return { similarity: null, error: `Official seal file not found at ${officialSealPath}` };
    }

    // Resolve file buffer (rasterize if PDF)
    let imageBuffer;
    if (file.mimetype === 'application/pdf') {
      imageBuffer = await pdfToImageBuffer(filePath);
    } else {
      imageBuffer = fs.readFileSync(filePath);
    }

    // Extract image dimensions using sharp
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Fetch crop position percentages from university config (default to bottom-right 75%, 75%, 20%, 20%)
    const pos = university.sealPosition || { x: 75, y: 75, width: 20, height: 20 };
    const x = Math.round((metadata.width * pos.x) / 100);
    const y = Math.round((metadata.height * pos.y) / 100);
    const w = Math.round((metadata.width * pos.width) / 100);
    const h = Math.round((metadata.height * pos.height) / 100);

    const left = Math.max(0, Math.min(x, metadata.width - 1));
    const top = Math.max(0, Math.min(y, metadata.height - 1));
    const width = Math.max(1, Math.min(w, metadata.width - left));
    const height = Math.max(1, Math.min(h, metadata.height - top));

    // Ensure output directories exist
    const relativeUploadDir = path.join('public', 'uploads', 'verified-seals');
    const uploadDir = path.join(process.cwd(), 'Backend', relativeUploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });

    const extractedFilename = `${logId}.png`;
    const extractedPath = path.join(uploadDir, extractedFilename);
    const dbExtractedPath = `/uploads/verified-seals/${extractedFilename}`;

    // Crop the seal region and save to public static folder
    await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .png()
      .toFile(extractedPath);

    // Normalize both official seal and extracted seal to 64x64 grayscale raw buffers
    const croppedBuf = await sharp(extractedPath)
      .resize(64, 64, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();

    const officialBuf = await sharp(officialSealPath)
      .resize(64, 64, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();

    // Compute Mean Absolute Error (MAE)
    let diff = 0;
    for (let i = 0; i < croppedBuf.length; i++) {
      diff += Math.abs(croppedBuf[i] - officialBuf[i]);
    }
    const mae = diff / croppedBuf.length;
    
    // Convert MAE to a similarity score (0-100%)
    const similarity = Math.round((1 - mae / 255) * 100);

    return { similarity, extractedSealPath: dbExtractedPath };
  } catch (err) {
    console.error('[Seal Verifier Error]', err);
    return { similarity: null, error: `Seal verification exception: ${err.message}` };
  }
}
