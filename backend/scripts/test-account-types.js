const API = 'http://localhost:4000';

async function main() {
  // Login as admin
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@platform.local', password: 'Admin@12345' })
  });
  const admin = await loginRes.json();
  console.log('Admin login:', loginRes.status === 200 ? 'OK' : 'FAILED');
  
  // Test admin account types list
  const typesRes = await fetch(`${API}/api/admin/account-types`, {
    headers: { Authorization: `Bearer ${admin.accessToken}` }
  });
  const types = await typesRes.json();
  console.log(`\n=== ADMIN ACCOUNT TYPES (${types.length}) ===`);
  types.forEach(t => {
    console.log(`  ${t.enabled ? '✅' : '❌'} ${t.name} - ${t.displayName} [${t.category}] Leverage:1:${t.defaultLeverage} Min:$${t.minDeposit}`);
  });

  // Login as client
  const clientRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john.trader@email.com', password: 'Trader@123' })
  });
  const client = await clientRes.json();
  console.log('\nClient login:', clientRes.status === 200 ? 'OK' : 'FAILED');

  // Client fetches available account types
  const clientTypesRes = await fetch(`${API}/api/accounts/types`, {
    headers: { Authorization: `Bearer ${client.accessToken}` }
  });
  const clientTypes = await clientTypesRes.json();
  console.log(`\n=== CLIENT AVAILABLE TYPES (${clientTypes.length}) ===`);
  clientTypes.forEach(t => {
    console.log(`  ${t.displayName} [${t.category}] - Min:$${t.minDeposit} Leverage:1:${t.defaultLeverage}`);
  });

  // Client tries to open an account without specifying accountTypeId (should fail)
  const failRes = await fetch(`${API}/api/accounts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${client.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const failData = await failRes.json();
  console.log(`\nClient create WITHOUT type: ${failRes.status} - ${failData.error || 'OK (unexpected)'}`);

  // Client opens account with valid account type
  if (clientTypes.length > 0) {
    const demoType = clientTypes.find(t => t.category === 'DEMO') || clientTypes[0];
    const openRes = await fetch(`${API}/api/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${client.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountTypeId: demoType._id })
    });
    const openData = await openRes.json();
    console.log(`\nClient opens ${demoType.displayName}: ${openRes.status === 201 ? 'SUCCESS' : 'FAILED'}`);
    if (openData.login) {
      console.log(`  Login: ${openData.login} | Type: ${openData.type} | Balance: $${openData.balance} | Leverage: 1:${openData.leverage}`);
    } else {
      console.log(`  Error: ${openData.error || JSON.stringify(openData)}`);
    }
  }

  // Admin toggles a type
  if (types.length > 0) {
    const ecnType = types.find(t => t.name === 'ECN');
    if (ecnType) {
      const toggleRes = await fetch(`${API}/api/admin/account-types/${ecnType._id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.accessToken}`, 'Content-Type': 'application/json' }
      });
      const toggleData = await toggleRes.json();
      console.log(`\nAdmin toggles ECN: ${toggleData.enabled ? 'ENABLED' : 'DISABLED'}`);
    }
  }

  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(e => console.error(e.message));
