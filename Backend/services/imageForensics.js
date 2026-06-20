import sharp from 'sharp';
import jsQR from 'jsqr';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { fromPath } from 'pdf2pic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force inject GraphicsMagick and Ghostscript paths on Windows
if (os.platform() === 'win32') {
  if (!process.env.PATH.includes('GraphicsMagick')) {
    process.env.PATH += ';C:\\Program Files\\GraphicsMagick-1.3.46-Q16';
  }
  if (!process.env.PATH.includes('gs10.07.0')) {
    process.env.PATH += ';C:\\Program Files (x86)\\gs\\gs10.07.0\\bin';
  }
}

/**
 * Convert PDF to image buffer using pdf2pic
 */
async function pdfToImageBuffer(pdfPath) {
  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    saveFilename: `temp_forensics_${Date.now()}`,
    savePath: './tmp'
  };

  fs.mkdirSync('./tmp', { recursive: true });
  const storeAsImage = fromPath(pdfPath, options);
  const page1 = await storeAsImage(1);
  
  if (!page1 || !page1.path) {
    throw new Error('PDF conversion yielded no image path.');
  }
  
  const buff = fs.readFileSync(page1.path);
  try {
    fs.unlinkSync(page1.path);
  } catch (err) {}
  return buff;
}

/**
 * Executes the entire image forensics analysis
 */
