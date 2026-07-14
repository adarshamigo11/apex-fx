#!/usr/bin/env node
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';

function createSecureLogFile() {
  const tmpDir = path.join(process.cwd(), '.vercel-tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return path.join(tmpDir, 'login.log');
}
const LOG_FILE = createSecureLogFile();

function log(msg) { console.error(msg); }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function startBackgroundLogin() {
  const logStream = fs.openSync(LOG_FILE, 'w');
  const cmd = isWindows ? 'vercel.cmd' : 'vercel';
  const child = spawn(cmd, ['login'], {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    shell: false
  });
  child.unref();
  log(`Background login process started (PID: ${child.pid})`);
  log(`Log file: ${LOG_FILE}`);
  const pidFile = LOG_FILE + '.pid';
  fs.writeFileSync(pidFile, String(child.pid));
  return child.pid;
}

function openBrowser(url) {
  const urlPattern = /^https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+$/;
  if (!urlPattern.test(url)) { log(`URL does not match expected pattern: ${url}`); return; }
  try {
    if (isWindows) {
      spawnSync('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore', windowsHide: true });
    } else {
      spawnSync('xdg-open', [url], { stdio: 'ignore' });
    }
    log('Browser opened automatically');
  } catch (error) { log(`Failed to open browser: ${error.message}`); }
}

async function waitForAuthUrl() {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const match = content.match(/https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+(?=\s|$)/);
        if (match) return match[0];
      }
    } catch (e) { /* file might not exist yet */ }
  }
  return null;
}

async function main() {
  log('========================================');
  log('Vercel CLI Login Authorization');
  log('========================================');
  log('');
  const loginPid = startBackgroundLogin();
  log('Waiting for authorization URL...');
  const authUrl = await waitForAuthUrl();
  if (authUrl) {
    log('');
    log('========================================');
    log(`vercel login is running in background (PID: ${loginPid})`);
    log('Opening browser for authorization...');
    log('========================================');
    openBrowser(authUrl);
    console.log(JSON.stringify({ status: 'needs_auth', auth_url: authUrl, log_file: LOG_FILE }));
  } else {
    log('Failed to get authorization URL');
    try { log('Log content: ' + fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
    process.exit(1);
  }
}
main();
