# 🚀 Quick Start Commands for Deployment

## Generate Secure Secrets (Run these first!)

```powershell
# Generate JWT Access Secret
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log('console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

📝 **SAVE THESE OUTPUTS!** You'll need them for Railway.

---

## Option 1: Separate Repositories (RECOMMENDED)

### Backend Repository

```powershell
cd c:\Users\gac\Desktop\backend

# Initialize Git
git init
git add .
git commit -m "Initial commit: Backend"

# Create branch
git branch -M main

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/apexfx-backend.git

# Push to GitHub
git push -u origin main
```

### Frontend Repository

```powershell
cd c:\Users\gac\Desktop\frontend

# Initialize Git
git init
git add .
git commit -m "Initial commit: Frontend"

# Create branch
git branch -M main

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/apexfx-frontend.git

# Push to GitHub
git push -u origin main
```

---

## Option 2: Single Monorepo

```powershell
# Create new directory
mkdir c:\Users\gac\Desktop\apexfx-platform
cd c:\Users\gac\Desktop\apexfx-platform

# Copy your projects
Copy-Item -Path "c:\Users\gac\Desktop\backend" -Destination ".\backend" -Recurse
Copy-Item -Path "c:\Users\gac\Desktop\frontend" -Destination ".\frontend" -Recurse

# Initialize Git
git init
git add .
git commit -m "Initial commit: ApexFX Platform"

# Create branch
git branch -M main

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/apexfx-platform.git

# Push to GitHub
git push -u origin main
```

---

## 🚂 Railway Deployment Steps (Backend)

### 1. Go to Railway
- Visit: https://railway.app
- Login with GitHub

### 2. Create Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose `apexfx-backend` (or `apexfx-platform` if monorepo)

### 3. Add Environment Variables
Copy ALL of these to Railway Variables tab:

```
NODE_ENV=production
PORT=4000
MONGODB_URI=<your-mongodb-atlas-uri>
MONGODB_DB=apexfx
JWT_ACCESS_SECRET=<paste-generated-secret>
JWT_REFRESH_SECRET=<paste-generated-secret>
ACCESS_TTL=15m
REFRESH_TTL_DAYS=7
TWELVE_DATA_API_KEY=026ab1f6852c4234b2ff6d4ce5772016
FINNHUB_API_KEY=d8npa8pr01qvvn99qbh0d8npa8pr01qvvn99qbhg
CORS_ORIGIN=https://your-app.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ApexFX <no-reply@yourdomain.com>
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=apexfx-kyc-uploads
S3_ACCESS_KEY=<your-aws-key>
S3_SECRET_KEY=<your-aws-secret>
```

### 4. Configure Settings
In Railway Settings tab:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/server.js`
- **Healthcheck Path**: `/health`

### 5. Deploy!
Railway auto-deploys. You'll get a URL like:
`https://your-backend-production.up.railway.app`

### 6. Seed Database
- Click "Shell" tab in Railway
- Run: `npm run seed`

---

## 🎨 Render Deployment Steps (Frontend)

### 1. Go to Render
- Visit: https://render.com
- Login with GitHub

### 2. Create Web Service
- Click "New +" → "Web Service"
- Connect your frontend repository

### 3. Configure
- **Name**: apexfx-frontend
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20.0.0 or higher

### 4. Add Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
NEXT_PUBLIC_APP_NAME=ApexFX
NODE_ENV=production
```

### 5. Deploy!
Click "Create Web Service"

You'll get a URL like:
`https://apexfx-frontend.onrender.com`

---

## 🔗 Connect Them Together

### 1. Update Backend CORS
In Railway Variables, update:
```
CORS_ORIGIN=https://apexfx-frontend.onrender.com
```
(Railway auto-redeploys)

### 2. Test Your App
- Visit: `https://apexfx-frontend.onrender.com`
- Login: `admin@platform.local` / `Admin@12345`
- Check browser console for errors

---

## ✅ Testing Checklist

```
□ Backend health check works:
  Visit: https://your-backend.railway.app/health
  Should see: {"ok":true,"ts":1234567890}

□ Frontend loads:
  Visit: https://your-app.onrender.com

□ Login works:
  Email: admin@platform.local
  Password: Admin@12345

□ Real-time prices updating (WebSocket)

□ No console errors in browser

□ API calls working (check Network tab)

□ Admin panel accessible:
  https://your-app.onrender.com/admin/login
```

---

## 🔄 Future Updates

Every time you make changes:

```powershell
# In backend or frontend folder
git add .
git commit -m "Your update message"
git push

# Railway & Render automatically deploy!
```

---

## 💰 Costs

- **GitHub**: FREE
- **Railway**: $5 credit/month (free to start)
- **Render**: FREE tier (sleeps after 15 min) or $7/month
- **MongoDB Atlas**: FREE (already working)

**Total to start: $0**
**Total for production: ~$12/month**

---

## 📖 Full Documentation

See: `DEPLOYMENT_GUIDE.md` for complete documentation

---

## 🆘 Need Help?

### Backend not starting?
- Check Railway logs
- Verify all environment variables
- Test MongoDB connection

### Frontend errors?
- Check Render logs
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser console

### WebSocket not connecting?
- Ensure `NEXT_PUBLIC_WS_URL` uses `wss://`
- Check Railway logs for WebSocket errors

---

**🎉 Good luck with your deployment!**
