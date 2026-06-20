import { ObjectId } from 'mongodb';
import { col, COL } from '../../db/collections';
import { notFound, badRequest } from '../../common/errors';
import { logAction } from '../admin/admin.service';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'WAITING_ADMIN' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'ACCOUNT' | 'VERIFICATION' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'PLATFORM' | 'TECHNICAL' | 'BILLING' | 'GENERAL';

export interface TicketMessage {
  messageId: string;
  senderId: ObjectId;
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
  createdAt: Date;
  readAt?: Date;
}

export interface SupportTicket {
  _id?: ObjectId;
  ticketId: string;
  userId: ObjectId;
  userEmail?: string;
  userName?: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: ObjectId;
  assignedToName?: string;
  messages: TicketMessage[];
  tags: string[];
  source: 'WEB' | 'EMAIL' | 'CHAT' | 'PHONE';
  relatedOrderId?: string;
  relatedAccountId?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: ObjectId;
  satisfactionRating?: number;
  satisfactionComment?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  content: string;
  attachments?: TicketMessage['attachments'];
  relatedOrderId?: string;
  relatedAccountId?: string;
  source?: 'WEB' | 'EMAIL' | 'CHAT';
}

export interface ReplyInput {
  content: string;
  attachments?: TicketMessage['attachments'];
  isInternal?: boolean;
}

export interface TicketFilters {
  status?: TicketStatus | '';
  priority?: TicketPriority | '';
  category?: TicketCategory | '';
  assignedTo?: string;
  q?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'lastActivityAt';
  sortOrder?: 'asc' | 'desc';
}

export async function createTicket(userId: string, input: CreateTicketInput): Promise<SupportTicket> {
  const now = new Date();
  const userOid = new ObjectId(userId);

  if (!input.subject?.trim() || input.subject.length < 5) {
    throw badRequest('Subject must be at least 5 characters');
  }
  if (!input.content?.trim() || input.content.length < 10) {
    throw badRequest('Description must be at least 10 characters');
  }

  const user = await col(COL.users).findOne({ _id: userOid }, { projection: { email: 1, fullName: 1 } });
  const ticketId = await generateTicketId();

  const ticket: SupportTicket = {
    ticketId,
    userId: userOid,
    userEmail: user?.email,
    userName: user?.fullName || 'Unknown',
    subject: input.subject.trim(),
    category: input.category,
    priority: input.priority || 'MEDIUM',
    status: 'OPEN',
    messages: [{
      messageId: crypto.randomUUID(),
      senderId: userOid,
      senderType: 'USER',
      senderName: user?.fullName || 'User',
      content: input.content.trim(),
      attachments: input.attachments || [],
      isInternal: false,
      createdAt: now,
    }],
    tags: [input.category],
    source: input.source || 'WEB',
    relatedOrderId: input.relatedOrderId,
    relatedAccountId: input.relatedAccountId,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };

  const result = await col<SupportTicket>(COL.supportTickets).insertOne(ticket);
  return { ...ticket, _id: result.insertedId };
}

export async function getUserTickets(userId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
  const userOid = new ObjectId(userId);
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: any = { userId: userOid };
  if (filters.status) query.status = filters.status;

  const [items, total] = await Promise.all([
    col<SupportTicket>(COL.supportTickets)
      .find(query)
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(limit)
      .project({ messages: { $slice: -1 } })
      .toArray(),
    col<SupportTicket>(COL.supportTickets).countDocuments(query),
  ]);

  return { items, total, page, limit };
}

export async function getUserTicketDetail(userId: string, ticketId: string): Promise<SupportTicket> {
  const userOid = new ObjectId(userId);
  const ticket = await col<SupportTicket>(COL.supportTickets).findOne({ ticketId, userId: userOid });
  if (!ticket) throw notFound('Ticket not found');
  return ticket;
}

