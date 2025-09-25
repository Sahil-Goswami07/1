// src/components/CertificateUpload.jsx
import { useState } from 'react';

export default function CertificateUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append('certificate', file);

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('http://localhost:5000/api/verify', {
        method: 'POST',
        body: formData, // ✅ Do NOT set Content-Type manually
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Verify Certificate'}
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>OCR Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
