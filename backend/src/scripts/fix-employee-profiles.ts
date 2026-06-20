/**
 * Add employee profiles to existing admin users
 * Run: npx ts-node src/scripts/fix-employee-profiles.ts
 */

import { ObjectId } from 'mongodb';
import { connectMongo, closeMongo } from '../config/mongo';
import { col, COL } from '../db/collections';

async function main() {
  await connectMongo();
  console.log('🔧 Adding employee profiles to existing admin users...\n');

  // Get all users with employee roles but no employee profile
  const EMPLOYEE_ROLES = [
    'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'RISK_MANAGER',
    'COMPLIANCE_OFFICER', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'SALES_MANAGER', 'SALES_AGENT',
    'AFFILIATE_MANAGER', 'MARKETING_MANAGER', 'AUDITOR', 'READ_ONLY_ANALYST',
    'MANAGER', 'EMPLOYEE', 'IB',
  ];

  const adminUsers = await col(COL.users).find({
    roleName: { $in: EMPLOYEE_ROLES }
  }).toArray();

  console.log(`Found ${adminUsers.length} admin/employee users`);

  const existingProfiles = await col(COL.employeeProfiles).find({}).toArray();
  const userIdsWithProfiles = new Set(existingProfiles.map(p => p.userId.toString()));

  let created = 0;
  let skipped = 0;

  for (const user of adminUsers) {
    const userId = user._id!.toString();
    
    if (userIdsWithProfiles.has(userId)) {
      console.log(`  ⏭️  ${user.firstName} ${user.lastName} - already has profile`);
      skipped++;
      continue;
    }

    const department = user.roleName.replace('_MANAGER', '').replace('_OFFICER', '').replace(/_/g, ' ');
    const title = user.roleName.replace(/_/g, ' ').toLowerCase();

    await col(COL.employeeProfiles).insertOne({
      userId: user._id,
      department,
      title,
      status: 'ACTIVE',
      createdAt: user.createdAt || new Date(),
      updatedAt: new Date(),
    });

    console.log(`  ✅ Created profile for ${user.firstName} ${user.lastName} (${user.roleName})`);
    created++;
  }

  console.log(`\n✅ Done! Created ${created} profiles, skipped ${skipped}`);
  await closeMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
