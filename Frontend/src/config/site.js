export const site = {
  siteTitle: 'EduAuth — Authenticity Validator for Academia',
  tagline: 'Building trust in education — verify certificates instantly, reliably, and affordably.',
  logo: {
    alt: 'EduAuth logo',
    colors: ['#0B5FFF', '#00C48C'],
  },
  colors: {
    primary: '#0B5FFF',
    secondary: '#00C48C',
  },
  nav: [
    { to: '/', label: 'Home' },
    { to: '/verify', label: 'Verify' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { label: 'More', children: [
      { to: '/roadmap', label: 'Roadmap' },
      { to: '/api', label: 'API' },
    ]},
    { to: '/admin', label: 'Admin' },
    { to: '/university', label: 'University' },
    { to: '/login/admin', label: 'Admin Login', publicOnly: true },
    { to: '/login/university', label: 'University Login', publicOnly: true },
    { to: '/university/apply', label: 'Apply (University)', publicOnly: true },
  ],
  home: {
    hero: {
      headline: 'Protecting academic integrity with AI & Blockchain',
      subheadline: 'AI + OCR + Blockchain verification for new and legacy certificates. Mobile-first. Government-ready.',
      ctaPrimary: { label: 'Verify (to easily verify from here also)', href: '/verify' },
      ctaSecondary: { label: 'Apply (University)', href: '/university/apply' },
    },
  },
  demo: {
    mobileFallback: {
      instructions: 'If you have low bandwidth, SMS: VERIFY <CERT_NO> to +91-XXXXXXXXXX (demo only).',
      note: 'SMS integration for production requires telco approval.',
    },
  },
  features: [
    {
      title: 'Hybrid Verification',
      description: 'Combine registry lookup, computer-vision forgery detection, and cryptographic proof for new certificates.',
    },
    {
      title: 'Legacy Certificate Support',
      description: 'OCR + template library + heuristic scoring to verify pre-digital degrees with transparent advisory badges.',
    },
    {
      title: 'Employer Portal',
      description: 'Upload & verify bulk certificates, download CSV reports, and receive real-time alerts for suspicious activity.',
    },
    {
      title: 'Government Dashboard',
      description: 'Heatmaps of forgery attempts, institution-level analytics, blacklist and escalation workflow.',
    },
    {
      title: 'Low-Tech Channels',
      description: 'QR, SMS, and IVR verification options for rural and low-connectivity users.',
    },
    {
      title: 'Explainable Reports',
      description: 'For every verification we show exactly which fields/regions caused the risk score and why.',
    },
  ],
  techSpecs: {
    frontend: 'React PWA (mobile-first), accessible HTML, i18n (English + Hindi + regional presets).',
    backend: 'FastAPI (Python) or Node.js (Express) with modular microservices: OCR service, Forgery Analysis, Verifier Gateway, Crypto Service, Case Manager.',
    database: 'Postgres for canonical records; encrypted object storage for uploads.',
    ocr: 'EasyOCR + Tesseract fallback; institution-specific parsing templates.',
    vision: 'OpenCV (SSIM, ORB/SIFT), Error Level Analysis (ELA), copy-move detection.',
    crypto: 'SHA-256 canonical hashing + X.509 digital signatures; optional permissioned ledger (Hyperledger/Quorum) for production.',
    integrations: ['NAD/DigiLocker (consent-based)', 'Institution CSV/API bulk ingest', 'UGC/AICTE lists'],
    auth: 'JWT + Role-Based Access Control; key management via KMS/HSM.',
  },
  api: {
    endpoints: [
      {
        method: 'POST',
        path: '/api/verify',
        auth: 'optional (public demo) / token for enterprise',
        body: { file: 'multipart/form-data OR url', cert_no: 'string (optional)', consent_token: 'string (optional)' },
      },
      {
        method: 'POST',
        path: '/api/institutions/bulk-upload',
        auth: 'token (institution)',
        body: { file: 'csv/json (cert_number, name, roll, marks, issue_date)' },
      },
      {
        method: 'GET',
        path: '/api/certificates/{cert_no}',
        auth: 'role-based: public minimal / institution full',
      },
    ],
  },
  about: {
    team: [
      { name: 'Lead - Tech', role: 'System architecture, backend, OCR' },
      { name: 'Lead - AI', role: 'Forgery detection, ML models' },
      { name: 'Lead - Product', role: 'UX, policy liaison, pilots' },
      { name: 'Lead - Ops', role: 'Institution onboarding, data pipeline' },
    ],
    advisors: [
      { role: 'Legal / Policy Advisor', note: 'Higher Ed / Govt liaison' },
      { role: 'Security Advisor', note: 'KMS, keys and signature best practices' },
    ],
  },
  roadmap: {
    milestones: [
      { phase: 'MVP (Hackathon)', deliverables: ['OCR + registry match + visual forgery demo', 'Demo QR/hash proof (test issuer)'] },
      { phase: 'Pilot (3 months)', deliverables: ['2 universities onboarded', 'bulk import 5–10 years of records', 'employer portal'] },
      { phase: 'State Rollout (6–12 months)', deliverables: ['Govt dashboard', 'SMS/QR integrations', 'standard operating procedures'] },
      { phase: 'Scale (1–2 years)', deliverables: ['Pan-India onboarding', 'policy adoption, integration with NAD APIs'] },
    ],
  },
  contact: {
    content: 'Form to request a pilot: organization name, contact person, role, email, phone, sample dataset upload (optional), message.',
    privacyNote: 'We only store demo uploads for 30 days. For pilots we sign an MoU and data-sharing agreement.',
    email: 'team@eduauth.example',
    phone: '+91-XXXXXXXXXX',
  },
}
