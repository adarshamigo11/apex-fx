import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as svc from './admin.service';
import * as emp from './employee.service';
import * as approval from './approval.service';

const r = Router();
r.use(authGuard);

const pageQuery = (req: any) => ({
  page: req.query.page ? parseInt(req.query.page, 10) : undefined,
  limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
});

// ═══════════════════════════════════════════════════════════════════════════
//  EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════════
r.post('/employees', requirePermission('employee.create'), validate(z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roleName: z.enum([
    'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'RISK_MANAGER',
    'COMPLIANCE_OFFICER', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'SALES_MANAGER', 'SALES_AGENT',
    'AFFILIATE_MANAGER', 'MARKETING_MANAGER', 'AUDITOR', 'READ_ONLY_ANALYST',
    'MANAGER', 'EMPLOYEE', 'IB',
  ] as any),
  department: z.string().min(1),
  title: z.string().min(1),
  managerId: z.string().optional(),
})), asyncHandler(async (req, res) => {
  res.json(await emp.createEmployee(req.user!.sub, req.body));
}));

r.get('/employees', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await emp.listEmployees({
    q: req.query.q as string,
    department: req.query.department as string,
    status: req.query.status as string,
    roleName: req.query.roleName as string,
    page, limit,
  }));
}));

r.get('/employees/:id', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  res.json(await emp.getEmployeeDetail(req.params.id));
}));

r.patch('/employees/:id', requirePermission('employee.edit'), asyncHandler(async (req, res) => {
  res.json(await emp.updateEmployee(req.user!.sub, req.params.id, req.body));
}));

r.patch('/employees/:id/suspend', requirePermission('employee.edit'), asyncHandler(async (req, res) => {
  res.json(await emp.suspendEmployee(req.user!.sub, req.params.id));
}));

r.patch('/employees/:id/activate', requirePermission('employee.edit'), asyncHandler(async (req, res) => {
  res.json(await emp.activateEmployee(req.user!.sub, req.params.id));
}));

r.post('/employees/:id/terminate', requirePermission('employee.terminate'), validate(z.object({
  reason: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  res.json(await emp.terminateEmployee(req.user!.sub, req.params.id, req.body.reason));
}));

r.post('/employees/:id/reset-password', requirePermission('employee.reset_password'), validate(z.object({
  newPassword: z.string().min(8),
})), asyncHandler(async (req, res) => {
  res.json(await emp.resetEmployeePassword(req.user!.sub, req.params.id, req.body.newPassword));
}));

r.post('/employees/:id/force-logout', requirePermission('employee.edit'), asyncHandler(async (req, res) => {
  res.json(await emp.forceLogoutEmployee(req.user!.sub, req.params.id));
}));

r.get('/employees/:id/login-history', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await emp.getEmployeeLoginHistory(req.params.id, page, limit));
}));

r.get('/employees/:id/devices', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  res.json(await emp.getEmployeeDeviceHistory(req.params.id));
}));

r.get('/employees/:id/activity', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await emp.getEmployeeActivity(req.params.id, page, limit));
}));

r.get('/employees/:id/performance', requirePermission('employee.view'), asyncHandler(async (req, res) => {
  res.json(await emp.getEmployeePerformance(req.params.id));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/roles', requirePermission('role.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listRoles());
}));

r.post('/roles', requirePermission('role.create'), validate(z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()),
})), asyncHandler(async (req, res) => {
  res.json(await svc.createRole(req.user!.sub, req.body));
}));

r.patch('/roles/:id', requirePermission('role.edit'), asyncHandler(async (req, res) => {
  res.json(await svc.updateRole(req.user!.sub, req.params.id, req.body));
}));

r.delete('/roles/:id', requirePermission('role.delete'), asyncHandler(async (req, res) => {
  res.json(await svc.deleteRole(req.user!.sub, req.params.id));
}));

r.post('/users/:id/assign-role', requirePermission('role.assign'), validate(z.object({
  roleName: z.string().min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.assignRole(req.user!.sub, req.params.id, req.body.roleName));
}));

r.get('/permissions/matrix', requirePermission('role.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getPermissionMatrix());
}));

// ═══════════════════════════════════════════════════════════════════════════
//  USERS (enhanced)
// ═══════════════════════════════════════════════════════════════════════════
r.get('/users', requirePermission('users.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listUsers({ q: req.query.q as string, status: req.query.status as any, roleName: req.query.roleName as string, page, limit }));
}));

r.get('/users/:id', requirePermission('users.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getUserDetail(req.params.id));
}));

r.patch('/users/:id/status', requirePermission('users.edit'), validate(z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'FROZEN', 'RESTRICTED', 'TERMINATED']),
})), asyncHandler(async (req, res) => {
  res.json(await svc.setUserStatus(req.user!.sub, req.params.id, req.body.status));
}));

