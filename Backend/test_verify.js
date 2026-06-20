import fs from 'fs';

async function run() {
  const imgBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  const fd = new FormData();
  const fileBlob = new Blob([imgBuffer], { type: 'image/png' });
  fd.append('certificate', fileBlob, 'test.png');

  try {
    const res = await fetch('http://localhost:5000/api/verify', {
      method: 'POST',
      body: fd
    });
    const txt = await res.text();
    console.log("Response:", txt);
  } catch(e) {
    console.error("Error:", e);
  }
}

run();
