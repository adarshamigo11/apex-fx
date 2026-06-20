# MongoDB Atlas Migration Guide

## Overview

This migration will transform your MongoDB Atlas database from the current structure to a professional, enterprise-grade architecture with:

- ✅ Standardized schemas across all collections
- ✅ Consistent naming conventions
- ✅ Optimized indexes for performance
- ✅ Proper module organization
- ✅ TTL indexes for auto-expiry
- ✅ Text indexes for search functionality

## Current State

| Metric | Value |
|--------|-------|
| Collections | 29 |
| With Data | 7 |
| Total Documents | 31 |
| Total Indexes | 79 |
| Standard Fields Coverage | 0% |

## Target State

| Metric | Value |
|--------|-------|
| Collections | 66 |
| Total Documents | 31 (preserved) |
| Total Indexes | ~200 |
| Standard Fields Coverage | 100% |
| TTL Indexes | 3 |
| Text Indexes | 3 |

---

## Migration Phases

### Phase 1: Schema Standardization
**What it does:** Adds standard fields to all existing collections
- `createdAt`: Timestamp when document was created
- `updatedAt`: Timestamp when document was last updated
- `createdBy`: ObjectId reference to creator
- `updatedBy`: ObjectId reference to last updater
- `status`: Document status (default: 'ACTIVE')
- `isDeleted`: Soft delete flag (default: false)

**Risk:** LOW - Non-destructive, only adds fields  
**Duration:** ~5 minutes  
**Downtime:** None

**Run:**
```bash
node scripts/migrate-phase1.js
```

---

### Phase 2: Collection Renames
**What it does:** Renames collections to follow naming conventions

| Current Name | New Name | Reason |
|--------------|----------|--------|
| `kyc` | `user_kyc` | Module consistency |
| `wallets` | `user_wallets` | Module consistency |
| `device_history` | `user_devices` | Module consistency |
| `symbols` | `instruments` | Industry standard |
| `market_config` | `market_status` | More descriptive |
| `feed_providers` | `price_feeds` | More descriptive |
| `risk_rules` | `exposure_rules` | More specific |
| `roles` | `admin_roles` | Module separation |
| `employee_activity_logs` | `admin_activity_logs` | Role alignment |

**Risk:** LOW - Atomic operations, zero data loss  
**Duration:** ~5 minutes  
**Downtime:** Brief (requires code update after)

**Run:**
```bash
node scripts/migrate-phase2.js
```

**⚠️ IMPORTANT:** After running this phase, you MUST update the application code to use the new collection names.

---

### Phase 3: Create Missing Collections
**What it does:** Creates 28 new collections with proper indexes

**New Collections:**
- User Management: `user_profiles`, `user_sessions`, `user_activity_logs`
- Finance: `transactions`, `wallet_transfers`, `payment_methods`
- Market Operations: `asset_categories`, `leverage_rules`, `margin_rules`
- Risk Management: `risk_alerts`
- Support: `tickets`, `ticket_messages`, `ticket_attachments`
- Notifications: `email_logs`, `sms_logs`, `push_logs`
- Affiliate System: `affiliates`, `referrals`, `commissions`
- System: `activity_logs`, `system_events`, `permissions`, `admins`

**Risk:** LOW - Creates new empty collections only  
**Duration:** ~10 minutes  
**Downtime:** None

**Run:**
```bash
node scripts/migrate-phase3.js
```

---

### Phase 4: Index Optimization
**What it does:** Adds missing indexes to existing collections for better performance

**Key Indexes Added:**
- Unique indexes on `email`, `transactionId`, `login`
- Compound indexes for common queries
- TTL indexes for auto-expiring documents (OTPs, sessions, tokens)
- Text indexes for search functionality

**Risk:** LOW - Background index creation  
**Duration:** ~15 minutes (depends on data size)  
**Downtime:** None (background creation)

**Run:**
```bash
node scripts/migrate-phase4.js
```

---

## Running the Migration

### Option 1: Run All Phases (Recommended for First Time)
```bash
node scripts/migrate-all.js
```

### Option 2: Run Individual Phases
```bash
node scripts/migrate-phase1.js
node scripts/migrate-phase2.js
node scripts/migrate-phase3.js
node scripts/migrate-phase4.js
```

### Option 3: Dry Run (Preview Only)
```bash
node scripts/migrate-all.js --dry-run
```

### Option 4: Run Specific Phase
```bash
node scripts/migrate-all.js --phase=1
node scripts/migrate-all.js --phase=2
```

---

## Pre-Migration Checklist

- [ ] **Create MongoDB Atlas Backup** (CRITICAL)
  - Go to Atlas → Clusters → Backup → Create Backup
  - Or run: `mongodump --uri="mongodb://..." --db=apexfx --out=./backup`
  
- [ ] **Test in Staging Environment First**
  - Run migration on a copy of your production database
  
- [ ] **Schedule Maintenance Window**
  - Phase 2 requires brief downtime for code update
  - Total estimated time: 30-45 minutes
  
- [ ] **Notify Team**
  - Let developers know about the migration
  - Coordinate code updates for Phase 2
  