r.post('/users/:id/freeze', requirePermission('users.edit'), asyncHandler(async (req, res) => {
  res.json(await svc.freezeUser(req.user!.sub, req.params.id));
}));

r.post('/users/:id/restrict', requirePermission('users.edit'), validate(z.object({
  restrictions: z.array(z.string()).min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.restrictUser(req.user!.sub, req.params.id, req.body.restrictions));
}));

r.post('/users/:id/merge', requirePermission('users.delete'), validate(z.object({
  targetUserId: z.string(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.mergeAccounts(req.user!.sub, req.params.id, req.body.targetUserId));
}));

r.get('/users/:id/login-history', requirePermission('users.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.getUserLoginHistory(req.params.id, page, limit));
}));

r.get('/users/:id/devices', requirePermission('users.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getUserDeviceHistory(req.params.id));
}));

r.get('/users/:id/ip-history', requirePermission('users.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getUserIpHistory(req.params.id));
}));

r.get('/users/:id/security-events', requirePermission('users.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getUserSecurityEvents(req.params.id));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  WALLET OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
r.post('/wallet/:userId/credit', requirePermission('wallet.credit'), validate(z.object({
  amount: z.number().positive(),
  reason: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  res.json(await svc.creditWallet(req.user!.sub, req.params.userId, req.body.amount, req.body.reason));
}));

r.post('/wallet/:userId/debit', requirePermission('wallet.debit'), validate(z.object({
  amount: z.number().positive(),
  reason: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  res.json(await svc.debitWallet(req.user!.sub, req.params.userId, req.body.amount, req.body.reason));
}));

r.post('/wallet/:userId/freeze', requirePermission('wallet.freeze'), asyncHandler(async (req, res) => {
  res.json(await svc.freezeWallet(req.user!.sub, req.params.userId));
}));

r.post('/wallet/:userId/unfreeze', requirePermission('wallet.unfreeze'), asyncHandler(async (req, res) => {
  res.json(await svc.unlockWallet(req.user!.sub, req.params.userId));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  KYC (enhanced)
// ═══════════════════════════════════════════════════════════════════════════
r.get('/kyc', requirePermission('kyc.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listKyc(req.query.status as string));
}));

r.post('/kyc/:id/decision', requirePermission('kyc.approve'), validate(z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(500).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.decideKyc(req.user!.sub, req.params.id, req.body.decision, req.body.note));
}));

r.post('/kyc/:id/request-docs', requirePermission('kyc.request_docs'), validate(z.object({
  docTypes: z.array(z.string()).min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.requestKycDocuments(req.user!.sub, req.params.id, req.body.docTypes));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  DEPOSITS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/deposits', requirePermission('deposit.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listDeposits(req.query.status as string));
}));

r.post('/deposits/:id/decision', requirePermission('deposit.approve'), validate(z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(500).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.decideDeposit(req.user!.sub, req.params.id, req.body.decision, req.body.note));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  WITHDRAWALS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/withdrawals', requirePermission('withdrawal.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listWithdrawals(req.query.status as string));
}));

