import University from '../models/University.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import VerificationLog from '../models/VerificationLog.js';
import fs from 'fs';
import path from 'path';

export async function listUniversities(req, res) {
  const list = await University.find();
  res.json(list);
}

export async function approveUniversity(req, res) {
  const uni = await University.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
  if (!uni) return res.status(404).json({ error: 'Not found' });
  res.json(uni);
}

export async function deleteUniversity(req, res) {
  await University.findByIdAndDelete(req.params.id);
  await User.deleteMany({ universityId: req.params.id });
  await Student.deleteMany({ universityId: req.params.id });
  await Certificate.deleteMany({ universityId: req.params.id });
  res.json({ ok: true });
}

export async function analytics(req, res) {
  const [universities, students, certs, logs] = await Promise.all([
    University.countDocuments({ status: 'approved' }),
    Student.countDocuments(),
    Certificate.countDocuments(),
    VerificationLog.countDocuments(),
  ]);
  res.json({ universities, students, certificates: certs, verifications: logs });
}

// Helpers for profile path resolution and saving files
const getBackendDir = () => {
  const cwd = process.cwd();
  if (path.basename(cwd) === 'Backend') {
    return cwd;
  }
  return path.join(cwd, 'Backend');
};

const saveFileToUploads = async (file, subfolder, filename) => {
  const ext = path.extname(file.name) || '.png';
  const relativePath = `/uploads/${subfolder}/${filename}${ext}`;
  
  const backendDir = getBackendDir();
  
  const path1 = path.join(backendDir, 'public', 'uploads', subfolder, `${filename}${ext}`);
  const path2 = path.join(backendDir, 'Backend', 'public', 'uploads', subfolder, `${filename}${ext}`);

  fs.mkdirSync(path.dirname(path1), { recursive: true });
  fs.mkdirSync(path.dirname(path2), { recursive: true });

  const tempPath = file.tempFilePath || file.path;
  if (tempPath) {
    fs.copyFileSync(tempPath, path1);
    fs.copyFileSync(tempPath, path2);
    try { fs.unlinkSync(tempPath); } catch (e) {}
  } else {
    await file.mv(path1);
    try {
      fs.copyFileSync(path1, path2);
    } catch (e) {
      console.error('Failed to copy to secondary path:', e);
    }
  }

  return relativePath;
};

export async function getUniversityProfile(req, res) {
  try {
    if (!req.user.universityId) {
      return res.status(400).json({ error: 'User is not linked to any university' });
    }
    const uni = await University.findById(req.user.universityId);
    if (!uni) {
      return res.status(404).json({ error: 'University not found' });
    }
    res.json(uni);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUniversityProfile(req, res) {
  try {
    if (!req.user.universityId) {
      return res.status(400).json({ error: 'User is not linked to any university' });
    }
    const uni = await University.findById(req.user.universityId);
    if (!uni) {
      return res.status(404).json({ error: 'University not found' });
    }

    const { name, address, contactEmail, logoPosition, sealPosition } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;

    const parsePos = (pos) => {
      if (!pos) return undefined;
      let obj = pos;
      if (typeof pos === 'string') {
        try { obj = JSON.parse(pos); } catch (e) { return undefined; }
      }
      return {
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.width ?? 10),
        height: Number(obj.height ?? 10)
      };
    };

    const parsedLogoPos = parsePos(logoPosition);
    if (parsedLogoPos) updateData.logoPosition = parsedLogoPos;

    const parsedSealPos = parsePos(sealPosition);
    if (parsedSealPos) updateData.sealPosition = parsedSealPos;

    if (req.files) {
      if (req.files.logoImage) {
        updateData.logoImage = await saveFileToUploads(req.files.logoImage, 'logos', uni._id.toString());
      }
      if (req.files.sealImage) {
        updateData.sealImage = await saveFileToUploads(req.files.sealImage, 'seals', uni._id.toString());
      }
      if (req.files.templateImage) {
        updateData.templateImage = await saveFileToUploads(req.files.templateImage, 'templates', uni._id.toString());
      }
    }

    const updated = await University.findByIdAndUpdate(req.user.universityId, { $set: updateData }, { new: true });
    res.json(updated);
  } catch (e) {
    console.error('[Update University Profile Error]', e);
    res.status(500).json({ error: e.message });
  }
}
