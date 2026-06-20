import { ObjectId } from 'mongodb';
import { col, COL } from '../../db/collections';
import { DepositDoc, WithdrawalDoc } from '../../db/models';
import { badRequest } from '../../common/errors';

export async function getWallet(userId: string) {
  const wallet = await col(COL.wallets).findOne({ userId: new ObjectId(userId) });
  if (wallet) return wallet;
  const created = { userId: new ObjectId(userId), balance: 0, currency: 'USD', updatedAt: new Date() };
  await col(COL.wallets).insertOne(created);
  return created;
}

export async function deposit(userId: string, amount: number) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw badRequest('Amount must be positive');
  const wallet = await getWallet(userId);
  const nextBalance = Number(wallet.balance ?? 0) + value;
  await col(COL.wallets).updateOne({ _id: wallet._id }, { $set: { balance: nextBalance, updatedAt: new Date() } });
  const deposit: DepositDoc = {
    userId: new ObjectId(userId), amount: value, currency: 'USD',
    status: 'APPROVED', createdAt: new Date(), updatedAt: new Date(),
  };
  await col<DepositDoc>(COL.deposits).insertOne(deposit);
  return { ok: true, balance: nextBalance, amount: value };
}

// Withdrawals are held (funds deducted immediately) pending admin review —
// see admin.service.decideWithdrawal for approve/reject (refund on reject).
export async function withdraw(userId: string, amount: number) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw badRequest('Amount must be positive');
  const wallet = await getWallet(userId);
  const current = Number(wallet.balance ?? 0);
  if (current < value) throw badRequest('Insufficient funds');
  const nextBalance = current - value;
  await col(COL.wallets).updateOne({ _id: wallet._id }, { $set: { balance: nextBalance, updatedAt: new Date() } });
  const withdrawal: WithdrawalDoc = {
    userId: new ObjectId(userId), amount: value, currency: 'USD',
    status: 'PENDING', createdAt: new Date(), updatedAt: new Date(),
  };
  const { insertedId } = await col<WithdrawalDoc>(COL.withdrawals).insertOne(withdrawal);
  return { ok: true, balance: nextBalance, amount: value, withdrawalId: insertedId.toString(), status: 'PENDING' };
}
