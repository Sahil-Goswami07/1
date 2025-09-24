const BASE = 'http://localhost:5000';

async function handleResponse(res) {
  if (!res.ok) {
    let msg = res.status + ' ' + res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
}

export async function postVerify(file, token) {
  if (!file) throw new Error('No file provided');
  const formData = new FormData();
  formData.append('certificate', file);
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(`${BASE}/api/verify`, { method: 'POST', body: formData, headers });
  return handleResponse(res);
}

export async function fetchCertificates(token) {
  const res = await fetch(`${BASE}/api/certificates`, { headers: { Authorization: 'Bearer ' + token } });
  return handleResponse(res);
}

export async function fetchStudents(token) {
  const res = await fetch(`${BASE}/api/students`, { headers: { Authorization: 'Bearer ' + token } });
  return handleResponse(res);
}

export async function fetchLogs(token) {
  const res = await fetch(`${BASE}/api/logs`, { headers: { Authorization: 'Bearer ' + token } });
  return handleResponse(res);
}

export async function fetchStats(token) {
  const res = await fetch(`${BASE}/api/logs/stats`, { headers: { Authorization: 'Bearer ' + token } });
  return handleResponse(res);
}

export async function fetchRecentLogs(token) {
  const res = await fetch(`${BASE}/api/logs/recent`, { headers: { Authorization: 'Bearer ' + token } });
  return handleResponse(res);
}

export async function apiVerify({ file, certNo, rollNo, marks, graduationYear }, token) {
  const form = new FormData();
  if (file) form.append('certificate', file);
  if (certNo) form.append('certNo', certNo);
  if (rollNo) form.append('rollNo', rollNo);
  if (marks) form.append('marks', marks);
  if (graduationYear) form.append('graduationYear', graduationYear);
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const res = await fetch(`${BASE}/api/verify`, { method: 'POST', body: form, headers });
  return handleResponse(res);
}