r.post('/withdrawals/:id/decision', requirePermission('withdrawal.approve'), validate(z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(500).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.decideWithdrawal(req.user!.sub, req.params.id, req.body.decision, req.body.note));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  BALANCE ADJUSTMENT (legacy compat)
// ═══════════════════════════════════════════════════════════════════════════
r.post('/accounts/:id/adjust-balance', requirePermission('finance.adjust_balance'), validate(z.object({
  delta: z.number().refine((n) => n !== 0, 'Delta must be non-zero'),
  reason: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  res.json(await svc.adjustBalance(req.user!.sub, req.params.id, req.body.delta, req.body.reason));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  TRADES
// ═══════════════════════════════════════════════════════════════════════════
r.get('/trades', requirePermission('trade.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listTrades({ accountId: req.query.accountId as string, userId: req.query.userId as string, page, limit }));
}));

r.get('/positions', requirePermission('trade.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listOpenPositions(req.query.symbol as string));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORT TICKETS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/support/tickets', requirePermission('support.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.getSupportTickets({ status: req.query.status as string, priority: req.query.priority as string, page, limit }));
}));

r.get('/support/tickets/:id', requirePermission('support.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getTicketDetail(req.params.id));
}));

r.post('/support/tickets/:id/escalate', requirePermission('support.escalate'), asyncHandler(async (req, res) => {
  res.json(await svc.escalateTicket(req.user!.sub, req.params.id));
}));

r.post('/support/tickets/:id/resolve', requirePermission('support.resolve'), validate(z.object({
  resolution: z.string().min(3).max(1000),
})), asyncHandler(async (req, res) => {
  res.json(await svc.resolveTicket(req.user!.sub, req.params.id, req.body.resolution));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  SYMBOLS (enhanced)
// ═══════════════════════════════════════════════════════════════════════════
r.get('/symbols', requirePermission('symbol.view'), asyncHandler(async (req, res) => {
  res.json(await svc.listSymbols());
}));

r.post('/symbols', requirePermission('symbol.create'), validate(z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(['FOREX', 'METAL', 'INDEX', 'CRYPTO', 'COMMODITY', 'ETF', 'STOCK']),
  base: z.string().min(1),
  quote: z.string().min(1),
  contractSize: z.number().positive(),
  digits: z.number().int().min(0),
  spreadPoints: z.number().nonnegative(),
  commission: z.number().nonnegative(),
  source: z.string().min(1),
  externalSymbol: z.string().optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.addSymbol(req.user!.sub, req.body));
}));

r.patch('/symbols/:name', requirePermission('symbol.edit'), validate(z.object({
  enabled: z.boolean().optional(),
  displayName: z.string().optional(),
  spreadPoints: z.number().nonnegative().optional(),
  commission: z.number().nonnegative().optional(),
  minLot: z.number().positive().optional(),
  maxLot: z.number().positive().optional(),
  lotStep: z.number().positive().optional(),
  marginPercent: z.number().positive().optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.updateSymbol(req.user!.sub, req.params.name, req.body));
}));

r.post('/symbols/:name/disable', requirePermission('symbol.disable'), asyncHandler(async (req, res) => {
  res.json(await svc.disableSymbol(req.user!.sub, req.params.name));
}));

r.post('/symbols/:name/enable', requirePermission('symbol.enable'), asyncHandler(async (req, res) => {
  res.json(await svc.enableSymbol(req.user!.sub, req.params.name));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  MARKET OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/market/config', requirePermission('market.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getMarketConfig());
}));

r.patch('/market/config', requirePermission('market.configure'), asyncHandler(async (req, res) => {
  res.json(await svc.updateMarketConfig(req.user!.sub, req.body));
}));

r.get('/market/sessions', requirePermission('market.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.listTradingSessions());
}));

r.post('/market/sessions', requirePermission('market.configure'), asyncHandler(async (req, res) => {
  res.json(await svc.setTradingSession(req.user!.sub, req.body));
}));

r.post('/market/halt', requirePermission('market.halt'), asyncHandler(async (req, res) => {
  res.json(await svc.emergencyHalt(req.user!.sub, req.body.symbolName));
}));

r.post('/market/resume', requirePermission('market.resume'), asyncHandler(async (req, res) => {
  res.json(await svc.resumeTrading(req.user!.sub, req.body.symbolName));
}));

r.get('/market/feed-providers', requirePermission('market.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.listFeedProviders());
}));

r.patch('/market/feed-providers/:id', requirePermission('market.configure'), asyncHandler(async (req, res) => {
  res.json(await svc.updateFeedProvider(req.user!.sub, req.params.id, req.body));
}));

r.get('/market/feed-health', requirePermission('market.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getFeedHealth());
}));

r.get('/market/dashboard', requirePermission('market.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getMarketDashboard());
}));

// ═══════════════════════════════════════════════════════════════════════════
//  RISK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
r.get('/risk/rules', requirePermission('risk.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.listRiskRules());
}));

r.post('/risk/rules', requirePermission('risk.configure'), validate(z.object({
  type: z.enum(['EXPOSURE', 'POSITION', 'VOLUME', 'MARGIN', 'CIRCUIT_BREAKER']),
  name: z.string().min(1),
  symbolName: z.string().optional(),
  maxExposure: z.number().optional(),
  maxPosition: z.number().optional(),
  maxVolume: z.number().optional(),
  marginMultiplier: z.number().optional(),
  circuitBreaker: z.object({ threshold: z.number(), action: z.enum(['ALERT', 'HALT']) }).optional(),
  enabled: z.boolean().optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.createRiskRule(req.user!.sub, req.body));
}));

r.patch('/risk/rules/:id', requirePermission('risk.configure'), asyncHandler(async (req, res) => {
  res.json(await svc.updateRiskRule(req.user!.sub, req.params.id, req.body));
}));

r.delete('/risk/rules/:id', requirePermission('risk.configure'), asyncHandler(async (req, res) => {
  res.json(await svc.deleteRiskRule(req.user!.sub, req.params.id));
}));

r.get('/risk/dashboard', requirePermission('risk.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getRiskDashboard());
}));

// ═══════════════════════════════════════════════════════════════════════════
//  APPROVALS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/approvals', requirePermission('approval.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await approval.listApprovals({
    type: req.query.type as string,
    status: req.query.status as string,
    page, limit,
  }));
}));