export async function userReply(userId: string, ticketId: string, input: ReplyInput): Promise<SupportTicket> {
  const now = new Date();
  const userOid = new ObjectId(userId);

  const ticket = await col<SupportTicket>(COL.supportTickets).findOne({ ticketId, userId: userOid });
  if (!ticket) throw notFound('Ticket not found');
  if (ticket.status === 'CLOSED') {
    throw badRequest('Cannot reply to a closed ticket. Please create a new ticket.');
  }

  const user = await col(COL.users).findOne({ _id: userOid }, { projection: { fullName: 1 } });
  const message: TicketMessage = {
    messageId: crypto.randomUUID(),
    senderId: userOid,
    senderType: 'USER',
    senderName: user?.fullName || 'User',
    content: input.content.trim(),
    attachments: input.attachments || [],
    isInternal: false,
    createdAt: now,
  };

  await col<SupportTicket>(COL.supportTickets).updateOne(
    { _id: ticket._id },
    {
      $push: { messages: message as any },
      $set: {
        status: ticket.status === 'WAITING_USER' ? 'IN_PROGRESS' : ticket.status,
        updatedAt: now,
        lastActivityAt: now,
      },
    }
  );

  return getUserTicketDetail(userId, ticketId);
}

export async function closeTicket(userId: string, ticketId: string, rating?: number, comment?: string): Promise<void> {
  const now = new Date();
  const userOid = new ObjectId(userId);

  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId, userId: userOid, status: { $ne: 'CLOSED' } },
    {
      $set: {
        status: 'CLOSED',
        updatedAt: now,
        lastActivityAt: now,
        ...(rating !== undefined && { satisfactionRating: rating }),
        ...(comment && { satisfactionComment: comment }),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw notFound('Ticket not found or already closed');
  }
}

export async function listTickets(filters: TicketFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.assignedTo) query.assignedTo = new ObjectId(filters.assignedTo);
  if (filters.userId) query.userId = new ObjectId(filters.userId);
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    query.$or = [
      { subject: { $regex: q, $options: 'i' } },
      { ticketId: { $regex: q, $options: 'i' } },
      { userEmail: { $regex: q, $options: 'i' } },
      { userName: { $regex: q, $options: 'i' } },
    ];
  }

  const sortField = filters.sortBy || 'lastActivityAt';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    col<SupportTicket>(COL.supportTickets)
      .find(query)
      .sort({ [sortField]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit)
      .project({ messages: { $slice: -1 } })
      .toArray(),
    col<SupportTicket>(COL.supportTickets).countDocuments(query),
  ]);

  return { items, total, page, limit };
}

export async function getTicketDetail(ticketId: string): Promise<SupportTicket> {
  const ticket = await col<SupportTicket>(COL.supportTickets).findOne({ ticketId });
  if (!ticket) throw notFound('Ticket not found');
  return ticket;
}

export async function agentReply(actorId: string, ticketId: string, input: ReplyInput): Promise<SupportTicket> {
  const now = new Date();
  const ticket = await col<SupportTicket>(COL.supportTickets).findOne({ ticketId });
  if (!ticket) throw notFound('Ticket not found');

  const actor = await col(COL.users).findOne({ _id: new ObjectId(actorId) }, { projection: { fullName: 1, roleName: 1 } });
  const message: TicketMessage = {
    messageId: crypto.randomUUID(),
    senderId: new ObjectId(actorId),
    senderType: actor?.roleName?.includes('SUPPORT') || actor?.roleName?.includes('ADMIN') ? 'AGENT' : 'SYSTEM',
    senderName: actor?.fullName || 'Support Agent',
    content: input.content.trim(),
    attachments: input.attachments || [],
    isInternal: input.isInternal || false,
    createdAt: now,
  };

  const statusUpdate: TicketStatus = input.isInternal
    ? ticket.status
    : ticket.status === 'WAITING_ADMIN' || ticket.status === 'OPEN'
      ? 'IN_PROGRESS'
      : 'WAITING_USER';

  await col<SupportTicket>(COL.supportTickets).updateOne(
    { _id: ticket._id },
    {
      $push: { messages: message as any },
      $set: {
        status: statusUpdate,
        assignedTo: ticket.assignedTo || new ObjectId(actorId),
        assignedToName: ticket.assignedToName || actor?.fullName,
        updatedAt: now,
        lastActivityAt: now,
      },
    }
  );

  await logAction(actorId, 'ticket.reply', 'support', ticketId, {
    isInternal: input.isInternal,
    ticketId: ticket.ticketId,
    userId: ticket.userId.toString(),
  });

  return getTicketDetail(ticketId);
}

