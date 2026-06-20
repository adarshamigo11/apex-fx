# 🗄️ MongoDB Atlas Database Architecture Report
## ApexFX Forex Paper Trading Platform

**Generated:** 2026-01-16  
**Database:** `apexfx` on Cluster0 (Atlas)  
**Total Collections:** 29  
**Total Documents:** 31  
**Total Indexes:** 79  

---

## 📊 A. CURRENT DATABASE STRUCTURE

### Collections with Data
| Collection | Documents | Storage | Indexes | Purpose |
|------------|-----------|---------|---------|---------|
| `users` | 8 | ~0 MB | 3 | User accounts (email, password, phone, status) |
| `roles` | 14 | ~0 MB | 2 | Permission roles with permission arrays |
| `symbols` | 7 | ~0 MB | 2 | Trading instruments (EUR/USD, GBP/USD, XAU/USD, etc.) |
| `admin_profiles` | 2 | ~0 MB | 2 | Admin user profiles |
| `refresh_tokens` | 6 | ~0 MB | 4 | JWT refresh token management |
| `settings` | 2 | ~0 MB | 1 | Platform configuration |
| `counters` | 1 | ~0 MB | 1 | Auto-increment counters |

### Empty Collections (Ready for Production)
| Collection | Indexes | Purpose |
|------------|---------|---------|
| `ip_history` | 3 | IP address tracking per user |
| `communications` | 3 | Email/SMS/Broadcast logs |
| `approval_requests` | 4 | Multi-level approval workflow |
| `notifications` | 2 | User notification queue |
| `otps` | 3 | OTP codes for authentication |
| `login_history` | 3 | Login attempt tracking |
| `security_events` | 3 | Security event audit trail |
| `employee_profiles` | 4 | Employee HR data |
| `employee_sessions` | 3 | Employee session management |
| `employee_activity_logs` | 2 | Employee action audit trail |
| `audit_logs` | 3 | System-wide audit trail |
| `market_config` | 2 | Market trading configuration |
| `risk_rules` | 3 | Risk management rules |
| `trading_sessions` | 2 | Symbol trading hours |
| `candles` | 2 | OHLCV historical data |
| `kyc` | 3 | KYC document submissions |
| `device_history` | 2 | Device fingerprint tracking |
| `deposits` | 3 | Deposit requests |
| `withdrawals` | 3 | Withdrawal requests |
| `trade_history` | 2 | Closed position history |
| `positions` | 3 | Open trading positions |
| `trading_accounts` | 3 | Demo trading accounts |
| `wallets` | 1 | User wallet balances |
| `feed_providers` | 2 | Market data feed sources |

---

## 🚨 B. PROBLEMS FOUND

