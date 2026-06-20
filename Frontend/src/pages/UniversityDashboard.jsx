import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { fetchStats, fetchRecentLogs } from '../lib/api.js';

const BASE = 'http://localhost:5000';

async function uploadExcel(file, token) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/university/data/excel`, { method: 'POST', body: form, headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) {
    let msg = 'Upload failed';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/api/universities/profile`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

async function updateProfile(formData, token) {
  const res = await fetch(`${BASE}/api/universities/profile`, {
    method: 'PUT',
    body: formData,
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) {
    let msg = 'Failed to update profile';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const UniversityDashboard = () => {
  const { token, universityName } = useAuth();
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'settings'

  // Profile fields
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  
  // Coordinate fields
  const [logoPos, setLogoPos] = useState({ x: 5, y: 5, width: 15, height: 15 });
  const [sealPos, setSealPos] = useState({ x: 75, y: 75, width: 20, height: 20 });
  
  // Local file upload hooks
  const [logoFile, setLogoFile] = useState(null);
  const [sealFile, setSealFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  
  // Preview URL hooks
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [sealPreviewUrl, setSealPreviewUrl] = useState(null);

  // Status indicators
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [s, r, p] = await Promise.all([
          fetchStats(token),
          fetchRecentLogs(token),
          getProfile(token).catch(() => null)
        ]);
        if (mounted) {
          setStats(s);
          setRecent(r);
          if (p) {
            setProfile(p);
            setProfileName(p.name || '');
            setProfileAddress(p.address || '');
            setProfileEmail(p.contactEmail || '');
            if (p.logoPosition) setLogoPos(p.logoPosition);
            if (p.sealPosition) setSealPos(p.sealPosition);
          }
        }
      } catch (e) { /* ignore */ }
      finally { if (mounted) setLoadingDash(false); }
    }
    if (token) load();
    return () => { mounted = false; };
  }, [token]);

  // Manage local image blob URLs for preview rendering
  useEffect(() => {
    if (templateFile) {
      const url = URL.createObjectURL(templateFile);
      setTemplatePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setTemplatePreviewUrl(null);
    }
  }, [templateFile]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
    }
  }, [logoFile]);

  useEffect(() => {
    if (sealFile) {
      const url = URL.createObjectURL(sealFile);
      setSealPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSealPreviewUrl(null);
    }
  }, [sealFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setImportResult(null);
    try { const r = await uploadExcel(file, token); setImportResult(r); } catch (e) { setImportResult({ error: e.message }); } finally { setUploading(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('address', profileAddress);
      formData.append('contactEmail', profileEmail);
      formData.append('logoPosition', JSON.stringify(logoPos));
      formData.append('sealPosition', JSON.stringify(sealPos));
      
      if (logoFile) formData.append('logoImage', logoFile);
      if (sealFile) formData.append('sealImage', sealFile);
      if (templateFile) formData.append('templateImage', templateFile);

      const updated = await updateProfile(formData, token);
      setProfile(updated);
      setSaveSuccess(true);
      setLogoFile(null);
      setSealFile(null);
      setTemplateFile(null);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = (type) => {
    const url = type === 'xlsx' ? `${BASE}/api/templates/import/xlsx` : `${BASE}/api/templates/import/csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'xlsx' ? 'bulk_import_template.xlsx' : 'bulk_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Determine current active preview image source
  const displayTemplateUrl = templatePreviewUrl || (profile && profile.templateImage ? `${BASE}${profile.templateImage}` : null);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{profileName || universityName || 'University Dashboard'}</h1>
            <p className="mt-1 text-lg text-slate-600">Verification & Template Customization Panel</p>
          </div>
          <div className="flex bg-slate-200/60 p-1.5 rounded-lg border border-slate-300/40">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview & Imports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Template Settings
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-medium text-slate-500">Total Students</h3>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.students : '...'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-medium text-slate-500">Total Certificates</h3>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.certificates : '...'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-medium text-slate-500">Verification Success %</h3>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.verifiedRate + '%' : '...'}</p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Bulk Import (Excel)</h2>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e=>setFile(e.target.files[0])} className="text-sm" />
                <button disabled={uploading || !file} onClick={handleUpload} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition">
                  {uploading ? 'Uploading...' : 'Upload & Import'}
                </button>
                <button type="button" onClick={()=>downloadTemplate('xlsx')} className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 transition">Download XLSX Template</button>
                <button type="button" onClick={()=>downloadTemplate('csv')} className="px-3 py-2 bg-slate-500 text-white rounded text-sm hover:bg-slate-600 transition">Download CSV Template</button>
                {importResult && <p className="text-xs text-slate-600">{importResult.error ? importResult.error : `Students: ${importResult.insertedStudents}/${importResult.students} (dup ${importResult.duplicateStudents}) | Certs: ${importResult.insertedCerts}/${importResult.certificates} (dup ${importResult.duplicateCerts})`}</p>}
              </div>
              <p className="mt-3 text-xs text-slate-500">Expected columns (XLSX or CSV): rollNo, enrollmentNo (optional), name, fatherName (optional), course, graduationYear, certNo, marks, issueDate. You can upload either format.</p>
              {importResult && importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 border border-amber-300 bg-amber-50 rounded p-3 max-h-48 overflow-auto">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Validation Errors ({importResult.errors.length}):</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-amber-700"><th className="text-left pr-2">Row</th><th className="text-left pr-2">Field</th><th className="text-left">Message</th></tr>
                    </thead>
                    <tbody>
                      {importResult.errors.slice(0,200).map((e,i)=>(
                        <tr key={i} className="odd:bg-amber-100/40">
                          <td className="pr-2">{e.row}</td>
                          <td className="pr-2">{e.field}</td>
                          <td>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importResult.errors.length > 200 && <p className="text-[10px] text-amber-700 mt-1">Showing first 200 errors… refine your file.</p>}
                </div>
              )}
            </div>

            {/* Recent Verifications Table */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Verifications</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate No.</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {recent.map(r => (
                      <tr key={r.certNo + r.verifiedAt}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">-</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.certNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(r.verifiedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                    {!recent.length && !loadingDash && (
                      <tr><td className="px-6 py-4 text-sm text-slate-500" colSpan={4}>No verifications yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Seeded Template Assets</h2>
                  <p className="text-sm text-slate-500">Provide official logos, stamps/seals, and alignment background layouts to enable image anomaly analysis.</p>
                </div>

                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm">
                    ✓ Profile assets and coordinates successfully updated!
                  </div>
                )}
                
                {saveError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded text-rose-800 text-sm">
                    ⚠ {saveError}
                  </div>
                )}

                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">University Public Name</label>
                    <input 
                      type="text" 
                      value={profileName} 
                      onChange={e=>setProfileName(e.target.value)} 
                      required 
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Contact Email</label>
                    <input 
                      type="email" 
                      value={profileEmail} 
                      onChange={e=>setProfileEmail(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Address</label>
                    <textarea 
                      value={profileAddress} 
                      onChange={e=>setProfileAddress(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      rows={2}
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Logo Section */}
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 inline-block"></span>
                    1. Official Logo Template
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Upload New Logo Image</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e=>setLogoFile(e.target.files[0])}
                        className="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {logoPreviewUrl && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">New Selected File</span>
                          <img src={logoPreviewUrl} className="h-8 w-8 object-contain border border-slate-200 rounded" />
                        </div>
                      )}
                      {profile && profile.logoImage && !logoPreviewUrl && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">Currently Seeded:</span>
                          <img src={`${BASE}${profile.logoImage}`} className="h-8 w-8 object-contain border border-slate-200 rounded" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">X Offset: {logoPos.x}%</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={logoPos.x} 
                          onChange={e=>setLogoPos({...logoPos, x: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Y Offset: {logoPos.y}%</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={logoPos.y} 
                          onChange={e=>setLogoPos({...logoPos, y: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Width: {logoPos.width}%</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={logoPos.width} 
                          onChange={e=>setLogoPos({...logoPos, width: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Height: {logoPos.height}%</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={logoPos.height} 
                          onChange={e=>setLogoPos({...logoPos, height: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Seal Section */}
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-slate-800 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 inline-block"></span>
                    2. Official Stamp/Seal Template
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Upload New Seal Image</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e=>setSealFile(e.target.files[0])}
                        className="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {sealPreviewUrl && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">New Selected File</span>
                          <img src={sealPreviewUrl} className="h-8 w-8 object-contain border border-slate-200 rounded" />
                        </div>
                      )}
                      {profile && profile.sealImage && !sealPreviewUrl && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">Currently Seeded:</span>
                          <img src={`${BASE}${profile.sealImage}`} className="h-8 w-8 object-contain border border-slate-200 rounded" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">X Offset: {sealPos.x}%</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={sealPos.x} 
                          onChange={e=>setSealPos({...sealPos, x: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Y Offset: {sealPos.y}%</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={sealPos.y} 
                          onChange={e=>setSealPos({...sealPos, y: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Width: {sealPos.width}%</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={sealPos.width} 
                          onChange={e=>setSealPos({...sealPos, width: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Height: {sealPos.height}%</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          value={sealPos.height} 
                          onChange={e=>setSealPos({...sealPos, height: Number(e.target.value)})}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Blank Layout Section */}
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-slate-800">3. Blank Certificate Layout Background</h3>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Upload Blank Layout Template</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e=>setTemplateFile(e.target.files[0])}
                      className="text-xs w-full cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {templatePreviewUrl && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 mt-2 inline-block rounded">New Layout Loaded</span>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 text-white rounded font-semibold text-sm disabled:opacity-50 shadow hover:bg-blue-700 transition"
                  >
                    {saving ? 'Saving Profile Settings...' : 'Save & Deploy Layout Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Visual Live Preview Column */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 sticky top-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Interactive Coordinates Preview</h3>
                  <p className="text-xs text-slate-500">Live positioning bounding boxes based on customized percentage values.</p>
                </div>

                {displayTemplateUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="relative inline-block border border-slate-300 rounded overflow-hidden max-w-full shadow-sm bg-slate-100">
                      <img 
                        src={displayTemplateUrl} 
                        alt="Certificate Template Preview" 
                        className="max-h-[420px] w-auto block object-contain" 
                      />
                      
                      {/* Logo Bounding Box */}
                      <div 
                        className="absolute border-2 border-green-500 bg-green-500/25 flex items-center justify-center text-green-700 text-[10px] font-extrabold shadow-sm transition-all duration-150"
                        style={{
                          left: `${logoPos.x}%`,
                          top: `${logoPos.y}%`,
                          width: `${logoPos.width}%`,
                          height: `${logoPos.height}%`
                        }}
                      >
                        Logo
                      </div>

                      {/* Seal Bounding Box */}
                      <div 
                        className="absolute border-2 border-blue-500 bg-blue-500/25 flex items-center justify-center text-blue-700 text-[10px] font-extrabold shadow-sm transition-all duration-150"
                        style={{
                          left: `${sealPos.x}%`,
                          top: `${sealPos.y}%`,
                          width: `${sealPos.width}%`,
                          height: `${sealPos.height}%`
                        }}
                      >
                        Seal
                      </div>
                    </div>

                    <div className="w-full mt-4 bg-slate-50 p-3 rounded border border-slate-150 space-y-2">
                      <div className="flex items-center text-xs text-slate-600">
                        <span className="w-3 h-3 rounded bg-green-500/25 border border-green-500 mr-2 block"></span>
                        <span>Logo: X={logoPos.x}%, Y={logoPos.y}%, W={logoPos.width}%, H={logoPos.height}%</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-600">
                        <span className="w-3 h-3 rounded bg-blue-500/25 border border-blue-500 mr-2 block"></span>
                        <span>Seal: X={sealPos.x}%, Y={sealPos.y}%, W={sealPos.width}%, H={sealPos.height}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 border-2 border-dashed border-slate-200 rounded flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
                    <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-slate-500">No template background uploaded yet. Upload a template layout background image to see active crop previews.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversityDashboard;
