// ============================================================================
//  employee.service.ts — Employee management for the admin panel
// ============================================================================
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { col, COL, oid } from '../../db/collections';
import { UserDoc, EmployeeProfileDoc, AdminActionLogDoc, RoleName } from '../../db/models';
import { badRequest, forbidden, notFound } from '../../common/errors';
import { logAction } from './admin.service';

const USER_PROJECTION = { passwordHash: 0, twoFactorSecret: 0 } as const;

const EMPLOYEE_ROLES: string[] = [
  'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'RISK_MANAGER',
  'COMPLIANCE_OFFICER', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'SALES_MANAGER', 'SALES_AGENT',
  'AFFILIATE_MANAGER', 'MARKETING_MANAGER', 'AUDITOR', 'READ_ONLY_ANALYST',
  'MANAGER', 'EMPLOYEE', 'IB',
];

function clampPage(page?: number, limit?: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(100, Math.max(1, limit ?? 20)) };
}

// ---------------------------------------------------------------------------
//  CREATE EMPLOYEE
// ---------------------------------------------------------------------------
export async function createEmployee(actorId: string, data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleName: RoleName;
  department: string;
  title: string;
  managerId?: string;
}) {
  const email = data.email.trim().toLowerCase();

  // Check if email exists
  if (await col<UserDoc>(COL.users).findOne({ email })) {
    throw badRequest('Email already registered');
  }

  // Validate role is an employee role
  if (!EMPLOYEE_ROLES.includes(data.roleName)) {
    throw badRequest('Invalid employee role');
  }

  const now = new Date();
  const userDoc: UserDoc = {
    email,
    passwordHash: await bcrypt.hash(data.password, 12),
    firstName: data.firstName,
    lastName: data.lastName,
    status: 'ACTIVE',
    emailVerified: true,
    twoFactorEnabled: false,
    roleName: data.roleName,
    referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    referredById: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId: userId } = await col<UserDoc>(COL.users).insertOne(userDoc);

  // Create employee profile
  const profile: EmployeeProfileDoc = {
    userId,
    department: data.department,
    title: data.title,
    managerId: data.managerId ? oid(data.managerId) : null,
    hireDate: now,
    terminationDate: null,
    terminationReason: undefined,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
  await col<EmployeeProfileDoc>(COL.employeeProfiles).insertOne(profile);

  await logAction(actorId, 'employee.create', 'user', userId.toString(), {
    email: data.email, roleName: data.roleName, department: data.department,
  });

  return {
    id: userId.toString(),
    email: userDoc.email,
    firstName: userDoc.firstName,
    lastName: userDoc.lastName,
    roleName: userDoc.roleName,
    status: userDoc.status,
    profile: { department: data.department, title: data.title },
  };
}

// ---------------------------------------------------------------------------
//  LIST EMPLOYEES
// ---------------------------------------------------------------------------
export async function listEmployees(opts: {
  q?: string;
  department?: string;
  status?: string;
  roleName?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit } = clampPage(opts.page, opts.limit);

  const filter: any = { roleName: { $in: EMPLOYEE_ROLES } };

  if (opts.status) filter.status = opts.status;
  if (opts.roleName) filter.roleName = opts.roleName;

  if (opts.q?.trim()) {
    const regex = { $regex: opts.q.trim(), $options: 'i' };
    filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
  }

  const [items, total] = await Promise.all([
    col<UserDoc>(COL.users)
      .find(filter, { projection: USER_PROJECTION })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col<UserDoc>(COL.users).countDocuments(filter),
  ]);

  // Enrich with employee profiles
  const userIds = items.map(u => u._id);
  const profiles = await col<EmployeeProfileDoc>(COL.employeeProfiles)
    .find({ userId: { $in: userIds } })
    .toArray();
  const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

  const enriched = items.map(u => ({
    ...u,
    profile: profileMap.get(u._id!.toString()) || null,
  }));

  return { items: enriched, total, page, limit };
}

// ---------------------------------------------------------------------------
//  GET EMPLOYEE DETAIL
// ---------------------------------------------------------------------------
export async function getEmployeeDetail(id: string) {
  const user = await col<UserDoc>(COL.users).findOne(
    { _id: oid(id) },
    { projection: USER_PROJECTION },
  );
  if (!user) throw notFound('Employee not found');
  if (!EMPLOYEE_ROLES.includes(user.roleName)) throw notFound('User is not an employee');

  const [profile, loginHistory, accounts] = await Promise.all([
    col<EmployeeProfileDoc>(COL.employeeProfiles).findOne({ userId: user._id }),
    col(COL.loginHistory).find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).toArray(),
    col(COL.tradingAccounts).find({ userId: user._id }).toArray(),
  ]);

  return { user, profile, loginHistory, accounts };
}