### Critical Issues
1. **Missing Standard Fields** - 29 collections missing `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `status`, `isDeleted`
2. **Incomplete Schema Standardization** - Collections have inconsistent field naming
3. **Missing Indexes** - 9 recommended indexes not created
4. **Orphaned References** - `admin_profiles.userId`, `employee_profiles.userId` may reference non-existent users
5. **No Soft Delete Implementation** - No `isDeleted` field on any collection

### Moderate Issues
1. **Empty Collections** - 22 out of 29 collections are empty (acceptable for new platform)
2. **No Relationship Enforcement** - ObjectId references not validated at database level
3. **Missing Collections** - 48 collections from ideal schema not present
4. **Inconsistent Timestamps** - Some collections use `createdAt`, others use different names

### Minor Issues
1. **Index Optimization** - Some indexes could be compound for better performance
2. **No TTL Indexes** - `otps`, `refresh_tokens`, `sessions` should auto-expire
3. **No Text Indexes** - Search functionality needs text indexes

---

## 📐 C. RECOMMENDED COLLECTION STRUCTURE

*(Full schema details in migration scripts below)*

---

## 🔄 D. COLLECTION RENAME MAP

| Current Name | New Name | Reason |
|--------------|----------|--------|
| `kyc` | `user_kyc` | Module consistency |
| `wallets` | `user_wallets` | Module consistency |
| `device_history` | `user_devices` | Module consistency |
| `symbols` | `instruments` | Industry standard naming |
| `market_config` | `market_status` | More descriptive |
| `feed_providers` | `price_feeds` | More descriptive |
| `risk_rules` | `exposure_rules` | More specific |
| `roles` | `admin_roles` | Module separation |
| `employee_activity_logs` | `admin_activity_logs` | Role alignment |

---

## 📝 E. MIGRATION PLAN

### Phase 1: Backup (CRITICAL - Run First)
```javascript
// Use MongoDB Atlas Backup or mongodump
// Command: mongodump --uri="mongodb://..." --db=apexfx --out=./backup-2026-01-16
```

### Phase 2: Schema Standardization (Non-Destructive)
```javascript
// Add standard fields to all collections
db.getCollectionNames().forEach(collection => {
  if (!['system.indexes', 'system.js'].includes(collection)) {
    db.getCollection(collection).updateMany(
      { createdAt: { $exists: false } },
      {
        $set: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          updatedBy: null,
          status: 'ACTIVE',
          isDeleted: false
        }
      }
    );
    print(`✅ Added standard fields to ${collection}`);
  }
});
```

### Phase 3: Collection Renames (Zero Downtime)
```javascript
db.adminCommand({ renameCollection: "apexfx.kyc", to: "apexfx.user_kyc" });
db.adminCommand({ renameCollection: "apexfx.wallets", to: "apexfx.user_wallets" });
db.adminCommand({ renameCollection: "apexfx.device_history", to: "apexfx.user_devices" });
db.adminCommand({ renameCollection: "apexfx.symbols", to: "apexfx.instruments" });
db.adminCommand({ renameCollection: "apexfx.market_config", to: "apexfx.market_status" });
db.adminCommand({ renameCollection: "apexfx.feed_providers", to: "apexfx.price_feeds" });
db.adminCommand({ renameCollection: "apexfx.risk_rules", to: "apexfx.exposure_rules" });
db.adminCommand({ renameCollection: "apexfx.roles", to: "apexfx.admin_roles" });
db.adminCommand({ renameCollection: "apexfx.employee_activity_logs", to: "apexfx.admin_activity_logs" });
```

### Phase 4: Create New Collections
```javascript
const newCollections = [
  'user_profiles', 'user_sessions', 'user_activity_logs',
  'transactions', 'wallet_transfers', 'payment_methods',
  'asset_categories', 'leverage_rules', 'margin_rules',
  'risk_alerts', 'tickets', 'ticket_messages', 'ticket_attachments',
  'email_logs', 'sms_logs', 'push_logs',
  'affiliates', 'referrals', 'commissions',
  'activity_logs', 'system_events', 'permissions', 'admins'
];

newCollections.forEach(collection => {
  db.createCollection(collection);
  print(`✅ Created ${collection}`);
});
```

### Phase 5: Index Optimization (Background)
```javascript
// High-priority indexes
db.users.createIndex({ email: 1 }, { background: true, unique: true });
db.users.createIndex({ status: 1 }, { background: true });
db.users.createIndex({ createdAt: -1 }, { background: true });

db.user_kyc.createIndex({ userId: 1 }, { background: true, unique: true });

db.user_wallets.createIndex({ userId: 1 }, { background: true, unique: true });

db.deposits.createIndex({ transactionId: 1 }, { background: true, unique: true });

// TTL indexes
db.otps.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300, background: true });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });

// Text indexes
db.users.createIndex({ email: "text", phone: "text" }, { background: true });
db.instruments.createIndex({ name: "text", displayName: "text" }, { background: true });
```

### Phase 6: Validation
```javascript
db.getCollectionNames().forEach(collection => {
  const indexes = db.getCollection(collection).getIndexes();
  const count = db.getCollection(collection).countDocuments();
  print(`${collection}: ${count} docs, ${indexes.length} indexes`);
});
```

---

## 🔒 F. SECURITY RECOMMENDATIONS

1. ✅ JWT access/refresh tokens implemented
2. ✅ Role-based permissions (60+ permissions)
3. ⚠️ Add password complexity requirements
4. ⚠️ Implement account lockout after 5 failed attempts
5. ⚠️ Add 2FA for admin accounts
6. ⚠️ Encrypt sensitive fields (phone, API keys)
7. ⚠️ Enable MongoDB Atlas encryption at rest
8. ⚠️ Enable Atlas continuous backup
9. ⚠️ Set up monitoring alerts
10. ⚠️ Restrict database access to application servers only

---

## 📊 G. SUMMARY

| Metric | Current | Target |
|--------|---------|--------|
| Collections | 29 | 66 |
| With Data | 7 | 66 |
| Total Documents | 31 | ~10,000+ (production) |
| Total Indexes | 79 | ~200 |
| Standard Fields Coverage | 0% | 100% |
| TTL Indexes | 0 | 3 |
| Text Indexes | 0 | 3 |

---

**Status:** ✅ Audit Complete - Ready for Migration  
**Next Steps:** Review report → Approve migration plan → Execute phases sequentially  
**Estimated Time:** 6-8 hours total (can be split across multiple sessions)