export async function assignTicket(actorId: string, ticketId: string, agentId: string): Promise<void> {
  const now = new Date();
  const agentOid = new ObjectId(agentId);
  const agent = await col(COL.users).findOne({ _id: agentOid }, { projection: { fullName: 1 } });
  if (!agent) throw notFound('Agent not found');

  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId },
    {
      $set: {
        assignedTo: agentOid,
        assignedToName: agent.fullName,
        status: 'IN_PROGRESS' as TicketStatus,
        updatedAt: now,
        lastActivityAt: now,
      },
    }
  );

  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, 'ticket.assign', 'support', ticketId, { assignedTo: agentId, assignedToName: agent.fullName });
}

export async function updateTicketStatus(actorId: string, ticketId: string, status: TicketStatus, note?: string): Promise<void> {
  const now = new Date();
  const update: any = { $set: { status, updatedAt: now, lastActivityAt: now } };

  if (status === 'RESOLVED') {
    update.$set.resolvedAt = now;
    update.$set.resolvedBy = new ObjectId(actorId);
    if (note) update.$set.resolution = note;
  }

  const result = await col<SupportTicket>(COL.supportTickets).updateOne({ ticketId }, update);
  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, `ticket.status.${status.toLowerCase()}`, 'support', ticketId, { note });
}

export async function updateTicketPriority(actorId: string, ticketId: string, priority: TicketPriority): Promise<void> {
  const now = new Date();
  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId },
    { $set: { priority, updatedAt: now } }
  );
  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, 'ticket.priority', 'support', ticketId, { priority });
}

export async function addTicketTags(actorId: string, ticketId: string, tags: string[]): Promise<void> {
  const now = new Date();
  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId },
    { $addToSet: { tags: { $each: tags } }, $set: { updatedAt: now } }
  );
  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, 'ticket.tags.add', 'support', ticketId, { tags });
}

export async function removeTicketTag(actorId: string, ticketId: string, tag: string): Promise<void> {
  const now = new Date();
  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId },
    { $pull: { tags: tag }, $set: { updatedAt: now } }
  );
  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, 'ticket.tags.remove', 'support', ticketId, { tag });
}

export async function escalateTicket(actorId: string, ticketId: string, reason: string): Promise<void> {
  const now = new Date();
  const result = await col<SupportTicket>(COL.supportTickets).updateOne(
    { ticketId },
    {
      $set: { status: 'ESCALATED' as TicketStatus, priority: 'URGENT' as TicketPriority, updatedAt: now, lastActivityAt: now },
      $push: {
        messages: {
          messageId: crypto.randomUUID(),
          senderId: new ObjectId(actorId),
          senderType: 'SYSTEM',
          senderName: 'System',
          content: `Ticket escalated: ${reason}`,
          isInternal: true,
          createdAt: now,
        } as any,
      },
    }
  );
  if (result.matchedCount === 0) throw notFound('Ticket not found');
  await logAction(actorId, 'ticket.escalate', 'support', ticketId, { reason });
}

