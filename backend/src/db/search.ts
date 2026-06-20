// Atlas Search helpers using the $search aggregation stage.
import { col, COL } from './collections';

export async function searchUsers(query: string, limit = 20) {
  if (!query.trim()) return [];
  try {
    return await col(COL.users).aggregate([
      { $search: {
        index: 'users_search',
        compound: { should: [
          { autocomplete: { query, path: 'email' } },
          { text: { query, path: ['firstName', 'lastName', 'referralCode'], fuzzy: { maxEdits: 1 } } },
        ] },
      } },
      { $limit: limit },
      { $project: { passwordHash: 0, twoFactorSecret: 0 } },
    ]).toArray();
  } catch {
    // fallback when not on Atlas / index missing
    const rx = new RegExp(query, 'i');
    return col(COL.users).find(
      { $or: [{ email: rx }, { firstName: rx }, { lastName: rx }, { referralCode: rx }] },
      { projection: { passwordHash: 0, twoFactorSecret: 0 }, limit },
    ).toArray();
  }
}

export async function searchSymbols(query: string, limit = 10) {
  if (!query.trim()) return col(COL.symbols).find({ enabled: true }).limit(limit).toArray();
  try {
    return await col(COL.symbols).aggregate([
      { $search: { index: 'symbols_search', text: { query, path: ['name', 'displayName'], fuzzy: { maxEdits: 1 } } } },
      { $match: { enabled: true } }, { $limit: limit },
    ]).toArray();
  } catch {
    const rx = new RegExp(query, 'i');
    return col(COL.symbols).find({ enabled: true, $or: [{ name: rx }, { displayName: rx }] }).limit(limit).toArray();
  }
}