- [ ] **Verify MongoDB Connection**
  - Ensure `.env` file has correct `MONGODB_URI`
  - Test connection: `node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI).then(() => console.log('OK'))"`

---

## Post-Migration Checklist

### After Phase 1
- [ ] Verify all collections have standard fields
- [ ] Run: `node scripts/audit-database.js` to verify

### After Phase 2
- [ ] Update all collection references in application code
- [ ] Update database models in `backend/src/db/models.ts`
- [ ] Update database indexes in `backend/src/db/indexes.ts`
- [ ] Update collection names in `backend/src/db/collections.ts`
- [ ] Test all API endpoints
- [ ] Test admin panel pages

### After Phase 3
- [ ] Verify all new collections were created
- [ ] Verify indexes were created correctly

### After Phase 4
- [ ] Monitor query performance in Atlas
- [ ] Check for slow queries
- [ ] Verify TTL indexes are working (documents auto-expire)

---

## Rollback Plan

If something goes wrong:

### Option 1: Restore from Atlas Backup
1. Go to Atlas → Clusters → Backup
2. Select the backup created before migration
3. Click "Restore"
4. Wait for restore to complete

### Option 2: Manual Rollback
1. **Phase 1:** No rollback needed (additive only)
2. **Phase 2:** Run reverse renames:
   ```javascript
   db.adminCommand({ renameCollection: "apexfx.user_kyc", to: "apexfx.kyc" });
   // ... (reverse all renames)
   ```
3. **Phase 3:** Delete new collections (if needed):
   ```javascript
   db.user_profiles.drop();
   // ... (drop new collections)
   ```
4. **Phase 4:** Remove new indexes (if needed):
   ```javascript
   db.users.dropIndex("email_1");
   // ... (drop new indexes)
   ```

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/audit-database.js` | Database audit and analysis |
| `scripts/migrate-phase1.js` | Schema standardization |
| `scripts/migrate-phase2.js` | Collection renames |
| `scripts/migrate-phase3.js` | Create missing collections |
| `scripts/migrate-phase4.js` | Index optimization |
| `scripts/migrate-all.js` | Master orchestration script |
| `docs/MONGODB_ATLAS_ARCHITECTURE_REPORT.md` | Full architecture report |

---

## Database Structure After Migration

```
apexfx/
├── 👤 User Management (7)
│   ├── users
│   ├── user_profiles (new)
│   ├── user_kyc (renamed from kyc)
│   ├── user_wallets (renamed from wallets)
│   ├── user_sessions (new)
│   ├── user_devices (renamed from device_history)
│   └── user_activity_logs (new)
│
├── 👨‍💼 Admin & Employee (5)
│   ├── admins (new)
│   ├── admin_roles (renamed from roles)
│   ├── admin_permissions (new)
│   ├── admin_activity_logs (renamed from employee_activity_logs)
│   └── employee_profiles
│
├── 💰 Finance (5)
│   ├── deposits
│   ├── withdrawals
│   ├── transactions (new)
│   ├── wallet_transfers (new)
│   └── payment_methods (new)
│
├── 📊 Market Operations (5)
│   ├── instruments (renamed from symbols)
│   ├── asset_categories (new)
│   ├── trading_sessions
│   ├── market_status (renamed from market_config)
│   └── price_feeds (renamed from feed_providers)
│
├── ⚠️ Risk Management (4)
│   ├── leverage_rules (new)
│   ├── margin_rules (new)
│   ├── exposure_rules (renamed from risk_rules)
│   └── risk_alerts (new)
│
├── 🎫 Support (3)
│   ├── tickets (new)
│   ├── ticket_messages (new)
│   └── ticket_attachments (new)
│
├── 📬 Notifications (4)
│   ├── notifications
│   ├── email_logs (new)
│   ├── sms_logs (new)
│   └── push_logs (new)
│
├── 🤝 Affiliate System (3)
│   ├── affiliates (new)
│   ├── referrals (new)
│   └── commissions (new)
│
├── ⚙️ System (4)
│   ├── settings
│   ├── audit_logs
│   ├── activity_logs (new)
│   └── system_events (new)
│
└── 🔐 Security & Auth (6)
    ├── otps
    ├── refresh_tokens
    ├── login_history
    ├── ip_history
    ├── security_events
    └── counters

Total: 46 collections (17 renamed, 28 new, 1 unchanged)
```

---

## Support

If you encounter issues during migration:

1. Check the migration output for specific error messages
2. Verify your MongoDB Atlas connection string
3. Ensure you have proper database permissions
4. Restore from backup if needed
5. Review the architecture report: `docs/MONGODB_ATLAS_ARCHITECTURE_REPORT.md`

---

## Next Steps After Migration

1. **Update Application Code**
   - Update collection references in models
   - Update index definitions
   - Update collection name constants

2. **Test Thoroughly**
   - Run all API endpoints
   - Test admin panel pages
   - Verify data integrity

3. **Monitor Performance**
   - Check Atlas query profiler
   - Monitor slow queries
   - Verify index usage

4. **Implement Missing Features**
   - Affiliate system
   - Support ticket system
   - Enhanced notifications
   - Advanced risk management

---

**Migration Version:** 1.0  
**Generated:** 2026-01-16  
**Status:** Ready for Execution
