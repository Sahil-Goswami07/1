import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { postVerify } from '../lib/api'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!file) return setError('Please choose a PDF or image file')
    try {
      setLoading(true)
      const res = await postVerify(file)
      navigate(`/result/${res.id || 'latest'}`, { state: res })
    } catch (e) {
      setError(e.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-white">
      <form onSubmit={onSubmit} className="w-full max-w-xl bg-slate-50 border border-slate-200 p-6 rounded-xl">
        <h1 className="text-2xl font-bold text-slate-900">Upload Certificate</h1>
        <p className="text-slate-600 mt-1">Upload a PDF or image (JPG/PNG) to verify.</p>
        <div className="mt-4">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <button disabled={loading} className="mt-5 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-medium disabled:opacity-60">
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  )
}