r.post('/approvals', requirePermission('approval.create'), validate(z.object({
  type: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await approval.createApproval(req.user!.sub, req.body));
}));

r.post('/approvals/:id/approve', requirePermission('approval.approve'), validate(z.object({
  note: z.string().max(500).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await approval.approveRequest(req.user!.sub, req.params.id, req.body.note));
}));

r.post('/approvals/:id/reject', requirePermission('approval.reject'), validate(z.object({
  note: z.string().max(500).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await approval.rejectRequest(req.user!.sub, req.params.id, req.body.note));
}));

r.get('/approvals/chains', requirePermission('approval.view'), asyncHandler(async (_req, res) => {
  res.json(await approval.getApprovalChains());
}));

// ═══════════════════════════════════════════════════════════════════════════
//  COMMUNICATION
// ═══════════════════════════════════════════════════════════════════════════
r.post('/communication/email/:userId', requirePermission('communication.send_email'), validate(z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.sendUserEmail(req.user!.sub, req.params.userId, req.body.subject, req.body.body));
}));

r.post('/communication/sms/:userId', requirePermission('communication.send_sms'), validate(z.object({
  message: z.string().min(1).max(500),
})), asyncHandler(async (req, res) => {
  res.json(await svc.sendUserSms(req.user!.sub, req.params.userId, req.body.message));
}));

r.post('/communication/broadcast', requirePermission('communication.broadcast'), validate(z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(['email', 'sms', 'push', 'internal']),
  filter: z.record(z.unknown()).optional(),
})), asyncHandler(async (req, res) => {
  res.json(await svc.broadcastNotification(req.user!.sub, req.body));
}));

r.get('/communication/history', requirePermission('communication.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listCommunications({ type: req.query.type as string, page, limit }));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG (enhanced)
// ═══════════════════════════════════════════════════════════════════════════
r.get('/audit/log', requirePermission('audit.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listAuditLog({
    action: req.query.action as string,
    actorId: req.query.actorId as string,
    targetType: req.query.targetType as string,
    from: req.query.from as string,
    to: req.query.to as string,
    page, limit,
  }));
}));

r.get('/audit/export', requirePermission('audit.export'), asyncHandler(async (req, res) => {
  const data = await svc.exportAuditLog({
    action: req.query.action as string,
    from: req.query.from as string,
    to: req.query.to as string,
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
  res.send(data);
}));

// legacy compat
r.get('/action-log', requirePermission('audit.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listActionLog({ page, limit }));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  MONITORING
// ═══════════════════════════════════════════════════════════════════════════
r.get('/monitoring/system', requirePermission('settings.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getSystemHealth());
}));

r.get('/monitoring/stats', requirePermission('settings.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getPlatformStats());
}));

// ═══════════════════════════════════════════════════════════════════════════
//  SECURITY EVENTS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/security-events', requirePermission('audit.view'), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req);
  res.json(await svc.listSecurityEvents({ type: req.query.type as string, userId: req.query.userId as string, page, limit }));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
r.get('/settings', requirePermission('settings.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getPlatformSettings());
}));

r.patch('/settings', requirePermission('settings.edit'), asyncHandler(async (req, res) => {
  res.json(await svc.updatePlatformSettings(req.user!.sub, req.body));
}));

// ═══════════════════════════════════════════════════════════════════════════
//  ACCOUNT TYPES (Admin-managed)
// ═══════════════════════════════════════════════════════════════════════════
r.get('/account-types', requirePermission('settings.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.listAccountTypes());
}));

r.post('/account-types', requirePermission('settings.edit'), validate(z.object({
  name: z.string().min(1).max(30),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['LIVE', 'DEMO']),
  defaultLeverage: z.number().int().positive().max(2000),
  maxLeverage: z.number().int().positive().max(2000),
  minDeposit: z.number().min(0),
  defaultBalance: z.number().min(0),
  commission: z.number().min(0),
  spreadMarkup: z.number().min(0),
  currency: z.array(z.string().length(3)).min(1),
  features: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createAccountType(req.user!.sub, req.body));
}));

r.patch('/account-types/:id', requirePermission('settings.edit'), asyncHandler(async (req, res) => {
  res.json(await svc.updateAccountType(req.user!.sub, req.params.id, req.body));
}));

r.delete('/account-types/:id', requirePermission('settings.edit'), asyncHandler(async (req, res) => {
  await svc.deleteAccountType(req.user!.sub, req.params.id);
  res.json({ ok: true });
}));

r.post('/account-types/:id/toggle', requirePermission('settings.edit'), asyncHandler(async (req, res) => {
  res.json(await svc.toggleAccountType(req.user!.sub, req.params.id));
}));

export default r;
