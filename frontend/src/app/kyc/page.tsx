'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Upload, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Camera, MapPin, Phone, User, Calendar, ChevronDown,
  Trash2, Eye, Globe, CreditCard, Home, Briefcase, Fingerprint,
  Loader2, ArrowRight, RefreshCw, ChevronRight,
} from 'lucide-react';
import { appApi } from '@/lib/appApi';

interface KycDocument {
  docId: string;
  type: 'identity' | 'address' | 'selfie' | 'bank_statement' | 'utility_bill' | 'tax_id' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

interface KycData {
  status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  fullName?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string;
  documents?: KycDocument[];
  reviewNote?: string;
  requestedDocTypes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  idTypes: string[];
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: any; desc: string }> = {
  identity: { label: 'Identity Document', icon: CreditCard, desc: 'Passport, ID card, or driving license' },
  address: { label: 'Proof of Address', icon: Home, desc: 'Utility bill or bank statement (last 3 months)' },
  selfie: { label: 'Selfie with ID', icon: Camera, desc: 'Photo holding your ID document' },
  bank_statement: { label: 'Bank Statement', icon: Briefcase, desc: 'Last 3 months showing your name' },
  utility_bill: { label: 'Utility Bill', icon: FileText, desc: 'Electricity, water, or gas bill' },
  tax_id: { label: 'Tax ID Document', icon: Fingerprint, desc: 'Tax identification or SSN card' },
  other: { label: 'Other Document', icon: FileText, desc: 'Any additional supporting document' },
};

const STATUS_CONFIG = {
  NOT_STARTED: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Shield, label: 'Not Started' },
  PENDING: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock, label: 'Under Review' },
  APPROVED: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, label: 'Verified' },
  REJECTED: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle, label: 'Rejected' },
};

const ID_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  driving_license: 'Driving License',
  national_id: 'National ID Card',
  state_id: 'State ID',
  provincial_id: 'Provincial ID',
  resident_card: 'Resident Card',
  aadhaar: 'Aadhaar Card',
  voter_id: 'Voter ID',
  emirates_id: 'Emirates ID',
};

