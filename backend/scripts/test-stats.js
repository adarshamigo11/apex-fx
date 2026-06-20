const API = 'http://localhost:4000';

async function main() {
  // Login as admin
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@platform.local', password: 'Admin@12345' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginRes.status === 200 ? 'OK' : 'FAILED');
  
  if (!loginData.accessToken) {
    console.error('No token received');
    return;
  }

  // Test stats endpoint
  const statsRes = await fetch(`${API}/api/admin/monitoring/stats`, {
    headers: { Authorization: `Bearer ${loginData.accessToken}` }
  });
  const stats = await statsRes.json();
  console.log('\n=== ADMIN DASHBOARD STATS ===');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(e => console.error(e.message));
