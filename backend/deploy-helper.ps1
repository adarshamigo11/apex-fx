# ApexFX Deployment Helper Script
# Run this in PowerShell to prepare for deployment

Write-Host "🚀 ApexFX Deployment Helper" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow

$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if ($gitInstalled) {
    Write-Host "✓ Git installed" -ForegroundColor Green
} else {
    Write-Host "✗ Git not found. Install from https://git-scm.com" -ForegroundColor Red
    exit 1
}

if ($nodeInstalled) {
    $nodeVersion = node -v
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Generate secure secrets
Write-Host "Step 2: Generating secure JWT secrets..." -ForegroundColor Yellow

$jwtAccess = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
$jwtRefresh = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

Write-Host "✓ JWT_ACCESS_SECRET=$jwtAccess" -ForegroundColor Green
Write-Host "✓ JWT_REFRESH_SECRET=$jwtRefresh" -ForegroundColor Green
Write-Host ""
Write-Host "📝 SAVE THESE SECRETS! You'll need them for Railway." -ForegroundColor Yellow
Write-Host ""

# Step 3: Create environment files from templates
Write-Host "Step 3: Checking environment files..." -ForegroundColor Yellow

$backendEnvExists = Test-Path "c:\Users\gac\Desktop\backend\.env"
$backendEnvExampleExists = Test-Path "c:\Users\gac\Desktop\backend\.env.example"

if ($backendEnvExampleExists -and -not $backendEnvExists) {
    Write-Host "⚠ Warning: .env file not found in backend" -ForegroundColor Yellow
    Write-Host "  Please copy .env.example to .env and fill in your values" -ForegroundColor Yellow
}

$frontendEnvExists = Test-Path "c:\Users\gac\Desktop\frontend\.env.local"
$frontendEnvExampleExists = Test-Path "c:\Users\gac\Desktop\frontend\.env.example"

if ($frontendEnvExampleExists -and -not $frontendEnvExists) {
    Write-Host "⚠ Warning: .env.local file not found in frontend" -ForegroundColor Yellow
    Write-Host "  Please copy .env.example to .env.local and fill in your values" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Choose repository setup
Write-Host "Step 4: Choose your Git setup:" -ForegroundColor Yellow
Write-Host "1) Separate repositories (RECOMMENDED)" -ForegroundColor White
Write-Host "2) Single monorepo" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "📦 Separate Repositories Setup:" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backend Repository:" -ForegroundColor Yellow
    Write-Host "-------------------" -ForegroundColor Yellow
    Write-Host "cd c:\Users\gac\Desktop\backend" -ForegroundColor White
    Write-Host "git init" -ForegroundColor White
    Write-Host "git add ." -ForegroundColor White
    Write-Host "git commit -m 'Initial commit: Backend'" -ForegroundColor White
    Write-Host "git branch -M main" -ForegroundColor White
    Write-Host "git remote add origin https://github.com/YOUR_USERNAME/apexfx-backend.git" -ForegroundColor White
    Write-Host "git push -u origin main" -ForegroundColor White
    Write-Host ""
    Write-Host "Frontend Repository:" -ForegroundColor Yellow
    Write-Host "--------------------" -ForegroundColor Yellow
    Write-Host "cd c:\Users\gac\Desktop\frontend" -ForegroundColor White
    Write-Host "git init" -ForegroundColor White
    Write-Host "git add ." -ForegroundColor White
    Write-Host "git commit -m 'Initial commit: Frontend'" -ForegroundColor White
    Write-Host "git branch -M main" -ForegroundColor White
    Write-Host "git remote add origin https://github.com/YOUR_USERNAME/apexfx-frontend.git" -ForegroundColor White
    Write-Host "git push -u origin main" -ForegroundColor White
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "📦 Monorepo Setup:" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "mkdir c:\Users\gac\Desktop\apexfx-platform" -ForegroundColor White
    Write-Host "cd c:\Users\gac\Desktop\apexfx-platform" -ForegroundColor White
    Write-Host "Copy-Item -Path 'c:\Users\gac\Desktop\backend' -Destination '.\backend' -Recurse" -ForegroundColor White
    Write-Host "Copy-Item -Path 'c:\Users\gac\Desktop\frontend' -Destination '.\frontend' -Recurse" -ForegroundColor White
    Write-Host "git init" -ForegroundColor White
    Write-Host "git add ." -ForegroundColor White
    Write-Host "git commit -m 'Initial commit: ApexFX Platform'" -ForegroundColor White
    Write-Host "git branch -M main" -ForegroundColor White
    Write-Host "git remote add origin https://github.com/YOUR_USERNAME/apexfx-platform.git" -ForegroundColor White
    Write-Host "git push -u origin main" -ForegroundColor White
}

Write-Host ""

# Step 5: Next steps
Write-Host "Step 5: Next Steps" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ Push code to GitHub (see commands above)" -ForegroundColor White
Write-Host "2. 🚂 Deploy backend to Railway:" -ForegroundColor White
Write-Host "   - Go to https://railway.app" -ForegroundColor Gray
Write-Host "   - New Project → Deploy from GitHub" -ForegroundColor Gray
Write-Host "   - Add environment variables (use secrets generated above)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🎨 Deploy frontend to Render:" -ForegroundColor White
Write-Host "   - Go to https://render.com" -ForegroundColor Gray
Write-Host "   - New Web Service → Connect GitHub repo" -ForegroundColor Gray
Write-Host "   - Add environment variables" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🔗 Connect them:" -ForegroundColor White
Write-Host "   - Update CORS_ORIGIN in Railway with your Render URL" -ForegroundColor Gray
Write-Host "   - Update NEXT_PUBLIC_API_URL in Render with your Railway URL" -ForegroundColor Gray
Write-Host ""
Write-Host "5. 🌐 Test your live app!" -ForegroundColor White

Write-Host ""
Write-Host "📖 Full guide: See DEPLOYMENT_GUIDE.md and QUICK_START.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Good luck with your deployment!" -ForegroundColor Green
Write-Host ""

# Pause to keep window open
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