export default function KycPage() {
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    country: '',
    city: '',
    address: '',
    postalCode: '',
    documentType: '',
    documentNumber: '',
    phone: '',
  });
  const [documents, setDocuments] = useState<KycDocument[]>([]);

  const fetchKyc = useCallback(async () => {
    try {
      appApi.loadTokens();
      const data = await appApi.kyc();
      setKyc(data);
      if (data && data.status !== 'NOT_STARTED') {
        setForm({
          fullName: data.fullName || '',
          dateOfBirth: data.dateOfBirth || '',
          country: data.country || '',
          city: data.city || '',
          address: data.address || '',
          postalCode: data.postalCode || '',
          documentType: data.documentType || '',
          documentNumber: data.documentNumber || '',
          phone: data.phone || '',
        });
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch KYC:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const data = await appApi.kycCountries();
      setCountries(data);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  }, []);

  useEffect(() => {
    fetchKyc();
    fetchCountries();
  }, [fetchKyc, fetchCountries]);

  const selectedCountry = countries.find(c => c.code === form.country);

  const handleFileUpload = async (type: string, file: File) => {
    const uploadId = `${type}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

    try {
      const { docId, uploadUrl, fileUrl } = await appApi.kycUploadUrl({
        type: type as any,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(prev => ({ ...prev, [uploadId]: Math.round((e.loaded / e.total) * 100) }));
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', resolve);
        xhr.addEventListener('error', reject);
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      const newDoc: KycDocument = {
        docId,
        type: type as any,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING',
      };

      setDocuments(prev => [...prev, newDoc]);
      setUploadProgress(prev => { const n = { ...prev }; delete n[uploadId]; return n; });
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadProgress(prev => { const n = { ...prev }; delete n[uploadId]; return n; });
      alert('Upload failed. Please try again.');
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.docId !== docId));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await appApi.kycSubmit({
        ...form,
        documents: documents.map(d => ({
          ...d,
          uploadedAt: new Date(d.uploadedAt).toISOString(),
        })),
      });
      await fetchKyc();
      setActiveStep(0);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = form.fullName && form.dateOfBirth && form.country && form.city &&
    form.address && form.postalCode && form.documentType && form.documentNumber &&
    form.phone && documents.length >= 1 && documents.some(d => d.type === 'identity');

  const statusConfig = STATUS_CONFIG[kyc?.status || 'NOT_STARTED'];
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // APPROVED STATE
  if (kyc?.status === 'APPROVED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-500 mb-2">Identity Verified</h2>
          <p className="text-sm text-slate-500 mb-6">Your KYC verification has been approved. You now have full access to all platform features.</p>
          <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{kyc.fullName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Country</span><span className="font-medium">{countries.find(c => c.code === kyc.country)?.name || kyc.country}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Verified On</span><span className="font-medium">{new Date(kyc.updatedAt || '').toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Level</span><span className="font-medium text-emerald-500">Advanced</span></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // REJECTED STATE
  if (kyc?.status === 'REJECTED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-bold text-red-500">Verification Rejected</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">{kyc.reviewNote || 'Your submission did not meet our verification requirements. Please review the feedback and resubmit.'}</p>
            {kyc.requestedDocTypes && kyc.requestedDocTypes.length > 0 && (
              <div className="bg-[var(--surface)] rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Additional documents requested:</p>
                <div className="flex flex-wrap gap-2">
                  {kyc.requestedDocTypes.map(t => (
                    <span key={t} className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs">{DOC_TYPE_LABELS[t]?.label || t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => { setKyc({ ...kyc, status: 'NOT_STARTED' }); setActiveStep(0); }}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Resubmit KYC
          </button>
        </motion.div>
      </div>
    );
  }

  // PENDING STATE
  if (kyc?.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-amber-500 mb-2">Under Review</h2>
            <p className="text-sm text-slate-500">Your KYC submission is being reviewed by our compliance team. This typically takes 24-48 hours.</p>
          </div>

          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-sm">Submitted Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500">Name</p><p className="font-medium">{kyc.fullName}</p></div>
              <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500">Country</p><p className="font-medium">{countries.find(c => c.code === kyc.country)?.flag} {countries.find(c => c.code === kyc.country)?.name}</p></div>
              <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500">Documents</p><p className="font-medium">{kyc.documents?.length || 0} uploaded</p></div>
              <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500">Submitted</p><p className="font-medium">{new Date(kyc.createdAt || '').toLocaleDateString()}</p></div>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3">Uploaded Documents</h3>
            <div className="space-y-2">
              {kyc.documents?.map(doc => (
                <div key={doc.docId} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-slate-500">{DOC_TYPE_LABELS[doc.type]?.label || doc.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // FORM STEPS
  const steps = [
    { label: 'Personal Info', icon: User },
    { label: 'Documents', icon: FileText },
    { label: 'Review', icon: Shield },
  ];

  const renderStep0 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Full Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="As shown on your ID" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1.5">Country <span className="text-red-500">*</span></label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={form.country} onChange={e => { setForm(f => ({ ...f, country: e.target.value, documentType: '' })); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none">
            <option value="">Select your country</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">City <span className="text-red-500">*</span></label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Your city" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Postal Code <span className="text-red-500">*</span></label>
          <input type="text" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="ZIP / Postal code" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1.5">Address <span className="text-red-500">*</span></label>
        <div className="relative">
          <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={3}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            placeholder="Full street address" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">ID Document Type <span className="text-red-500">*</span></label>
          <select value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
            disabled={!selectedCountry}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 appearance-none">
            <option value="">{selectedCountry ? 'Select ID type' : 'Select country first'}</option>
            {selectedCountry?.idTypes.map(t => (
              <option key={t} value={t}>{ID_TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Document Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value.toUpperCase() }))}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Document number" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="+1 234 567 8900" />
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600">Upload clear, high-resolution images. All documents must be valid and unexpired. Max file size: 10MB per file.</p>
      </div>

      {(['identity', 'address', 'selfie'] as const).map(docType => {
        const config = DOC_TYPE_LABELS[docType];
        const Icon = config.icon;
        const uploaded = documents.filter(d => d.type === docType);
        const isRequired = docType === 'identity';

        return (
          <div key={docType} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{config.label} {isRequired && <span className="text-red-500">*</span>}</p>
                  <p className="text-xs text-slate-500">{config.desc}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{uploaded.length} file{uploaded.length !== 1 ? 's' : ''}</span>
            </div>

            {uploaded.length > 0 && (
              <div className="space-y-2 mb-3">
                {uploaded.map(doc => (
                  <div key={doc.docId} className="flex items-center justify-between p-2 bg-[var(--surface)] rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm truncate">{doc.fileName}</span>
                      <span className="text-xs text-slate-500">({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button onClick={() => removeDocument(doc.docId)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="block">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(docType, f); e.target.value = ''; }}
                className="hidden" />
              <div className="border-2 border-dashed border-[var(--border)] hover:border-emerald-500/30 rounded-xl p-4 text-center cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Click to upload {config.label.toLowerCase()}</p>
              </div>
            </label>
          </div>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Review Your Information</h3>
      <div className="glass rounded-xl p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-slate-500">Full Name</p><p className="font-medium">{form.fullName}</p></div>
          <div><p className="text-xs text-slate-500">Date of Birth</p><p className="font-medium">{form.dateOfBirth}</p></div>
          <div><p className="text-xs text-slate-500">Country</p><p className="font-medium">{selectedCountry?.flag} {selectedCountry?.name}</p></div>
          <div><p className="text-xs text-slate-500">City</p><p className="font-medium">{form.city}</p></div>
          <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p className="font-medium">{form.address}</p></div>
          <div><p className="text-xs text-slate-500">ID Type</p><p className="font-medium">{ID_TYPE_LABELS[form.documentType] || form.documentType}</p></div>
          <div><p className="text-xs text-slate-500">Document Number</p><p className="font-medium">{form.documentNumber}</p></div>
          <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{form.phone}</p></div>
        </div>
      </div>

      <h3 className="font-medium text-sm">Documents ({documents.length})</h3>
      <div className="space-y-2">
        {documents.map(doc => {
          const config = DOC_TYPE_LABELS[doc.type];
          const Icon = config?.icon || FileText;
          return (
            <div key={doc.docId} className="flex items-center gap-3 p-3 glass rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                <Icon className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-slate-500">{config?.label || doc.type}</p>
              </div>
              <span className="text-xs text-slate-500">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          );
        })}
      </div>

      {!canSubmit && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">Please complete all required fields and upload at least one identity document.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500" />
          KYC Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1">Verify your identity to unlock deposits, withdrawals, and full trading features</p>
      </div>

      <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${statusConfig.bg} border ${statusConfig.border}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig.bg}`}>
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
          <p className="text-xs text-slate-500">{kyc?.status === 'NOT_STARTED' ? 'Complete the form below to start verification' : 'Your submission is being processed'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <button onClick={() => isDone && setActiveStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-emerald-500 text-white' : isDone ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--surface)] text-slate-500'}`}>
                <StepIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {activeStep === 0 && renderStep0()}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-6">
        <button onClick={() => setActiveStep(s => Math.max(0, s - 1))} disabled={activeStep === 0}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-[var(--text)] disabled:opacity-30 transition-colors">
          Back
        </button>
        {activeStep < 2 ? (
          <button onClick={() => setActiveStep(s => s + 1)}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit KYC'}
          </button>
        )}
      </div>
    </div>
  );
}
