'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Filter, ChevronDown, Send, CheckCircle, XCircle,
  Clock, ArrowUp, ArrowDown, User, Tag, Hash, Star, Loader2, Eye,
  ArrowLeft, Paperclip, AlertTriangle, BarChart3, Inbox, Check,
  X, Clock3, MessageCircle, UserCheck, Merge, ArrowUpCircle,
} from 'lucide-react';
import { appApi } from '@/lib/appApi';

interface TicketMessage {
  messageId: string;
  senderId: string;
  senderType: 'USER' | 'AGENT' | 'SYSTEM';
  senderName: string;
  content: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  isInternal?: boolean;
  createdAt: string;
  readAt?: string;
}

interface SupportTicket {
  _id: string;
  ticketId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  satisfactionRating?: number;
  satisfactionComment?: string;
  resolution?: string;
}

interface TicketStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResolutionTime: number;
  satisfactionRate: number;
  todayNew: number;
  unresolvedHighPriority: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  OPEN: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Inbox, label: 'Open' },
  IN_PROGRESS: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock3, label: 'In Progress' },
  WAITING_USER: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: MessageCircle, label: 'Waiting User' },
  WAITING_ADMIN: { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Clock, label: 'Waiting Admin' },
  RESOLVED: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Resolved' },
  CLOSED: { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: XCircle, label: 'Closed' },
  ESCALATED: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Escalated' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW: { color: 'text-slate-400', label: 'Low' },
  MEDIUM: { color: 'text-blue-400', label: 'Medium' },
  HIGH: { color: 'text-amber-500', label: 'High' },
  URGENT: { color: 'text-red-500', label: 'Urgent' },
};

