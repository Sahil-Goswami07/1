import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { verifySeal } from '../utils/sealVerifier.js';

async function runTest() {
  console.log("Starting seal verifier unit tests...");
  
  // 1. Create a dummy test seal and dummy test certificate
  const uploadsDir = path.join(process.cwd(), 'Backend', 'public', 'uploads', 'seals');
  fs.mkdirSync(uploadsDir, { recursive: true });
  
  const officialSealPath = path.join(uploadsDir, 'test_official_seal.png');
  const matchingCertPath = path.join(process.cwd(), 'Backend', 'tmp', 'test_matching_cert.png');
  const mismatchCertPath = path.join(process.cwd(), 'Backend', 'tmp', 'test_mismatch_cert.png');
  fs.mkdirSync(path.dirname(matchingCertPath), { recursive: true });

  // Create a 100x100 red square (official seal)
  await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).png().toFile(officialSealPath);

  // Create a 500x500 certificate image where the seal area (bottom-right 80%, 80%, 20%, 20%) is also a red square (matching)
  await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).composite([{
    input: officialSealPath,
    left: 400,
    top: 400
  }]).png().toFile(matchingCertPath);

  // Create a 500x500 certificate where the seal area is a black square (mismatching)
  const mismatchSeal = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  }).png().toBuffer();

  await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).composite([{
    input: mismatchSeal,
    left: 400,
    top: 400
  }]).png().toFile(mismatchCertPath);

  const mockUniversity = {
    sealImage: '/uploads/seals/test_official_seal.png',
    sealPosition: { x: 80, y: 80, width: 20, height: 20 }
  };

  // Run matching test
  console.log("Running match test...");
  const matchResult = await verifySeal({
    university: mockUniversity,
    file: { path: matchingCertPath, mimetype: 'image/png' },
    logId: 'test_match_log'
  });
  console.log("Match Result Similarity:", matchResult.similarity);
  if (matchResult.similarity > 90) {
    console.log("✅ Match test passed!");
  } else {
    console.error("❌ Match test failed!");
    process.exit(1);
  }

  // Run mismatch test
  console.log("Running mismatch test...");
  const mismatchResult = await verifySeal({
    university: mockUniversity,
    file: { path: mismatchCertPath, mimetype: 'image/png' },
    logId: 'test_mismatch_log'
  });
  console.log("Mismatch Result Similarity:", mismatchResult.similarity);
  if (mismatchResult.similarity < 60) {
    console.log("✅ Mismatch test passed!");
  } else {
    console.error("❌ Mismatch test failed!");
    process.exit(1);
  }

  // Cleanup test files
  try {
    fs.unlinkSync(officialSealPath);
    fs.unlinkSync(matchingCertPath);
    fs.unlinkSync(mismatchCertPath);
    fs.unlinkSync(path.join(process.cwd(), 'Backend', 'public', 'uploads', 'verified-seals', 'test_match_log.png'));
    fs.unlinkSync(path.join(process.cwd(), 'Backend', 'public', 'uploads', 'verified-seals', 'test_mismatch_log.png'));
  } catch(e) {}

  console.log("All unit tests passed successfully!");
}

runTest();
