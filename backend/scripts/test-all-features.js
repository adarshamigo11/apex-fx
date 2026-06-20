/**
 * Comprehensive Feature Test Script
 * Tests admin login, user login, and all major features
 * 
 * Run: node scripts/test-all-features.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

// Test credentials
const TEST_USERS = {
  superAdmin: { email: 'admin@platform.local', password: 'Admin@12345' },
  opsManager: { email: 'ops.manager@apexfx.com', password: 'OpsMgr@123' },
  financeManager: { email: 'finance.manager@apexfx.com', password: 'FinMgr@123' },
  riskManager: { email: 'risk.manager@apexfx.com', password: 'RiskMgr@123' },
  supportManager: { email: 'support.lead@apexfx.com', password: 'Support@123' },
  complianceOfficer: { email: 'compliance.officer@apexfx.com', password: 'Comply@123' },
  client1: { email: 'john.trader@email.com', password: 'Trader@123' },
  client2: { email: 'sarah.investor@email.com', password: 'Invest@123' },
  client3: { email: 'mike.newbie@email.com', password: 'Newbie@123' },
  client4: { email: 'emma.pro@email.com', password: 'Pro@123' },
  client5: { email: 'alex.restricted@email.com', password: 'Restricted@123' },
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

async function test(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: '✅ PASS' });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: '❌ FAIL', error: error.message });
    console.log(`  ❌ ${name}: ${error.message}`);
  }
}

async function login(credentials) {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  return response.data;
}

async function get(endpoint, token) {
  const response = await axios.get(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function main() {
  console.log('🧪 ApexFX Feature Test Suite');
  console.log('═'.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('═'.repeat(80));
  console.log();

  // ─────────────────── TEST 1: Admin Login ───────────────────
  console.log('📋 TEST 1: Admin Authentication');
  console.log('─'.repeat(60));

  let superAdminToken;
  await test('Super Admin login', async () => {
    const result = await login(TEST_USERS.superAdmin);
    if (!result.accessToken) throw new Error('No access token');
    if (result.user.role !== 'SUPER_ADMIN') throw new Error('Wrong role');
    superAdminToken = result.accessToken;
  });

  let opsManagerToken;
  await test('Operations Manager login', async () => {
    const result = await login(TEST_USERS.opsManager);
    if (!result.accessToken) throw new Error('No access token');
    if (result.user.role !== 'OPERATIONS_MANAGER') throw new Error('Wrong role');
    opsManagerToken = result.accessToken;
  });

  let financeManagerToken;
  await test('Finance Manager login', async () => {
    const result = await login(TEST_USERS.financeManager);
    if (!result.accessToken) throw new Error('No access token');
    financeManagerToken = result.accessToken;
  });

  let riskManagerToken;
  await test('Risk Manager login', async () => {
    const result = await login(TEST_USERS.riskManager);
    if (!result.accessToken) throw new Error('No access token');
    riskManagerToken = result.accessToken;
  });

  let supportManagerToken;
  await test('Support Manager login', async () => {
    const result = await login(TEST_USERS.supportManager);
    if (!result.accessToken) throw new Error('No access token');
    supportManagerToken = result.accessToken;
  });

  let complianceToken;
  await test('Compliance Officer login', async () => {
    const result = await login(TEST_USERS.complianceOfficer);
    if (!result.accessToken) throw new Error('No access token');
    complianceToken = result.accessToken;
  });

  // ─────────────────── TEST 2: User Login ───────────────────
  console.log('\n📋 TEST 2: User Authentication');
  console.log('─'.repeat(60));

  let client1Token;
  await test('Client 1 (John Trader) login', async () => {
    const result = await login(TEST_USERS.client1);
    if (!result.accessToken) throw new Error('No access token');
    if (result.user.status !== 'ACTIVE') throw new Error('User not active');
    client1Token = result.accessToken;
  });

  let client2Token;
  await test('Client 2 (Sarah Investor) login', async () => {
    const result = await login(TEST_USERS.client2);
    if (!result.accessToken) throw new Error('No access token');
    client2Token = result.accessToken;
  });

  await test('Client 3 (Mike Newbie - Pending) login', async () => {
    const result = await login(TEST_USERS.client3);
    if (!result.accessToken) throw new Error('No access token');
    if (result.user.status !== 'PENDING') throw new Error('User should be pending');
  });

  await test('Client 4 (Emma Pro) login', async () => {
    const result = await login(TEST_USERS.client4);
    if (!result.accessToken) throw new Error('No access token');
  });

  await test('Client 5 (Alex Restricted) login - should fail', async () => {
    try {
      await login(TEST_USERS.client5);
      throw new Error('Should have failed');
    } catch (error) {
      // Expected to fail
      if (!error.response || error.response.status !== 401) {
        throw new Error('Should return 401');
      }
    }
  });

  // ─────────────────── TEST 3: Admin Panel Features ───────────────────
  console.log('\n📋 TEST 3: Admin Panel Features (Super Admin)');
  console.log('─'.repeat(60));

  await test('Get users list', async () => {
    const result = await get('/admin/users?page=1&limit=10', superAdminToken);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} users`);
  });

  await test('Get roles list', async () => {
    const result = await get('/admin/roles', superAdminToken);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} roles`);
  });

  await test('Get deposits list', async () => {
    const result = await get('/admin/deposits?page=1&limit=10', superAdminToken);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} deposits`);
  });

  await test('Get withdrawals list', async () => {
    const result = await get('/admin/withdrawals?page=1&limit=10', superAdminToken);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} withdrawals`);
  });

  await test('Get symbols list', async () => {
    const result = await get('/admin/symbols', superAdminToken);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} symbols`);
  });

  await test('Get monitoring stats', async () => {
    const result = await get('/admin/monitoring/stats', superAdminToken);
    if (!result) throw new Error('Invalid response');
    console.log(`     → Stats retrieved`);
  });

  await test('Get audit logs', async () => {
    const result = await get('/admin/audit-log?page=1&limit=10', superAdminToken);
    if (!result.data) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length || 0} audit logs`);
  });

  await test('Get permissions matrix', async () => {
    const result = await get('/admin/permissions/matrix', superAdminToken);
    if (!result.data) throw new Error('Invalid response');
    console.log(`     → Permissions matrix retrieved`);
  });

  // ─────────────────── TEST 4: Market Data ───────────────────
  console.log('\n📋 TEST 4: Market Data Features');
  console.log('─'.repeat(60));

  await test('Get symbols (public)', async () => {
    const result = await get('/marketdata/symbols');
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} symbols`);
  });

  await test('Get prices (public)', async () => {
    const result = await get('/marketdata/prices');
    if (!result.data) throw new Error('Invalid response');
    console.log(`     → Retrieved ${Object.keys(result.data).length} prices`);
  });

  // ─────────────────── TEST 5: User Dashboard ───────────────────
  console.log('\n📋 TEST 5: User Dashboard Features');
  console.log('─'.repeat(60));

  await test('Get user wallet balance', async () => {
    const result = await get('/wallet/balance', client1Token);
    if (!result.balance) throw new Error('No balance');
    console.log(`     → Balance: $${result.balance.toLocaleString()}`);
  });

  await test('Get user trading accounts', async () => {
    const result = await get('/accounts', client1Token);
    if (!result.data || !Array.isArray(result.data)) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length} accounts`);
  });

  await test('Get user positions', async () => {
    const result = await get('/trading/positions', client1Token);
    if (!result.data) throw new Error('Invalid response');
    console.log(`     → Found ${result.data.length || 0} positions`);
  });

  // ─────────────────── TEST 6: Role-Based Access Control ───────────────────
  console.log('\n📋 TEST 6: Role-Based Access Control');
  console.log('─'.repeat(60));

  await test('Finance Manager can access deposits', async () => {
    const result = await get('/admin/deposits?page=1&limit=10', financeManagerToken);
    if (!result.data) throw new Error('Access denied');
    console.log(`     → Finance Manager has deposit access`);
  });

  await test('Risk Manager can access market config', async () => {
    const result = await get('/admin/market/config', riskManagerToken);
    if (!result.data) throw new Error('Access denied');
    console.log(`     → Risk Manager has market access`);
  });

  await test('Support Manager can access support tickets', async () => {
    const result = await get('/admin/support?page=1&limit=10', supportManagerToken);
    if (!result.data) throw new Error('Access denied');
    console.log(`     → Support Manager has ticket access`);
  });

  // ─────────────────── SUMMARY ───────────────────
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📦 Total: ${testResults.passed + testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === '❌ FAIL')
      .forEach(t => {
        console.log(`   - ${t.name}: ${t.error}`);
      });
  }

  console.log('\n' + '═'.repeat(80));
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${testResults.failed} test(s) failed`);
  }
  console.log('═'.repeat(80));
}

main().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  console.log('\n💡 Make sure the backend is running on http://localhost:4000');
  process.exit(1);
});