const CATEGORIES = [
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRADING', label: 'Trading' },
  { value: 'PLATFORM', label: 'Platform' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'GENERAL', label: 'General' },
];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    q: '',
    sortBy: 'lastActivityAt' as string,
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [newTag, setNewTag] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [mergeTicketId, setMergeTicketId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        appApi.admin.support.tickets(filters),
        appApi.admin.support.stats(),
      ]);
      setTickets(data.items || []);
      setTotal(data.total || 0);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const ticket = await appApi.admin.support.ticketDetail(ticketId);
      setSelectedTicket(ticket);
      setView('detail');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
  };

  const handleReply = async (isInternal = false) => {
    const text = isInternal ? internalNote : replyText;
    if (!text.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await appApi.admin.support.reply(selectedTicket.ticketId, { content: text, isInternal });
      if (isInternal) setInternalNote('');
      else setReplyText('');
      await fetchTicketDetail(selectedTicket.ticketId);
    } catch (err) {
      alert('Failed to send reply');
    }
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;
    setActionLoading('status');
    try {
      await appApi.admin.support.status(selectedTicket.ticketId, { status });
      await fetchTicketDetail(selectedTicket.ticketId);
      await fetchTickets();
    } catch (err) {
      alert('Failed to update status');
    }
    setActionLoading('');
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedTicket) return;
    setActionLoading('priority');
    try {
      await appApi.admin.support.priority(selectedTicket.ticketId, { priority });
      await fetchTicketDetail(selectedTicket.ticketId);
      await fetchTickets();
    } catch (err) {
      alert('Failed to update priority');
    }
    setActionLoading('');
  };

  const handleAssign = async (agentId: string) => {
    if (!selectedTicket) return;
    setActionLoading('assign');
    try {
      await appApi.admin.support.assign(selectedTicket.ticketId, { agentId });
      await fetchTicketDetail(selectedTicket.ticketId);
      await fetchTickets();
    } catch (err) {
      alert('Failed to assign ticket');
    }
    setActionLoading('');
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !selectedTicket) return;
    setActionLoading('tag');
    try {
      await appApi.admin.support.addTag(selectedTicket.ticketId, { tags: [newTag.trim()] });
      setNewTag('');
      await fetchTicketDetail(selectedTicket.ticketId);
    } catch (err) {
      alert('Failed to add tag');
    }
    setActionLoading('');
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedTicket) return;
    try {
      await appApi.admin.support.removeTag(selectedTicket.ticketId, tag);
      await fetchTicketDetail(selectedTicket.ticketId);
    } catch (err) {
      alert('Failed to remove tag');
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim() || !selectedTicket) return;
    setActionLoading('escalate');
    try {
      await appApi.admin.support.escalate(selectedTicket.ticketId, { reason: escalateReason });
      setEscalateReason('');
      await fetchTicketDetail(selectedTicket.ticketId);
      await fetchTickets();
    } catch (err) {
      alert('Failed to escalate ticket');
    }
    setActionLoading('');
  };

  const handleMerge = async () => {
    if (!mergeTicketId.trim() || !selectedTicket) return;
    setActionLoading('merge');
    try {
      await appApi.admin.support.merge(selectedTicket.ticketId, { sourceTicketId: mergeTicketId });
      setMergeTicketId('');
      await fetchTickets();
      setView('list');
    } catch (err) {
      alert('Failed to merge tickets');
    }
    setActionLoading('');
  };

  const totalPages = Math.ceil(total / filters.limit);

  // ─────────── LIST VIEW ───────────
  if (view === 'list') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-500" />
              Support Tickets
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage and respond to customer support requests</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-slate-500">Total Tickets</p><p className="text-2xl font-bold">{stats.total}</p></div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-slate-500">New Today</p><p className="text-2xl font-bold text-blue-500">{stats.todayNew}</p></div>
                <Inbox className="w-5 h-5 text-blue-500" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-slate-500">High Priority Open</p><p className="text-2xl font-bold text-red-500">{stats.unresolvedHighPriority}</p></div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-slate-500">Satisfaction</p><p className="text-2xl font-bold text-emerald-500">{stats.satisfactionRate}%</p></div>
                <Star className="w-5 h-5 text-emerald-500" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value, page: 1 }))}
              placeholder="Search tickets, users, IDs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none">
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button onClick={() => setFilters(f => ({ ...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc' }))}
            className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-slate-500 hover:text-[var(--text)]">
            {filters.sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket, index) => {
              const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = status.icon;
              const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
              const lastMessage = ticket.messages?.[ticket.messages.length - 1];

              return (
                <motion.div key={ticket.ticketId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  onClick={() => fetchTicketDetail(ticket.ticketId)}
                  className="glass rounded-xl border border-[var(--border)] hover:border-emerald-500/30 transition-colors cursor-pointer p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">{ticket.ticketId}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                        <span className={`text-[10px] font-medium ${priority.color}`}>{priority.label}</span>
                        {ticket.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[10px] text-slate-500">{tag}</span>
                        ))}
                      </div>
                      <h3 className="font-medium text-sm mt-1 truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.userName || ticket.userEmail}</span>
                        <span>{CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}</span>
                        <span>{ticket.messages?.length || 0} messages</span>
                        <span>{new Date(ticket.lastActivityAt).toLocaleDateString()}</span>
                        {ticket.assignedToName && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{ticket.assignedToName}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page === 1}
              className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[var(--text)] disabled:opacity-30">Previous</button>
            <span className="text-sm text-slate-500">Page {filters.page} of {totalPages}</span>
            <button onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, f.page + 1) }))} disabled={filters.page === totalPages}
              className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[var(--text)] disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    );
  }

  // ─────────── DETAIL VIEW ───────────
  if (!selectedTicket) return null;
  const status = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN;
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setView('list'); setSelectedTicket(null); }} className="p-2 rounded-lg hover:bg-[var(--surface)] text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500">{selectedTicket.ticketId}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
          </div>
          <h1 className="text-lg font-bold truncate">{selectedTicket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket Info */}
          <div className="glass rounded-xl p-4 flex flex-wrap gap-4 text-sm">
            <div><span className="text-slate-500">User:</span> <span className="font-medium">{selectedTicket.userName || selectedTicket.userEmail}</span></div>
            <div><span className="text-slate-500">Category:</span> <span className="font-medium">{CATEGORIES.find(c => c.value === selectedTicket.category)?.label}</span></div>
            <div><span className="text-slate-500">Priority:</span> <span className={`font-medium ${PRIORITY_CONFIG[selectedTicket.priority]?.color}`}>{PRIORITY_CONFIG[selectedTicket.priority]?.label}</span></div>
            <div><span className="text-slate-500">Created:</span> <span className="font-medium">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span></div>
          </div>

          {/* Messages */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
            {selectedTicket.messages?.map((message, index) => {
              const isUser = message.senderType === 'USER';
              const isSystem = message.senderType === 'SYSTEM';
              const isInternal = message.isInternal;

              if (isInternal) return null; // Don't show internal notes to user view (admin sees all)

              return (
                <motion.div key={message.messageId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isSystem ? 'bg-amber-500/5 border border-amber-500/20 text-center mx-auto' :
                    isUser ? 'bg-emerald-500 text-white' : 'bg-[var(--surface)] border border-[var(--border)]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${isUser ? 'text-emerald-100' : 'text-slate-500'}`}>{message.senderName}</span>
                      <span className={`text-[10px] ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className={`text-sm ${isSystem ? 'text-amber-600' : ''}`}>{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.attachments.map(att => (
                          <a key={att.fileName} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${isUser ? 'bg-emerald-400/20 text-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                            <Paperclip className="w-3 h-3" />
                            {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Area */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => handleReply(false)} disabled={!replyText.trim() || sending}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Reply to Customer
              </button>
              <button onClick={() => handleReply(true)} disabled={!internalNote.trim() || sending}
                className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm font-medium hover:border-emerald-500/30 transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Internal Note
              </button>
            </div>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              rows={3}
              placeholder="Reply to customer..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              maxLength={5000} />
            <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)}
              rows={2}
              placeholder="Internal note (not visible to customer)..."
              className="w-full px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              maxLength={5000} />
          </div>
        </div>

        {/* Right: Actions Panel */}
        <div className="space-y-4">
          {/* Status Actions */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(s => (
                <button key={s} onClick={() => handleStatusChange(s)} disabled={actionLoading === 'status'}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedTicket.status === s ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[var(--surface)] text-slate-500 hover:text-[var(--text)]'
                  }`}>
                  {STATUS_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium">Priority</h3>
            <div className="flex gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handlePriorityChange(key)} disabled={actionLoading === 'priority'}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedTicket.priority === key ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[var(--surface)] text-slate-500 hover:text-[var(--text)]'
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium">Assign</h3>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Agent ID"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleAssign((e.target as HTMLInputElement).value); }} />
              <button onClick={() => handleAssign((document.querySelector('input[placeholder="Agent ID"]') as HTMLInputElement)?.value || '')}
                disabled={actionLoading === 'assign'}
                className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                <UserCheck className="w-4 h-4" />
              </button>
            </div>
            {selectedTicket.assignedToName && <p className="text-xs text-slate-500">Current: {selectedTicket.assignedToName}</p>}
          </div>

          {/* Tags */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {selectedTicket.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface)] text-xs text-slate-500">
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..."
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }} />
              <button onClick={handleAddTag} disabled={actionLoading === 'tag'}
                className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                <PlusIcon />
              </button>
            </div>
          </div>

          {/* Escalate */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-red-500 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4" />
              Escalate
            </h3>
            <textarea value={escalateReason} onChange={e => setEscalateReason(e.target.value)}
              rows={2}
              placeholder="Reason for escalation..."
              className="w-full px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 text-sm focus:outline-none resize-none"
              maxLength={500} />
            <button onClick={handleEscalate} disabled={!escalateReason.trim() || actionLoading === 'escalate'}
              className="w-full py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">
              {actionLoading === 'escalate' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Escalate to Management'}
            </button>
          </div>

          {/* Merge */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Merge className="w-4 h-4" />
              Merge Tickets
            </h3>
            <input type="text" value={mergeTicketId} onChange={e => setMergeTicketId(e.target.value)} placeholder="Source Ticket ID"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none"
              maxLength={50} />
            <button onClick={handleMerge} disabled={!mergeTicketId.trim() || actionLoading === 'merge'}
              className="w-full py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium hover:border-emerald-500/30 disabled:opacity-50">
              {actionLoading === 'merge' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Merge into this ticket'}
            </button>
          </div>

          {/* Satisfaction */}
          {selectedTicket.satisfactionRating && (
            <div className="glass rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className={`w-5 h-5 ${star <= selectedTicket.satisfactionRating! ? 'text-amber-500 fill-current' : 'text-slate-300'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500">{selectedTicket.satisfactionComment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2v8M2 6h8" />
    </svg>
  );
}
