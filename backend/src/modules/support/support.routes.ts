import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as svc from './support.service';

const r = Router();

// ─────────────────── USER ROUTES ──────────────────────────────────────────
r.use('/tickets', authGuard);

r.get('/tickets', asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const data = await svc.getUserTickets(userId, {
    status: req.query.status as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  });
  res.json(data);
}));

r.get('/tickets/:ticketId', asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const ticket = await svc.getUserTicketDetail(userId, req.params.ticketId);
  res.json(ticket);
}));

r.post('/tickets', validate(z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(['ACCOUNT', 'VERIFICATION', 'DEPOSIT', 'WITHDRAWAL', 'TRADING', 'PLATFORM', 'TECHNICAL', 'BILLING', 'GENERAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  content: z.string().min(10).max(5000),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
  })).optional(),
  relatedOrderId: z.string().optional(),
  relatedAccountId: z.string().optional(),
  source: z.enum(['WEB', 'EMAIL', 'CHAT']).optional(),
})), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const ticket = await svc.createTicket(userId, req.body);
  res.status(201).json(ticket);
}));

r.post('/tickets/:ticketId/reply', validate(z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
  })).optional(),
})), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const ticket = await svc.userReply(userId, req.params.ticketId, req.body);
  res.json(ticket);
}));

r.post('/tickets/:ticketId/close', validate(z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
}).partial()), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  await svc.closeTicket(userId, req.params.ticketId, req.body.rating, req.body.comment);
  res.json({ success: true, message: 'Ticket closed' });
}));

// ─────────────────── ADMIN / AGENT ROUTES ─────────────────────────────────
const admin = Router();
admin.use(authGuard);

admin.get('/tickets', requirePermission('support.view'), asyncHandler(async (req, res) => {
  const data = await svc.listTickets({
    status: req.query.status as any,
    priority: req.query.priority as any,
    category: req.query.category as any,
    assignedTo: req.query.assignedTo as string,
    q: req.query.q as string,
    userId: req.query.userId as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    sortBy: req.query.sortBy as any,
    sortOrder: req.query.sortOrder as any,
  });
  res.json(data);
}));

admin.get('/tickets/:ticketId', requirePermission('support.view'), asyncHandler(async (req, res) => {
  const ticket = await svc.getTicketDetail(req.params.ticketId);
  res.json(ticket);
}));

admin.post('/tickets/:ticketId/reply', requirePermission('support.reply'), validate(z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
  })).optional(),
  isInternal: z.boolean().optional(),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  const ticket = await svc.agentReply(actorId, req.params.ticketId, req.body);
  res.json(ticket);
}));

admin.post('/tickets/:ticketId/assign', requirePermission('support.assign'), validate(z.object({
  agentId: z.string().min(1),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.assignTicket(actorId, req.params.ticketId, req.body.agentId);
  res.json({ success: true, message: 'Ticket assigned' });
}));

admin.patch('/tickets/:ticketId/status', requirePermission('support.status'), validate(z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_ADMIN', 'RESOLVED', 'CLOSED', 'ESCALATED']),
  note: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.updateTicketStatus(actorId, req.params.ticketId, req.body.status, req.body.note);
  res.json({ success: true, message: 'Status updated' });
}));

admin.patch('/tickets/:ticketId/priority', requirePermission('support.priority'), validate(z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.updateTicketPriority(actorId, req.params.ticketId, req.body.priority);
  res.json({ success: true, message: 'Priority updated' });
}));

admin.post('/tickets/:ticketId/tags', requirePermission('support.tags'), validate(z.object({
  tags: z.array(z.string().min(1)).min(1),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.addTicketTags(actorId, req.params.ticketId, req.body.tags);
  res.json({ success: true, message: 'Tags added' });
}));

admin.delete('/tickets/:ticketId/tags/:tag', requirePermission('support.tags'), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.removeTicketTag(actorId, req.params.ticketId, req.params.tag);
  res.json({ success: true, message: 'Tag removed' });
}));

admin.post('/tickets/:ticketId/escalate', requirePermission('support.escalate'), validate(z.object({
  reason: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.escalateTicket(actorId, req.params.ticketId, req.body.reason);
  res.json({ success: true, message: 'Ticket escalated' });
}));

admin.post('/tickets/:ticketId/merge', requirePermission('support.merge'), validate(z.object({
  sourceTicketId: z.string().min(1),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  await svc.mergeTickets(actorId, req.params.ticketId, req.body.sourceTicketId);
  res.json({ success: true, message: 'Tickets merged' });
}));

admin.get('/stats', requirePermission('support.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getTicketStats());
}));

admin.get('/agents/workload', requirePermission('support.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getAgentWorkload(req.query.agentId as string));
}));

r.use('/admin', admin);
export default r;
