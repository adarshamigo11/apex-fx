// ============================================================================
//  approval.service.ts — Multi-level approval workflow management
// ============================================================================
import { ObjectId } from 'mongodb';
import { col, COL, oid } from '../../db/collections';
import { ApprovalRequestDoc, ApprovalStatus } from '../../db/models';
import { badRequest, notFound } from '../../common/errors';
import { logAction } from './admin.service';

// Default approval chains per type
const DEFAULT_CHAINS: Record<string, { levels: number; description: string }> = {
  deposit: { levels: 1, description: 'Single-level deposit approval' },
  withdrawal: { levels: 1, description: 'Single-level withdrawal approval' },
  employee_creation: { levels: 2, description: 'Manager + Admin approval' },
  role_change: { levels: 2, description: 'Manager + Super Admin approval' },
  permission_change: { levels: 2, description: 'Admin + Super Admin approval' },
  wallet_credit: { levels: 1, description: 'Finance manager approval' },
  wallet_debit: { levels: 1, description: 'Finance manager approval' },
  user_suspension: { levels: 1, description: 'Operations manager approval' },
  market_config: { levels: 2, description: 'Risk manager + Admin approval' },
  risk_config: { levels: 2, description: 'Risk manager + Admin approval' },
  kyc_rejection: { levels: 1, description: 'Compliance officer approval' },
};

function clampPage(page?: number, limit?: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(100, Math.max(1, limit ?? 20)) };
}

// ─────────────────── CREATE APPROVAL REQUEST ─────────────────────────────
export async function createApproval(actorId: string, data: {
  type: string;
  entity: string;
  entityId: string;
  data?: Record<string, unknown>;
}) {
  const chain = DEFAULT_CHAINS[data.type] || { levels: 1, description: 'Standard approval' };

  // Create approval slots
  const approvals = Array.from({ length: chain.levels }, () => ({
    approverId: new ObjectId(), // placeholder - actual approver determined at runtime
    decision: 'PENDING' as const,
    note: undefined as string | undefined,
    decidedAt: undefined as Date | undefined,
  }));

  const doc: ApprovalRequestDoc = {
    type: data.type,
    entity: data.entity,
    entityId: data.entityId,
    data: data.data,
    requestedBy: new ObjectId(actorId),
    currentLevel: 0,
    totalLevels: chain.levels,
    approvals,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { insertedId } = await col<ApprovalRequestDoc>(COL.approvalRequests).insertOne(doc);
  await logAction(actorId, 'approval.create', 'approval', insertedId.toString(), {
    type: data.type, entity: data.entity, entityId: data.entityId,
  });

  return { id: insertedId.toString(), ...doc };
}

// ─────────────────── LIST APPROVALS ──────────────────────────────────────
export async function listApprovals(opts: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.type) filter.type = opts.type;
  if (opts.status) filter.status = opts.status;

  const [items, total] = await Promise.all([
    col<ApprovalRequestDoc>(COL.approvalRequests)
      .find(filter).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).toArray(),
    col<ApprovalRequestDoc>(COL.approvalRequests).countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

// ─────────────────── APPROVE REQUEST ─────────────────────────────────────
export async function approveRequest(actorId: string, id: string, note?: string) {
  const request = await col<ApprovalRequestDoc>(COL.approvalRequests).findOne({ _id: oid(id) });
  if (!request) throw notFound('Approval request not found');
  if (request.status !== 'PENDING') throw badRequest('Request already decided');

  const level = request.currentLevel;
  const updates: any = {
    [`approvals.${level}.approverId`]: new ObjectId(actorId),
    [`approvals.${level}.decision`]: 'APPROVED',
    [`approvals.${level}.note`]: note,
    [`approvals.${level}.decidedAt`]: new Date(),
    updatedAt: new Date(),
  };

  // Advance to next level or finalize
  const nextLevel = level + 1;
  if (nextLevel >= request.totalLevels) {
    updates.status = 'APPROVED';
    updates.currentLevel = nextLevel;
  } else {
    updates.currentLevel = nextLevel;
  }

  await col<ApprovalRequestDoc>(COL.approvalRequests).updateOne({ _id: request._id }, { $set: updates });
  await logAction(actorId, 'approval.approve', 'approval', id, { level, note });

  // If fully approved, execute the action
  if (updates.status === 'APPROVED') {
    await executeApprovedAction(request);
  }

  return { id, status: updates.status || 'PENDING', level: nextLevel };
}

// ─────────────────── REJECT REQUEST ──────────────────────────────────────
export async function rejectRequest(actorId: string, id: string, note?: string) {
  const request = await col<ApprovalRequestDoc>(COL.approvalRequests).findOne({ _id: oid(id) });
  if (!request) throw notFound('Approval request not found');
  if (request.status !== 'PENDING') throw badRequest('Request already decided');

  const level = request.currentLevel;
  await col<ApprovalRequestDoc>(COL.approvalRequests).updateOne({ _id: request._id }, {
    $set: {
      [`approvals.${level}.approverId`]: new ObjectId(actorId),
      [`approvals.${level}.decision`]: 'REJECTED',
      [`approvals.${level}.note`]: note,
      [`approvals.${level}.decidedAt`]: new Date(),
      status: 'REJECTED',
      updatedAt: new Date(),
    },
  });

  await logAction(actorId, 'approval.reject', 'approval', id, { level, note });
  return { id, status: 'REJECTED' };
}

// ─────────────────── GET APPROVAL CHAINS ─────────────────────────────────
export async function getApprovalChains() {
  return Object.entries(DEFAULT_CHAINS).map(([type, config]) => ({
    type, levels: config.levels, description: config.description,
  }));
}

// ─────────────────── EXECUTE APPROVED ACTION ─────────────────────────────
async function executeApprovedAction(request: ApprovalRequestDoc) {
  // Execute the action based on approval type
  // This is a hook for future action execution
  // Currently actions are already executed at request time with status pending
  // The approval just changes the status to final APPROVED/REJECTED

  switch (request.type) {
    case 'deposit':
      // Deposit approval - credit the wallet
      if (request.data?.userId && request.data?.amount) {
        await col(COL.wallets).updateOne(
          { userId: oid(request.data.userId as string) },
          { $inc: { balance: request.data.amount as number }, $set: { updatedAt: new Date() } },
        );
      }
      break;
    case 'withdrawal':
      // Withdrawal already handled at withdrawal decision level
      break;
    default:
      // Other types handled by their respective services
      break;
  }
}
