# Pragyantra Deployment Guide

This guide walks you through deploying Pragyantra to Render (backend) and Vercel (frontend).

## Prerequisites

- GitHub account with the Pragyantra repository (https://github.com/atharv348/Pragyantra)
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- Groq API key (free from https://console.groq.com/)

---

## Part 1: Backend Deployment on Render

### Step 1: Create Render Account & Connect GitHub
1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Select "Deploy an existing repository"
4. Connect your GitHub account and authorize Pragyantra repo

### Step 2: Configure Render Service
**Basic Settings:**
- **Name:** `pragyantra-backend`
- **Region:** Ohio (US East)
- **Python Version:** 3.11
- **Branch:** `master`
- **Build Command:** `cd backend && pip install -r requirements.txt`
- **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Plan:** Free (or upgraded if needed)

### Step 3: Set Environment Variables
In Render dashboard, go to Environment tab and add:

```
GROQ_API_KEY=your_groq_api_key_from_console.groq.com
SECRET_KEY=pragyantra-secret-key-change-in-production-09876543210987654321
DATABASE_URL=sqlite:///./pragyantra.db
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
PYTHONUNBUFFERED=1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://pragyantra.vercel.app
```

**Important:** Replace `GROQ_API_KEY` with your actual key from https://console.groq.com/

### Step 4: Deploy
- Click "Deploy"
- Wait for build to complete (5-10 minutes)
- Once deployed, you'll get a URL like: `https://pragyantra-backend.onrender.com`
- ✅ Test health endpoint: `https://pragyantra-backend.onrender.com/health`

**Save your backend URL** — you'll need it for the frontend.

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Configure Frontend Environment
1. Create `.env.local` in the `frontend` directory:
```
VITE_API_BASE_URL=https://pragyantra-backend.onrender.com
```

2. Commit and push to GitHub:
```bash
git add .env.local
git commit -m "Add Vercel environment config"
git push origin master
```

### Step 2: Deploy on Vercel
1. Go to https://vercel.com and sign up
2. Click "New Project"
3. Import the Pragyantra GitHub repository
4. Select `frontend` as the root directory
5. Add environment variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://pragyantra-backend.onrender.com` (your backend URL from Part 1)
6. Click "Deploy"
7. Wait for build (2-3 minutes)
8. You'll get a URL like: `https://pragyantra.vercel.app`

### Step 3: Post-Deployment
Update backend CORS in Render dashboard:
```
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://pragyantra.vercel.app
```

---

## Part 3: Verification

### Test Backend
```bash
curl https://pragyantra-backend.onrender.com/health
# Should return: {"status":"ok"}
```

### Test Frontend
1. Visit `https://pragyantra.vercel.app`
2. Go to **Sahayak AI** section
3. Fill eligibility form and verify API calls reach backend
4. Check browser DevTools (Network tab) — requests should go to backend URL

---

## Troubleshooting

### Backend Issues

**"503 Service Unavailable"**
- Render free tier may be sleeping. Revisit the URL to wake it up.
- Upgrade to a paid plan for always-on service.

**"Module not found" errors**
- Check `requirements.txt` is correct
- Verify build command runs `cd backend && pip install`

**Environment variables not set**
- Double-check in Render dashboard → Environment
- Deployments read env vars from the service config, not `.env` files

### Frontend Issues

**"Cannot reach server" in chat**
- Verify `VITE_API_BASE_URL` is set in Vercel environment
- Check backend CORS includes your Vercel domain
- Inspect Network tab in DevTools for actual API calls

**Build fails on Vercel**
- Ensure `frontend` is set as root directory
- Check `package.json` has all dependencies
- Verify Node.js version (18+ recommended)

---

## Optional: Custom Domain (Production)

### Add Custom Domain to Vercel
1. In Vercel project settings → Domains
2. Add your custom domain
3. Follow DNS instructions from your domain registrar

### Add Custom Domain to Render
1. In Render service settings → Domains
2. Add your custom domain
3. Update Vercel CORS and env vars with new domain

---

## Monitoring & Logs

### View Backend Logs (Render)
- Go to Render dashboard → Service → Logs
- Filter by error/warning

### View Frontend Logs (Vercel)
- Go to Vercel project → Deployments → Runtime Logs
- Or check browser console in production

### Monitor Performance
- Render: Built-in metrics dashboard
- Vercel: Analytics tab shows Web Vitals

---

## Next Steps

1. ✅ Set up environment variables on both platforms
2. ✅ Test health endpoints
3. ✅ Verify API connectivity
4. 🔄 Consider upgrading Render from free tier for production
5. 🔄 Set up custom domain if desired
6. 🔄 Enable HTTPS (automatic on both platforms)
7. 🔄 Add monitoring/alerting

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/
- **Vite Production Build:** https://vitejs.dev/guide/build.html
