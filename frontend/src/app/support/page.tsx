'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Search, Clock, CheckCircle, XCircle, ChevronDown,
  ChevronUp, Send, Paperclip, Star, AlertTriangle, Loader2, ArrowLeft,
  FileText, Filter, Inbox, MessageCircle, Clock3, Tag, Hash,
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
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedToName?: string;
  messages: TicketMessage[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  satisfactionRating?: number;
  satisfactionComment?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  OPEN: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Inbox, label: 'Open' },
  IN_PROGRESS: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock3, label: 'In Progress' },
  WAITING_USER: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: MessageCircle, label: 'Waiting for You' },
  WAITING_ADMIN: { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Clock, label: 'Waiting for Support' },
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
  { value: 'ACCOUNT', label: 'Account Issue', icon: '👤' },
  { value: 'VERIFICATION', label: 'KYC / Verification', icon: '🔐' },
  { value: 'DEPOSIT', label: 'Deposit Problem', icon: '💳' },
  { value: 'WITHDRAWAL', label: 'Withdrawal Issue', icon: '💰' },
  { value: 'TRADING', label: 'Trading Question', icon: '📈' },
  { value: 'PLATFORM', label: 'Platform Bug', icon: '🐛' },
  { value: 'TECHNICAL', label: 'Technical Support', icon: '🔧' },
  { value: 'BILLING', label: 'Billing / Invoice', icon: '📄' },
  { value: 'GENERAL', label: 'General Inquiry', icon: '💬' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create form state
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'MEDIUM' as string,
    content: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      appApi.loadTokens();
      const data = await appApi.support.tickets({ status: filterStatus });
      setTickets(data.items || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const ticket = await appApi.support.ticketDetail(ticketId);
      setSelectedTicket(ticket);
      setView('detail');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await appApi.support.reply(selectedTicket.ticketId, { content: replyText });
      setReplyText('');
      await fetchTicketDetail(selectedTicket.ticketId);
    } catch (err) {
      alert('Failed to send reply');
    }
    setSending(false);
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    setClosingTicket(true);
    try {
      await appApi.support.closeTicket(selectedTicket.ticketId, {
        rating: rating > 0 ? rating : undefined,
        comment: ratingComment || undefined,
      });
      setView('list');
      setSelectedTicket(null);
      setRating(0);
      setRatingComment('');
      await fetchTickets();
    } catch (err) {
      alert('Failed to close ticket');
    }
    setClosingTicket(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.category || !newTicket.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      await appApi.support.createTicket({
        subject: newTicket.subject,
        category: newTicket.category,
        priority: newTicket.priority,
        content: newTicket.content,
      });
      setNewTicket({ subject: '', category: '', priority: 'MEDIUM', content: '' });
      setView('list');
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    }
    setCreating(false);
  };

  const filteredTickets = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusTabs = [
    { key: '', label: 'All', count: tickets.length },
    { key: 'OPEN', label: 'Open', count: tickets.filter(t => t.status === 'OPEN').length },
    { key: 'IN_PROGRESS', label: 'In Progress', count: tickets.filter(t => t.status === 'IN_PROGRESS').length },
    { key: 'WAITING_USER', label: 'Waiting You', count: tickets.filter(t => t.status === 'WAITING_USER').length },
    { key: 'RESOLVED', label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED').length },
    { key: 'CLOSED', label: 'Closed', count: tickets.filter(t => t.status === 'CLOSED').length },
  ];

  // ─────────── LIST VIEW ───────────
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-500" />
              Support Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">Get help with your account, trades, or platform issues</p>
          </div>
          <button onClick={() => setView('create')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === tab.key ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--surface)] text-slate-500 hover:text-[var(--text)]'}`}>
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tickets found</p>
            <button onClick={() => setView('create')} className="mt-4 text-emerald-500 text-sm hover:underline">
              Create your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map((ticket, index) => {
              const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = status.icon;
              const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
              const lastMessage = ticket.messages?.[ticket.messages.length - 1];

              return (
                <motion.div key={ticket.ticketId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  onClick={() => fetchTicketDetail(ticket.ticketId)}
                  className="glass rounded-xl p-4 cursor-pointer hover:border-emerald-500/30 transition-colors border border-[var(--border)]">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">{ticket.ticketId}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                        <span className={`text-[10px] font-medium ${priority.color}`}>{priority.label}</span>
                      </div>
                      <h3 className="font-medium text-sm mt-1 truncate">{ticket.subject}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lastMessage ? (
                          <span className="truncate">{lastMessage.senderName}: {lastMessage.content.slice(0, 80)}...</span>
                        ) : 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>{CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}</span>
                        <span>{ticket.messages?.length || 0} messages</span>
                        <span>{new Date(ticket.lastActivityAt).toLocaleDateString()}</span>
                        {ticket.assignedToName && <span>Agent: {ticket.assignedToName}</span>}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────── CREATE VIEW ───────────
  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-[var(--surface)] text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Create New Ticket</h1>
            <p className="text-sm text-slate-500">Describe your issue and we'll get back to you</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input type="text" value={newTicket.subject} onChange={e => setNewTicket(t => ({ ...t, subject: e.target.value }))}
              placeholder="Brief description of your issue"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              maxLength={200} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Category <span className="text-red-500">*</span></label>
              <select value={newTicket.category} onChange={e => setNewTicket(t => ({ ...t, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none">
                <option value="">Select category</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Priority</label>
              <select value={newTicket.priority} onChange={e => setNewTicket(t => ({ ...t, priority: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea value={newTicket.content} onChange={e => setNewTicket(t => ({ ...t, content: e.target.value }))}
              rows={6}
              placeholder="Please provide as much detail as possible about your issue..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              maxLength={5000} />
            <p className="text-xs text-slate-400 mt-1">{newTicket.content.length}/5000 characters</p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={() => setView('list')}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-[var(--text)] transition-colors">
              Cancel
            </button>
            <button onClick={handleCreateTicket} disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {creating ? 'Creating...' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── DETAIL VIEW ───────────
  if (!selectedTicket) return null;
  const status = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN;
  const StatusIcon = status.icon;
  const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(selectedTicket.status);
  const canReply = !isResolvedOrClosed;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-[var(--surface)] text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500">{selectedTicket.ticketId}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
          </div>
          <h1 className="text-lg font-bold truncate">{selectedTicket.subject}</h1>
        </div>
        {canReply && (
          <button onClick={() => handleCloseTicket()} disabled={closingTicket}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-500 border border-[var(--border)] hover:border-red-500/30 transition-colors">
            {closingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Close Ticket'}
          </button>
        )}
      </div>

      {/* Ticket Info */}
      <div className="glass rounded-xl p-4 mb-4 flex flex-wrap gap-4 text-sm">
        <div><span className="text-slate-500">Category:</span> <span className="font-medium">{CATEGORIES.find(c => c.value === selectedTicket.category)?.label || selectedTicket.category}</span></div>
        <div><span className="text-slate-500">Priority:</span> <span className={`font-medium ${PRIORITY_CONFIG[selectedTicket.priority]?.color}`}>{PRIORITY_CONFIG[selectedTicket.priority]?.label || selectedTicket.priority}</span></div>
        <div><span className="text-slate-500">Created:</span> <span className="font-medium">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span></div>
        {selectedTicket.assignedToName && <div><span className="text-slate-500">Agent:</span> <span className="font-medium">{selectedTicket.assignedToName}</span></div>}
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {selectedTicket.messages?.filter(m => !m.isInternal).map((message, index) => {
          const isUser = message.senderType === 'USER';
          const isSystem = message.senderType === 'SYSTEM';

          return (
            <motion.div key={message.messageId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isSystem ? 'bg-amber-500/5 border border-amber-500/20 text-center mx-auto' :
                isUser ? 'bg-emerald-500 text-white' : 'bg-[var(--surface)] border border-[var(--border)]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${isUser ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {message.senderName}
                  </span>
                  <span className={`text-[10px] ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={`text-sm ${isSystem ? 'text-amber-600' : ''}`}>{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.attachments.map(att => (
                      <a key={att.fileName} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${isUser ? 'bg-emerald-400/20 text-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                        <FileText className="w-3 h-3" />
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
      {canReply && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                rows={3}
                placeholder="Type your reply..."
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                maxLength={5000} />
            </div>
            <button onClick={handleReply} disabled={!replyText.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Close & Rating (if resolved) */}
      {selectedTicket.status === 'RESOLVED' && !selectedTicket.satisfactionRating && (
        <div className="glass rounded-xl p-4 mt-4">
          <p className="text-sm font-medium mb-3">How was your support experience?</p>
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}
                className={`p-1 transition-colors ${star <= rating ? 'text-amber-500' : 'text-slate-300'}`}>
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
          <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
            rows={2}
            placeholder="Optional feedback..."
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none mb-3"
            maxLength={500} />
          <button onClick={handleCloseTicket}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
            Submit & Close Ticket
          </button>
        </div>
      )}

      {selectedTicket.satisfactionRating && (
        <div className="glass rounded-xl p-4 mt-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} className={`w-5 h-5 ${star <= selectedTicket.satisfactionRating! ? 'text-amber-500 fill-current' : 'text-slate-300'}`} />
            ))}
          </div>
          <p className="text-sm text-slate-500">Thank you for your feedback!</p>
        </div>
      )}
    </div>
  );
}