export async function mergeTickets(actorId: string, targetTicketId: string, sourceTicketId: string): Promise<void> {
  const now = new Date();
  const [target, source] = await Promise.all([
    col<SupportTicket>(COL.supportTickets).findOne({ ticketId: targetTicketId }),
    col<SupportTicket>(COL.supportTickets).findOne({ ticketId: sourceTicketId }),
  ]);

  if (!target || !source) throw notFound('One or both tickets not found');
  if (target.userId.toString() !== source.userId.toString()) {
    throw badRequest('Cannot merge tickets from different users');
  }

  const mergedMessages = [
    ...target.messages,
    ...source.messages.map(m => ({ ...m, content: `[Merged from ${sourceTicketId}] ${m.content}` })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  await col<SupportTicket>(COL.supportTickets).updateOne(
    { _id: target._id },
    {
      $set: {
        messages: mergedMessages,
        tags: [...new Set([...target.tags, ...source.tags, 'MERGED'])],
        updatedAt: now,
        lastActivityAt: now,
      },
    }
  );

  await col<SupportTicket>(COL.supportTickets).updateOne(
    { _id: source._id },
    { $set: { status: 'CLOSED' as TicketStatus, updatedAt: now, resolution: `Merged into ${targetTicketId}` } }
  );

  await logAction(actorId, 'ticket.merge', 'support', targetTicketId, { sourceTicketId });
}

export async function getTicketStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResolutionTime: number;
  satisfactionRate: number;
  todayNew: number;
  unresolvedHighPriority: number;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, todayNew, unresolvedHighPriority] = await Promise.all([
    col<SupportTicket>(COL.supportTickets).countDocuments(),
    col<SupportTicket>(COL.supportTickets).countDocuments({ createdAt: { $gte: startOfDay } }),
    col<SupportTicket>(COL.supportTickets).countDocuments({
      status: { $nin: ['RESOLVED', 'CLOSED'] },
      priority: { $in: ['HIGH', 'URGENT'] },
    }),
  ]);

  const statusAgg = await col<SupportTicket>(COL.supportTickets).aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  const byStatus = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));

  const priorityAgg = await col<SupportTicket>(COL.supportTickets).aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]).toArray();
  const byPriority = Object.fromEntries(priorityAgg.map(s => [s._id, s.count]));

  const categoryAgg = await col<SupportTicket>(COL.supportTickets).aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).toArray();
  const byCategory = Object.fromEntries(categoryAgg.map(s => [s._id, s.count]));

  const resolutionAgg = await col<SupportTicket>(COL.supportTickets).aggregate([
    { $match: { status: 'RESOLVED', resolvedAt: { $exists: true } } },
    { $project: { resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] } } },
    { $group: { _id: null, avg: { $avg: '$resolutionTime' } } },
  ]).toArray();
  const avgResolutionTime = Math.round((resolutionAgg[0]?.avg ?? 0) / (1000 * 60 * 60) * 10) / 10;

  const satisfactionAgg = await col<SupportTicket>(COL.supportTickets).aggregate([
    { $match: { satisfactionRating: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$satisfactionRating' }, count: { $sum: 1 } } },
  ]).toArray();
  const satisfactionRate = satisfactionAgg[0]?.avg ? Math.round(satisfactionAgg[0].avg * 20) : 0;

  return { total, byStatus, byPriority, byCategory, avgResolutionTime, satisfactionRate, todayNew, unresolvedHighPriority };
}

export async function getAgentWorkload(agentId?: string): Promise<{
  agentId: string;
  agentName: string;
  openTickets: number;
  resolvedToday: number;
  avgResponseTime: number;
}[]> {
  const match: any = { assignedTo: { $exists: true } };
  if (agentId) match.assignedTo = new ObjectId(agentId);

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$assignedTo',
        agentName: { $first: '$assignedToName' },
        openTickets: { $sum: { $cond: [{ $in: ['$status', ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_ADMIN']] }, 1, 0] } },
        resolvedToday: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'RESOLVED'] }, { $gte: ['$resolvedAt', new Date(new Date().setHours(0, 0, 0, 0))] }] }, 1, 0] } },
      },
    },
  ];

  const results = await col<SupportTicket>(COL.supportTickets).aggregate(pipeline).toArray();
  return results.map(r => ({
    agentId: r._id.toString(),
    agentName: r.agentName || 'Unknown',
    openTickets: r.openTickets,
    resolvedToday: r.resolvedToday,
    avgResponseTime: 0,
  }));
}

async function generateTicketId(): Promise<string> {
  const { nextSequence } = await import('../../db/collections');
  const seq = await nextSequence('support_ticket');
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `TKT-${year}${month}-${String(seq).padStart(5, '0')}`;
}
