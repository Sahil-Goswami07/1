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
  <div className="flex flex-col items-center my-6">
    {/* Upload + Button Row */}
    <div className="flex justify-center items-center space-x-4">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="border rounded px-3 py-2"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Uploading...' : 'Verify Certificate'}
      </button>
    </div>

    {/* OCR Result */}
    {result && (
      <div className="mt-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-2">OCR Result:</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

}