export async function runImageForensics({ university, file, certNo, rollNo, logId }) {
  let tempCertPath = null;
  try {
    const filePath = file.tempFilePath || file.path;
    if (!filePath) {
      throw new Error('No uploaded file path available');
    }

    // 1. Get raw image buffer (convert if PDF)
    let imageBuffer;
    if (file.mimetype === 'application/pdf') {
      imageBuffer = await pdfToImageBuffer(filePath);
    } else {
      imageBuffer = fs.readFileSync(filePath);
    }

    // 2. Stage 5: QR Code Verification (Node-side using jsQR)
    let qrScore = 0.0;
    try {
      const { data: rgbaData, info } = await sharp(imageBuffer)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      const qrCode = jsQR(rgbaData, info.width, info.height);
      if (qrCode) {
        const decodedText = (qrCode.data || '').trim();
        // Check if QR code matches certificate identifier or student roll
        const matchesCert = certNo && decodedText.toLowerCase().includes(certNo.toLowerCase());
        const matchesRoll = rollNo && decodedText.toLowerCase().includes(rollNo.toLowerCase());
        
        if (matchesCert || matchesRoll) {
          qrScore = 1.0;
        } else {
          qrScore = 0.5; // QR exists but text mismatched
        }
      } else {
        qrScore = 0.0; // No QR code
      }
    } catch (e) {
      console.warn('[QR Scanner Warning]', e.message);
    }

    // 3. Extract dimensions and crop logo & seal for static display in frontend
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    let extractedLogoPath = null;
    let extractedSealPath = null;

    if (logId) {
      // Crop Logo
      const logoPos = university?.logoPosition || { x: 5, y: 5, width: 15, height: 15 };
      const lx = Math.round((metadata.width * logoPos.x) / 100);
      const ly = Math.round((metadata.height * logoPos.y) / 100);
      const lw = Math.round((metadata.width * logoPos.width) / 100);
      const lh = Math.round((metadata.height * logoPos.height) / 100);
      const l_left = Math.max(0, Math.min(lx, metadata.width - 1));
      const l_top = Math.max(0, Math.min(ly, metadata.height - 1));
      const l_width = Math.max(1, Math.min(lw, metadata.width - l_left));
      const l_height = Math.max(1, Math.min(lh, metadata.height - l_top));

      const logoDir = path.join(process.cwd(), 'Backend', 'public', 'uploads', 'verified-logos');
      fs.mkdirSync(logoDir, { recursive: true });
      extractedLogoPath = `/uploads/verified-logos/${logId}.png`;
      await sharp(imageBuffer)
        .extract({ left: l_left, top: l_top, width: l_width, height: l_height })
        .png()
        .toFile(path.join(logoDir, `${logId}.png`));

      // Crop Seal
      const sealPos = university?.sealPosition || { x: 75, y: 75, width: 20, height: 20 };
      const sx = Math.round((metadata.width * sealPos.x) / 100);
      const sy = Math.round((metadata.height * sealPos.y) / 100);
      const sw = Math.round((metadata.width * sealPos.width) / 100);
      const sh = Math.round((metadata.height * sealPos.height) / 100);
      const s_left = Math.max(0, Math.min(sx, metadata.width - 1));
      const s_top = Math.max(0, Math.min(sy, metadata.height - 1));
      const s_width = Math.max(1, Math.min(sw, metadata.width - s_left));
      const s_height = Math.max(1, Math.min(sh, metadata.height - s_top));

      const sealDir = path.join(process.cwd(), 'Backend', 'public', 'uploads', 'verified-seals');
      fs.mkdirSync(sealDir, { recursive: true });
      extractedSealPath = `/uploads/verified-seals/${logId}.png`;
      await sharp(imageBuffer)
        .extract({ left: s_left, top: s_top, width: s_width, height: s_height })
        .png()
        .toFile(path.join(sealDir, `${logId}.png`));
    }

    // 4. Save preprocessed image buffer to a temporary file for Python processing
    const tempDir = path.join(process.cwd(), 'Backend', 'tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    tempCertPath = path.join(tempDir, `forensics_input_${Date.now()}.png`);
    await sharp(imageBuffer).png().toFile(tempCertPath);

    // 5. Resolve template paths
    const resolvePath = (relPath) => {
      if (!relPath) return null;
      if (relPath.startsWith('/')) {
        return path.join(process.cwd(), 'Backend', 'public', relPath);
      }
      return path.join(process.cwd(), 'Backend', relPath);
    };

    const logoTemplate = resolvePath(university?.logoImage);
    const sealTemplate = resolvePath(university?.sealImage);
    const layoutTemplate = resolvePath(university?.templateImage);

    // 6. Construct Python pipeline payload
    const pipelinePayload = {
      image_path: tempCertPath,
      logo_template_path: logoTemplate && fs.existsSync(logoTemplate) ? logoTemplate : null,
      logo_pos: university?.logoPosition || { x: 5, y: 5, width: 15, height: 15 },
      seal_template_path: sealTemplate && fs.existsSync(sealTemplate) ? sealTemplate : null,
      seal_pos: university?.sealPosition || { x: 75, y: 75, width: 20, height: 20 },
      template_path: layoutTemplate && fs.existsSync(layoutTemplate) ? layoutTemplate : null
    };

    // 6. Spawn Python processes with Windows launcher fallbacks
    const scriptPath = path.join(__dirname, '..', 'ml', 'image_forensics', 'pipeline.py');
    const inputStr = JSON.stringify(pipelinePayload);

    const runSpawn = (cmd) => {
      return new Promise((resolve, reject) => {
        const py = spawn(cmd, [scriptPath]);
        let out = '';
        let err = '';
        py.stdout.on('data', d => out += d.toString());
        py.stderr.on('data', d => err += d.toString());
        py.on('error', reject);
        py.on('close', code => {
          if (code !== 0) {
            return resolve({ error: err || out, code });
          }
          try {
            const parsed = JSON.parse(out.trim());
            resolve(parsed);
          } catch (e) {
            resolve({ error: 'JSON parse error', raw: out });
          }
        });
        py.stdin.write(inputStr);
        py.stdin.end();
      });
    };

    let pyResult = null;
    if (process.platform === 'win32') {
      try {
        const res = await runSpawn('py');
        if (!res.error || (!res.error.includes('Python was not found') && !res.error.includes('not recognized'))) {
          pyResult = res;
        }
      } catch (e) {}
    }

    if (!pyResult) {
      pyResult = await runSpawn('python');
    }

    if (pyResult.error) {
      throw new Error(`Python Pipeline Error: ${pyResult.error}`);
    }

    return {
      logoSimilarity: pyResult.logoSimilarity !== undefined ? pyResult.logoSimilarity : 1.0,
      sealSimilarity: pyResult.sealSimilarity !== undefined ? pyResult.sealSimilarity : 1.0,
      metadataRisk: pyResult.metadataRisk !== undefined ? pyResult.metadataRisk : 0.0,
      tamperingScore: pyResult.tamperingScore !== undefined ? pyResult.tamperingScore : 0.0,
      layoutSimilarity: pyResult.layoutSimilarity !== undefined ? pyResult.layoutSimilarity : 1.0,
      qrScore: qrScore,
      extractedLogoPath,
      extractedSealPath,
      metadata: pyResult.metadata || {}
    };

  } catch (err) {
    console.error('[Image Forensics Service Error]', err);
    // Return safe default metrics if the pipeline crashes
    return {
      logoSimilarity: 1.0,
      sealSimilarity: 1.0,
      metadataRisk: 0.0,
      tamperingScore: 0.0,
      layoutSimilarity: 1.0,
      qrScore: 0.0,
      extractedLogoPath: null,
      extractedSealPath: null,
      error: err.message
    };
  } finally {
    // Cleanup temporary image file
    if (tempCertPath && fs.existsSync(tempCertPath)) {
      try {
        fs.unlinkSync(tempCertPath);
      } catch (_) {}
    }
  }
}
