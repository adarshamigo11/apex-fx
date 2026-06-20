const http = require('http');

async function test() {
  // Login
  const loginData = JSON.stringify({
    email: 'admin@platform.local',
    password: 'Admin@12345'
  });

  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginData
  });

  const loginJson = await loginRes.json();
  console.log('Login success:', !!loginJson.accessToken);
  console.log('User role:', loginJson.user?.role);
  console.log('Token perms (first 5):', loginJson.user?.perms?.slice(0, 5));
  console.log('Has settings.view:', loginJson.user?.perms?.includes('settings.view'));
  console.log('Has employee.view:', loginJson.user?.perms?.includes('employee.view'));

  const token = loginJson.accessToken;

  // Test system health
  const healthRes = await fetch('http://localhost:4000/api/admin/monitoring/system', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\nSystem health status:', healthRes.status);
  if (healthRes.status === 200) {
    const healthJson = await healthRes.json();
    console.log('System health OK:', !!healthJson);
  } else {
    const errorText = await healthRes.text();
    console.log('Error:', errorText);
  }

  // Test employees list
  const empRes = await fetch('http://localhost:4000/api/admin/employees', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\nEmployees status:', empRes.status);
  if (empRes.status === 200) {
    const empJson = await empRes.json();
    console.log('Employees count:', empJson.total || empJson.data?.length || 0);
  } else {
    const errorText = await empRes.text();
    console.log('Error:', errorText);
  }
}

test().catch(console.error);
