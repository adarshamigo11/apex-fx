'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, XCircle, Clock, Search, Eye, ChevronDown,
  FileText, Globe, Calendar, Check, X, Loader2, ArrowRight, Download,
  AlertTriangle, BarChart3, TrendingUp, TrendingDown,
} from 'lucide-react';
import { appApi } from '@/lib/appApi';

interface KycSubmission {
  _id: string;
  userId: string;
  fullName: string;
  country: string;
  city: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType: string;
  documentNumber: string;
  documents: Array<{
    docId: string;
    type: string;
    fileName: string;
    fileUrl: string;
    status: string;
    rejectionReason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  reviewNote?: string;
  requestedDocTypes?: string[];
  user?: { email: string; roleName: string; status: string };
}

interface KycStats {
  total: number;
  submittedToday: number;
  byStatus: { PENDING: number; APPROVED: number; REJECTED: number };
  avgReviewTimeHours: number;
  approvalRate: number;
}

const STATUS_COLORS = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', icon: XCircle },
};

const TABS = ['All', 'PENDING', 'APPROVED', 'REJECTED'];

export default function AdminKycPage() {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [stats, setStats] = useState<KycStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [docDecisions, setDocDecisions] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [actionLoading, setActionLoading] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'All' ? '' : tab;
      const [subData, statsData] = await Promise.all([
        appApi.admin.kyc.list({ status: status as any, q: search, page, limit }),
        appApi.admin.kyc.stats(),
      ]);
      setSubmissions(subData.items || []);
      setTotal(subData.total || 0);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load KYC data:', e);
    }
    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!reviewNote.trim()) { alert('Please provide a review note'); return; }
    setActionLoading(id);
    try {
      const documentDecisions = Object.entries(docDecisions)
        .filter(([docId]) => submissions.find(s => s._id === id)?.documents.some(d => d.docId === docId))
        .map(([docId, status]) => ({ docId, status, reason: undefined }));

      await appApi.admin.kyc.review(id, {
        status: decision,
        reviewNote,
        documentDecisions: documentDecisions.length > 0 ? documentDecisions : undefined,
      });
      setReviewNote('');
      setDocDecisions({});
      setExpandedId(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to process decision');
    }
    setActionLoading('');
  };

  const handleRequestDocs = async (id: string) => {
    const types = prompt('Enter requested document types (comma-separated):');
    if (!types) return;
    setActionLoading(id);
    try {
      await appApi.admin.kyc.requestDocs(id, {
        docTypes: types.split(',').map((t: string) => t.trim()).filter(Boolean),
        note: reviewNote || 'Additional documents required',
      });
      setReviewNote('');
      setExpandedId(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to request documents');
    }
    setActionLoading('');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            KYC Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage identity verification submissions</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-slate-500">Total Submissions</p><p className="text-2xl font-bold">{stats.total}</p></div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-slate-500">Pending Review</p><p className="text-2xl font-bold text-amber-500">{stats.byStatus.PENDING}</p></div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-slate-500">Approval Rate</p><p className="text-2xl font-bold text-emerald-500">{stats.approvalRate}%</p></div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-slate-500">Avg Review Time</p><p className="text-2xl font-bold">{stats.avgReviewTimeHours}h</p></div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or document number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-[var(--text)]'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No KYC submissions found</p>
          </div>
        ) : (
          submissions.map((sub, index) => {
            const status = STATUS_COLORS[sub.status];
            const StatusIcon = status.icon;
            const isExpanded = expandedId === sub._id;

            return (
              <motion.div key={sub._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className={`glass rounded-xl border transition-all ${isExpanded ? 'border-emerald-500/30' : 'border-[var(--border)]'}`}>
                <div onClick={() => setExpandedId(isExpanded ? null : sub._id)}
                  className="p-4 flex items-center gap-4 cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${status.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{sub.fullName}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text} ${status.border} border`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{sub.country}</span>
                      <span>{sub.user?.email}</span>
                      <span>{sub.documentNumber}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <p>{new Date(sub.createdAt).toLocaleDateString()}</p>
                    <p>{sub.documents.length} docs</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-[var(--border)]">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Full Name</p><p className="font-medium">{sub.fullName}</p></div>
                          <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Country</p><p className="font-medium">{sub.country}</p></div>
                          <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">City</p><p className="font-medium">{sub.city}</p></div>
                          <div className="bg-[var(--surface)] rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Document</p><p className="font-medium">{sub.documentType}</p></div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Uploaded Documents</h4>
                          <div className="space-y-2">
                            {sub.documents.map(doc => {
                              const isDecided = docDecisions[doc.docId];
                              return (
                                <div key={doc.docId} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg">
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{doc.fileName}</p>
                                    <p className="text-xs text-slate-500 capitalize">{doc.type}</p>
                                  </div>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </a>
                                  <a href={doc.fileUrl} download
                                    className="p-2 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-colors">
                                    <Download className="w-4 h-4" />
                                  </a>
                                  {sub.status === 'PENDING' && (
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setDocDecisions(d => ({ ...d, [doc.docId]: 'APPROVED' }))}
                                        className={`p-2 rounded-lg transition-colors ${isDecided === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500'}`}>
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => setDocDecisions(d => ({ ...d, [doc.docId]: 'REJECTED' }))}
                                        className={`p-2 rounded-lg transition-colors ${isDecided === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'}`}>
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {sub.status === 'PENDING' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1.5">Review Note</label>
                            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                              placeholder="Enter your review notes here..."
                              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                          </div>
                        )}

                        {sub.reviewNote && (
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                            <p className="text-xs text-amber-600 font-medium mb-1">Previous Review</p>
                            <p className="text-xs text-slate-500">{sub.reviewNote}</p>
                            {sub.requestedDocTypes && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {sub.requestedDocTypes.map(t => (
                                  <span key={t} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px]">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {sub.status === 'PENDING' && (
                          <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => handleDecision(sub._id, 'APPROVED')} disabled={!!actionLoading}
                              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                              {actionLoading === sub._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Approve
                            </button>
                            <button onClick={() => handleDecision(sub._id, 'REJECTED')} disabled={!!actionLoading}
                              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                              {actionLoading === sub._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Reject
                            </button>
                            <button onClick={() => handleRequestDocs(sub._id)} disabled={!!actionLoading}
                              className="px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-medium hover:border-emerald-500/30 transition-colors">
                              Request Docs
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[var(--text)] disabled:opacity-30">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[var(--text)] disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