// ---------------------------------------------------------------------------
//  UPDATE EMPLOYEE
// ---------------------------------------------------------------------------
export async function updateEmployee(actorId: string, id: string, patch: {
  firstName?: string;
  lastName?: string;
  roleName?: RoleName;
  department?: string;
  title?: string;
  managerId?: string | null;
}) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');
  if (!EMPLOYEE_ROLES.includes(user.roleName)) throw notFound('User is not an employee');
  if (user.roleName === 'SUPER_ADMIN' && patch.roleName && patch.roleName !== 'SUPER_ADMIN') {
    throw forbidden('Cannot change super admin role');
  }

  const userPatch: any = { updatedAt: new Date() };
  if (patch.firstName !== undefined) userPatch.firstName = patch.firstName;
  if (patch.lastName !== undefined) userPatch.lastName = patch.lastName;
  if (patch.roleName !== undefined) userPatch.roleName = patch.roleName;

  if (Object.keys(userPatch).length > 1) {
    await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: userPatch });
  }

  const profilePatch: any = { updatedAt: new Date() };
  if (patch.department !== undefined) profilePatch.department = patch.department;
  if (patch.title !== undefined) profilePatch.title = patch.title;
  if (patch.managerId !== undefined) profilePatch.managerId = patch.managerId ? oid(patch.managerId) : null;

  if (Object.keys(profilePatch).length > 1) {
    await col<EmployeeProfileDoc>(COL.employeeProfiles).updateOne(
      { userId: user._id },
      { $set: profilePatch },
      { upsert: true },
    );
  }

  await logAction(actorId, 'employee.update', 'user', id, { patch });
  return { id, ...patch };
}

// ---------------------------------------------------------------------------
//  SUSPEND EMPLOYEE
// ---------------------------------------------------------------------------
export async function suspendEmployee(actorId: string, id: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');
  if (user.roleName === 'SUPER_ADMIN') throw forbidden('Cannot suspend super admin');

  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, {
    $set: { status: 'SUSPENDED', updatedAt: new Date() },
  });
  await col(COL.refreshTokens).updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await logAction(actorId, 'employee.suspend', 'user', id, { from: user.status, to: 'SUSPENDED' });
  return { id, status: 'SUSPENDED' };
}

// ---------------------------------------------------------------------------
//  ACTIVATE EMPLOYEE
// ---------------------------------------------------------------------------
export async function activateEmployee(actorId: string, id: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');

  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, {
    $set: { status: 'ACTIVE', updatedAt: new Date() },
  });
  await logAction(actorId, 'employee.activate', 'user', id, { from: user.status, to: 'ACTIVE' });
  return { id, status: 'ACTIVE' };
}

// ---------------------------------------------------------------------------
//  TERMINATE EMPLOYEE
// ---------------------------------------------------------------------------
export async function terminateEmployee(actorId: string, id: string, reason: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');
  if (user.roleName === 'SUPER_ADMIN') throw forbidden('Cannot terminate super admin');

  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, {
    $set: { status: 'TERMINATED', updatedAt: new Date() },
  });
  await col(COL.refreshTokens).updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await col<EmployeeProfileDoc>(COL.employeeProfiles).updateOne(
    { userId: user._id },
    { $set: { terminationDate: new Date(), terminationReason: reason, updatedAt: new Date() } },
  );
  await logAction(actorId, 'employee.terminate', 'user', id, { reason, from: user.status, to: 'TERMINATED' });
  return { id, status: 'TERMINATED' };
}

