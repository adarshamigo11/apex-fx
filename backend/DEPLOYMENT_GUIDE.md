# 🚀 ApexFX Trading Platform - Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Repository                   │
│              (Source Code & Version Control)          │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────────┐  ┌──────────────────────────┐
│   Railway (Backend)  │  │   Render (Frontend)      │
│   - Express.js API   │  │   - Next.js App          │
│   - WebSocket/Socket │  │   - React UI             │
│   - Port 4000        │  │   - Port 3000            │
└──────────┬───────────┘  └──────────┬───────────────┘
           │                         │
           ▼                         │
┌──────────────────────┐              │
│  MongoDB Atlas       │              │
│  - Database          │              │
│  - Free 512MB        │              │
└──────────────────────┘              │
                                      │
           ┌──────────────────────────┘
           │
           ▼
    Users access frontend on Render
    Frontend calls backend API on Railway
```

---

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Railway account (https://railway.app)
- ✅ Render account (https://render.com)
- ✅ MongoDB Atlas account (already set up)
- ✅ Node.js 20+ installed locally

---

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Code

#### 1.1 Update CORS in Backend

Edit `backend/.env`:
```env
# Change from localhost to your Render frontend URL
CORS_ORIGIN=https://your-app.onrender.com
```

#### 1.2 Create Frontend Environment File

Create `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
```

---

### Step 2: Push to GitHub

#### Option A: Single Repository (Monorepo)

```bash
# Create main project folder
mkdir apexfx-platform
cd apexfx-platform

# Initialize git
git init

# Copy your projects
# - Put backend/ folder here
# - Put frontend/ folder here

# Add and commit
git add .
git commit -m "Initial commit: ApexFX Trading Platform"

# Create GitHub repo
# Go to https://github.com/new
# Create repo: apexfx-platform

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/apexfx-platform.git
git branch -M main
git push -u origin main
```

#### Option B: Separate Repositories (Recommended)

**Backend:**
```bash
cd c:\Users\gac\Desktop\backend
git init
git add .
git commit -m "Initial commit: Backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apexfx-backend.git
git push -u origin main
```

**Frontend:**
```bash
cd c:\Users\gac\Desktop\frontend
git init
git add .
git commit -m "Initial commit: Frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apexfx-frontend.git
git push -u origin main
```

---

### Step 3: Deploy Backend to Railway

#### 3.1 Create Railway Project

1. Go to https://railway.app
2. Click **"Sign In"** → **"Login with GitHub"**
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your backend repository

#### 3.2 Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apexfx
MONGODB_DB=apexfx
JWT_ACCESS_SECRET=<run-command-below>
JWT_REFRESH_SECRET=<run-command-below>
ACCESS_TTL=15m
REFRESH_TTL_DAYS=7
TWELVE_DATA_API_KEY=your-api-key
FINNHUB_API_KEY=your-api-key
CORS_ORIGIN=https://your-app.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ApexFX <no-reply@yourdomain.com>
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=apexfx-kyc-uploads
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

**Generate secure JWT secrets:**
```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

#### 3.3 Configure Settings

In Railway **Settings** tab:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/server.js`
- **Root Directory**: `/` (or `/backend` if monorepo)
- **Healthcheck Path**: `/health`
- **Port**: `4000`

#### 3.4 Deploy

Railway will automatically:
1. Pull code from GitHub
2. Install dependencies
3. Build TypeScript
4. Start the server

You'll get a URL like: `https://your-backend-production.up.railway.app`

#### 3.5 Seed Production Database

Once deployed, open Railway shell:
1. Click **"Shell"** tab in Railway
2. Run: `npm run seed`

---

### Step 4: Deploy Frontend to Render

#### 4.1 Create Render Service

1. Go to https://render.com
2. Click **"Sign In"** → **"Sign in with GitHub"**
3. Click **"New +"** → **"Web Service"**
4. Connect your frontend repository

#### 4.2 Configure Settings

- **Name**: `apexfx-frontend`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `20.0.0` or higher

#### 4.3 Add Environment Variables

In Render **Environment** tab:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
NEXT_PUBLIC_APP_NAME=ApexFX
NODE_ENV=production
```

#### 4.4 Choose Plan

- **Free Tier**: Available (sleeps after 15 min inactivity)
- **Starter**: $7/month (always on, recommended for production)

#### 4.5 Deploy

Click **"Create Web Service"**

Render will:
1. Pull code from GitHub
2. Install dependencies
3. Build Next.js app
4. Start the server

You'll get a URL like: `https://apexfx-frontend.onrender.com`

