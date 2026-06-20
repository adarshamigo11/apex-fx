/**
 * Comprehensive Login Test for All Users
 * Tests all admin and user logins via API
 * 
 * Run: node scripts/test-all-logins.js
 */

const API_URL = 'http://localhost:4000';

const TEST_USERS = {
  admin: [
    { email: 'admin@platform.local', password: 'Admin@12345', role: 'SUPER_ADMIN', label: 'Super Admin' },
    { email: 'ops.manager@apexfx.com', password: 'OpsMgr@123', role: 'OPERATIONS_MANAGER', label: 'Operations Manager' },
    { email: 'finance.manager@apexfx.com', password: 'FinMgr@123', role: 'FINANCE_MANAGER', label: 'Finance Manager' },
    { email: 'risk.manager@apexfx.com', password: 'RiskMgr@123', role: 'RISK_MANAGER', label: 'Risk Manager' },
    { email: 'support.lead@apexfx.com', password: 'Support@123', role: 'SUPPORT_MANAGER', label: 'Support Manager' },
    { email: 'compliance.officer@apexfx.com', password: 'Comply@123', role: 'COMPLIANCE_OFFICER', label: 'Compliance Officer' },
  ],
  clients: [
    { email: 'john.trader@email.com', password: 'Trader@123', role: 'USER', label: 'John Trader', balance: '$100K' },
    { email: 'sarah.investor@email.com', password: 'Invest@123', role: 'USER', label: 'Sarah Investor', balance: '$250K' },
    { email: 'mike.newbie@email.com', password: 'Newbie@123', role: 'USER', label: 'Mike Newbie', balance: '$50K (Pending)' },
    { email: 'emma.pro@email.com', password: 'Pro@123', role: 'USER', label: 'Emma Pro', balance: '$500K' },
    { email: 'alex.restricted@email.com', password: 'Restricted@123', role: 'USER', label: 'Alex Restricted', balance: '$75K (Restricted)' },
  ]
};

async function testLogin(user) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });

    const data = await response.json();

    if (response.ok && data.accessToken) {
      return {
        success: true,
        user: data.user,
        hasToken: true,
        perms: data.user?.perms?.length || 0,
        message: '✅ Login successful'
      };
    } else {
      return {
        success: false,
        error: data.message || 'Login failed',
        status: response.status,
        message: `❌ ${data.message || 'Login failed'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `❌ Network error: ${error.message}`
    };
  }
}

async function testAdminEndpoint(token, endpoint, label) {
  try {
    const response = await fetch(`${API_URL}/api/admin${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, label, data };
    } else {
      const error = await response.text();
      return { success: false, label, error: error };
    }
  } catch (error) {
    return { success: false, label, error: error.message };
  }
}

async function main() {
  console.log('🧪 ApexFX Comprehensive Login Test');
  console.log('═'.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('═'.repeat(80));
  console.log();

  // Test backend connectivity
  console.log('📡 Testing backend connectivity...');
  try {
    const healthCheck = await fetch(`${API_URL}/health`);
    if (healthCheck.ok) {
      console.log('✅ Backend is running and accessible\n');
    } else {
      console.log('⚠️  Backend returned non-OK status\n');
    }
  } catch (error) {
    console.log(`❌ Backend not accessible: ${error.message}`);
    console.log('\n💡 Make sure backend is running: cd backend && npm run dev\n');
    return;
  }

  // Test Admin Logins
  console.log('👨‍💼 TESTING ADMIN LOGINS');
  console.log('─'.repeat(80));

  const adminResults = [];
  let adminTokens = {};

  for (const user of TEST_USERS.admin) {
    console.log(`\nTesting: ${user.label} (${user.email})`);
    const result = await testLogin(user);
    console.log(`  ${result.message}`);
    
    if (result.success) {
      console.log(`  → Role: ${result.user.role}`);
      console.log(`  → Status: ${result.user.status}`);
      console.log(`  → Permissions: ${result.perms}`);
      adminTokens[user.role] = result.accessToken;
      adminResults.push({ user: user.label, status: '✅ PASS', role: result.user.role });
    } else {
      adminResults.push({ user: user.label, status: '❌ FAIL', error: result.error });
    }
  }

  // Test Client Logins
  console.log('\n\n👥 TESTING CLIENT LOGINS');
  console.log('─'.repeat(80));

  const clientResults = [];
  let clientTokens = {};

  for (const user of TEST_USERS.clients) {
    console.log(`\nTesting: ${user.label} (${user.email})`);
    const result = await testLogin(user);
    console.log(`  ${result.message}`);
    
    if (result.success) {
      console.log(`  → Role: ${result.user.role}`);
      console.log(`  → Status: ${result.user.status}`);
      clientTokens[user.email] = result.accessToken;
      clientResults.push({ user: user.label, status: '✅ PASS', balance: user.balance });
    } else {
      clientResults.push({ user: user.label, status: '❌ FAIL', error: result.error });
    }
  }

  // Test Admin Endpoints with Super Admin
  if (adminTokens['SUPER_ADMIN']) {
    console.log('\n\n🔧 TESTING ADMIN ENDPOINTS (Super Admin)');
    console.log('─'.repeat(80));

    const endpoints = [
      { path: '/employees', label: 'Employees List' },
      { path: '/users', label: 'Users List' },
      { path: '/roles', label: 'Roles List' },
      { path: '/deposits', label: 'Deposits List' },
      { path: '/withdrawals', label: 'Withdrawals List' },
      { path: '/symbols', label: 'Symbols List' },
      { path: '/monitoring/system', label: 'System Health' },
      { path: '/monitoring/stats', label: 'Platform Stats' },
      { path: '/permissions/matrix', label: 'Permissions Matrix' },
      { path: '/audit/log', label: 'Audit Log' },
      { path: '/security-events', label: 'Security Events' },
      { path: '/settings', label: 'Platform Settings' },
    ];

    for (const ep of endpoints) {
      const result = await testAdminEndpoint(adminTokens['SUPER_ADMIN'], ep.path, ep.label);
      console.log(`${result.success ? '✅' : '❌'} ${ep.label}: ${result.success ? 'OK' : result.error.substring(0, 50)}`);
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));

  console.log('\n👨‍💼 ADMIN LOGINS:');
  adminResults.forEach(r => {
    console.log(`  ${r.status} ${r.user} ${r.role ? '(' + r.role + ')' : ''}`);
  });

  console.log('\n👥 CLIENT LOGINS:');
  clientResults.forEach(r => {
    console.log(`  ${r.status} ${r.user} ${r.balance ? '[' + r.balance + ']' : ''}`);
  });

  const totalTests = adminResults.length + clientResults.length;
  const passedTests = [...adminResults, ...clientResults].filter(r => r.status === '✅ PASS').length;
  const failedTests = totalTests - passedTests;

  console.log('\n' + '═'.repeat(80));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('═'.repeat(80));

  if (failedTests === 0) {
    console.log('\n🎉 ALL LOGINS SUCCESSFUL!');
    console.log('\n📧 You can now login to:');
    console.log('   Admin Panel: http://localhost:3000/admin/login');
    console.log('   User Portal: http://localhost:3000/login');
  } else {
    console.log(`\n⚠️  ${failedTests} login(s) failed. Check errors above.`);
  }
}

main().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  process.exit(1);
});
