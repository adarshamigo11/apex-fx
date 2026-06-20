/**
 * MongoDB Atlas Migration Master Script
 * 
 * Runs all migration phases in sequence:
 * Phase 1: Schema Standardization (Add standard fields)
 * Phase 2: Collection Renames (Zero downtime)
 * Phase 3: Create Missing Collections (with indexes)
 * Phase 4: Index Optimization (Background indexes)
 * 
 * Usage:
 *   node scripts/migrate-all.js              # Run all phases
 *   node scripts/migrate-all.js --phase=1    # Run only Phase 1
 *   node scripts/migrate-all.js --dry-run    # Preview without executing
 */

const { execSync } = require('child_process');
const path = require('path');

const phases = [
  { id: 1, name: 'Schema Standardization', script: 'migrate-phase1.js', description: 'Add createdAt, updatedAt, status, isDeleted to all collections' },
  { id: 2, name: 'Collection Renames', script: 'migrate-phase2.js', description: 'Rename collections to follow naming conventions' },
  { id: 3, name: 'Create Missing Collections', script: 'migrate-phase3.js', description: 'Create new collections with proper indexes' },
  { id: 4, name: 'Index Optimization', script: 'migrate-phase4.js', description: 'Add missing indexes for better performance' },
];

function runPhase(phaseId) {
  const phase = phases.find(p => p.id === phaseId);
  if (!phase) {
    console.error(`❌ Phase ${phaseId} not found`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📦 PHASE ${phase.id}: ${phase.name}`);
  console.log(`   ${phase.description}`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    const scriptPath = path.join(__dirname, phase.script);
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`\n✅ Phase ${phase.id} completed successfully`);
    return true;
  } catch (error) {
    console.error(`\n❌ Phase ${phase.id} failed:`, error.message);
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    phase: null,
    dryRun: false,
  };

  args.forEach(arg => {
    if (arg.startsWith('--phase=')) {
      config.phase = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    }
  });

  return config;
}

function main() {
  const config = parseArgs();

  console.log('🗄️  MongoDB Atlas Migration Master Script');
  console.log('═'.repeat(80));
  console.log('\nAvailable Phases:');
  phases.forEach(phase => {
    console.log(`  ${phase.id}. ${phase.name}`);
    console.log(`     ${phase.description}`);
  });
  console.log();

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
    console.log('Phases that would run:');
    if (config.phase) {
      const phase = phases.find(p => p.id === config.phase);
      console.log(`  - Phase ${phase.id}: ${phase.name} (${phase.script})`);
    } else {
      phases.forEach(phase => {
        console.log(`  - Phase ${phase.id}: ${phase.name} (${phase.script})`);
      });
    }
    console.log('\n✅ Dry run complete');
    return;
  }

  if (config.phase) {
    // Run specific phase
    const success = runPhase(config.phase);
    if (!success) {
      console.error('\n💥 Migration aborted due to errors');
      process.exit(1);
    }
  } else {
    // Run all phases
    console.log('⚠️  Running ALL phases sequentially');
    console.log('⚠️  This may take 10-15 minutes');
    console.log('⚠️  Ensure you have a backup before proceeding\n');

    const results = [];
    let allSuccess = true;

    for (const phase of phases) {
      const success = runPhase(phase.id);
      results.push({ phase: phase.id, success });
      
      if (!success) {
        allSuccess = false;
        console.error(`\n⚠️  Phase ${phase.id} failed. Continuing anyway...`);
      }
    }

    // Final summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 FINAL MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    results.forEach(r => {
      console.log(`${r.success ? '✅' : '❌'} Phase ${r.phase}: ${r.success ? 'SUCCESS' : 'FAILED'}`);
    });

    if (allSuccess) {
      console.log('\n🎉 All phases completed successfully!');
    } else {
      console.log('\n⚠️  Some phases failed. Review the output above.');
    }
  }
}

main();
