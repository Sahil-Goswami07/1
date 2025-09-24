// src/services/api.js

/**
 * Uploads a certificate file to backend for verification
 * @param {File} file - The certificate file (PDF or image)
 * @returns {Promise<Object>} - JSON result from backend
 */
export async function postVerify(file) {
  if (!file) throw new Error('No file provided');

  const formData = new FormData();
  formData.append('certificate', file);

  try {
    const response = await fetch('http://localhost:5000/api/verify', {
      method: 'POST',
      body: formData, // Don't set Content-Type; fetch handles it
    });

    if (!response.ok) {
      // Try to parse error message from backend
      let errorMsg = 'Verification failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        // Response is not JSON, keep default message
      }
      throw new Error(errorMsg);
    }

    // Parse and return backend JSON
    const result = await response.json();
    return result;

  } catch (err) {
    // Network or unexpected errors
    throw new Error(err.message || 'Network error');
  }
}