// ---------------------------------------------------------------------------
//  RESET EMPLOYEE PASSWORD
// ---------------------------------------------------------------------------
export async function resetEmployeePassword(actorId: string, id: string, newPassword: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');

  const hash = await bcrypt.hash(newPassword, 12);
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, {
    $set: { passwordHash: hash, updatedAt: new Date() },
  });
  await col(COL.refreshTokens).updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await col(COL.securityEvents).insertOne({
    userId: user._id,
    type: 'password_reset_by_admin',
    description: `Password reset by admin ${actorId}`,
    createdAt: new Date(),
  });
  await logAction(actorId, 'employee.reset_password', 'user', id, {});
  return { id, passwordReset: true };
}

// ---------------------------------------------------------------------------
//  FORCE LOGOUT EMPLOYEE
// ---------------------------------------------------------------------------
export async function forceLogoutEmployee(actorId: string, id: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(id) });
  if (!user) throw notFound('Employee not found');

  const { modifiedCount } = await col(COL.refreshTokens).updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await logAction(actorId, 'employee.force_logout', 'user', id, { tokensRevoked: modifiedCount });
  return { id, tokensRevoked: modifiedCount };
}

// ---------------------------------------------------------------------------
//  EMPLOYEE LOGIN HISTORY
// ---------------------------------------------------------------------------
export async function getEmployeeLoginHistory(id: string, page = 1, limit = 20) {
  const p = clampPage(page, limit);
  const filter = { userId: oid(id) };
  const [items, total] = await Promise.all([
    col(COL.loginHistory).find(filter).sort({ createdAt: -1 }).skip((p.page - 1) * p.limit).limit(p.limit).toArray(),
    col(COL.loginHistory).countDocuments(filter),
  ]);
  return { items, total, page: p.page, limit: p.limit };
}

// ---------------------------------------------------------------------------
//  EMPLOYEE DEVICE HISTORY
// ---------------------------------------------------------------------------
export async function getEmployeeDeviceHistory(id: string) {
  return col(COL.deviceHistory)
    .find({ userId: oid(id) })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .toArray();
}

// ---------------------------------------------------------------------------
//  EMPLOYEE ACTIVITY (admin actions)
// ---------------------------------------------------------------------------
export async function getEmployeeActivity(id: string, page = 1, limit = 20) {
  const p = clampPage(page, limit);
  const filter = { actorId: oid(id) };
  const [items, total] = await Promise.all([
    col<AdminActionLogDoc>(COL.adminActionLog).find(filter).sort({ createdAt: -1 }).skip((p.page - 1) * p.limit).limit(p.limit).toArray(),
    col<AdminActionLogDoc>(COL.adminActionLog).countDocuments(filter),
  ]);
  return { items, total, page: p.page, limit: p.limit };
}

// ---------------------------------------------------------------------------
//  EMPLOYEE PERFORMANCE
// ---------------------------------------------------------------------------
export async function getEmployeePerformance(id: string) {
  const userId = oid(id);

  const [
    kycReviewed,
    ticketsHandled,
    withdrawalsProcessed,
    depositsProcessed,
    totalActions,
  ] = await Promise.all([
    col(COL.kyc).countDocuments({ reviewedBy: userId }),
    col(COL.supportTickets).countDocuments({ assignedTo: userId, status: 'RESOLVED' }),
    col(COL.withdrawals).countDocuments({ reviewedBy: userId }),
    col(COL.deposits).countDocuments({ reviewedBy: userId }),
    col<AdminActionLogDoc>(COL.adminActionLog).countDocuments({ actorId: userId }),
  ]);

  // Last 30 days activity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const recentActions = await col<AdminActionLogDoc>(COL.adminActionLog)
    .aggregate([
      { $match: { actorId: userId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

  return {
    kycReviewed,
    ticketsHandled,
    withdrawalsProcessed,
    depositsProcessed,
    totalActions,
    last30Days: recentActions,
  };
}