---

### Step 5: Connect Frontend & Backend

#### 5.1 Update Backend CORS

In Railway, update `CORS_ORIGIN`:
```env
CORS_ORIGIN=https://apexfx-frontend.onrender.com
```

Railway will auto-redeploy.

#### 5.2 Test the Connection

Visit your frontend URL and:
1. Check browser console for errors
2. Try logging in with: `admin@platform.local` / `Admin@12345`
3. Verify API calls work (check Network tab)

---

## 🔧 Optional: Custom Domain

### For Render (Frontend)

1. Go to Render Dashboard → Your Service → **Settings**
2. Scroll to **Custom Domains**
3. Click **"Add Custom Domain"**
4. Enter: `www.yourdomain.com`
5. Update DNS records:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: `apexfx-frontend.onrender.com`

### For Railway (Backend)

1. Go to Railway Dashboard → Your Service → **Settings**
2. Scroll to **Domains**
3. Click **"Add Custom Domain"**
4. Enter: `api.yourdomain.com`
5. Update DNS records

### Update Environment Variables

**Backend (Railway):**
```env
CORS_ORIGIN=https://www.yourdomain.com
```

**Frontend (Render):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

---

## 📊 Monitoring & Maintenance

### Railway Dashboard
- View logs: **Deployments** tab
- Monitor CPU/RAM: **Metrics** tab
- View environment: **Variables** tab

### Render Dashboard
- View logs: **Logs** tab
- Monitor performance: **Metrics** tab
- Auto-deploy on push: Enabled by default

### MongoDB Atlas
- Monitor database: **Clusters** → **Metrics**
- View logs: **Clusters** → **Logs**
- Backup: **Clusters** → **Backup** (automatic on free tier)

---

## 🚨 Troubleshooting

### Backend Won't Start on Railway

**Check logs:**
```bash
# Railway Shell
npm run build
node dist/server.js
```

**Common issues:**
- Missing environment variables
- MongoDB connection failed (check IP whitelist)
- Port already in use (should be 4000)

### Frontend Shows API Errors

**Check:**
1. `NEXT_PUBLIC_API_URL` is correct in Render
2. Backend CORS allows your Render URL
3. Backend is running (visit `/health` endpoint)

### WebSocket Not Connecting

**Check:**
1. `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
2. Backend WebSocket server is running
3. No firewall blocking WebSocket connections

### MongoDB Connection Failed

**Fix:**
1. Go to MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allow all IPs)
3. Verify connection string is correct

---

## 💰 Cost Breakdown

| Service | Free Tier | Production |
|---------|-----------|------------|
| GitHub | ✅ Free | ✅ Free |
| Railway | $5 credit/month | $5-10/month |
| Render | ✅ Free (sleeps) | $7/month |
| MongoDB Atlas | ✅ Free (512MB) | $9+/month |
| **Total** | **$0 to start** | **$12-26/month** |

---

## 🔄 Continuous Deployment

Every time you push to GitHub:
1. ✅ Railway auto-deploys backend
2. ✅ Render auto-deploys frontend
3. ✅ Zero downtime deployments

**Workflow:**
```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Railway & Render automatically deploy!
```

---

## 📝 Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend.railway.app/health`
- [ ] Frontend loads: `https://your-app.onrender.com`
- [ ] Login works: `admin@platform.local` / `Admin@12345`
- [ ] Real-time prices updating (WebSocket)
- [ ] API calls working (check browser Network tab)
- [ ] No console errors
- [ ] Database seeded (run `npm run seed` in Railway shell)
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Custom domain (optional)
- [ ] SSL/HTTPS enabled (automatic on Railway & Render)

---

## 🎉 You're Live!

Your ApexFX Trading Platform is now accessible worldwide!

**Share your URLs:**
- Frontend: `https://your-app.onrender.com`
- Backend API: `https://your-backend.railway.app`
- Admin Panel: `https://your-app.onrender.com/admin/login`

---

## 📚 Additional Resources

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Need help?** Check the troubleshooting section or review logs in Railway/Render dashboards.
