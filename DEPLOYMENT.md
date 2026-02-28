# Deployment Guide for SkillPath AI

This guide will help you deploy the SkillPath AI application to production using Vercel (frontend) and Render (backend).

## 🏗️ Architecture

- **Frontend**: React app deployed to Vercel
- **Backend**: FastAPI app deployed to Render
- **Database**: PostgreSQL (Render) or SQLite (local)

## 📋 Prerequisites

1. GitHub repository with your code
2. Vercel account (for frontend)
3. Render account (for backend)
4. Groq API key (for AI features)

## 🚀 Deployment Steps

### 1. Prepare Your Repository

Make sure your repository is structured as:
```
SkillPath_AI/
├── frontend/
├── backend/
├── README.md
└── DEPLOYMENT.md
```

### 2. Deploy Backend to Render

1. **Push your code to GitHub**
2. **Go to Render.com** and sign up
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure the service:**
   - **Name**: `skillpath-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`

6. **Add Environment Variables:**
   ```
   DATABASE_URL=sqlite+aiosqlite:///./skillpath.db
   SECRET_KEY=your-secure-secret-key-here
   GROQ_API_KEY=your-groq-api-key
   FRONTEND_URL=https://your-frontend-url.vercel.app
   PORT=8000
   HOST=0.0.0.0
   ```

7. **Click "Create Web Service"**

### 3. Deploy Frontend to Vercel

1. **Go to Vercel.com** and sign up
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **Add Environment Variables:**
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
   ```

6. **Click "Deploy"**

### 4. Post-Deployment Setup

1. **Update CORS in backend:**
   - Go to your Render service
   - Add `FRONTEND_URL=https://your-frontend-url.vercel.app` to environment variables
   - Redeploy the backend

2. **Test the application:**
   - Visit your frontend URL
   - Try registering a new user
   - Test AI features (roadmap generation, quizzes)

3. **Create admin user:**
   - The backend will automatically create an admin user
   - Email: `admin@gmail.com`
   - Password: `admin123`

## 🔧 Environment Variables

### Backend (.env.example)
```
DATABASE_URL=sqlite+aiosqlite:///./skillpath.db
SECRET_KEY=your-secret-key-change-in-production-12345678
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FRONTEND_URL=http://localhost:3000
PORT=8000
HOST=0.0.0.0
GROQ_API_KEY=your-groq-api-key-here
```

### Frontend (.env.example)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 📱 Production URLs

After deployment, your URLs will be:
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.onrender.com`
- **API Docs**: `https://your-app-name.onrender.com/docs`

## 🗄️ Database Options

### Option 1: SQLite (Default)
- Good for small applications
- Included by default
- Data persists on Render's filesystem

### Option 2: PostgreSQL (Recommended for Production)
1. Create a PostgreSQL database on Render
2. Update `DATABASE_URL` environment variable:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Make sure `FRONTEND_URL` is set correctly in backend
   - Check that the frontend URL is added to allowed origins

2. **Database Connection Issues:**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible

3. **API Errors:**
   - Ensure `REACT_APP_BACKEND_URL` is set in frontend
   - Check that backend is running and accessible

4. **AI Features Not Working:**
   - Verify `GROQ_API_KEY` is set correctly
   - Check API key permissions and quota

## 🔄 Updates and Maintenance

### To update your application:
1. Push changes to GitHub
2. Vercel and Render will auto-deploy
3. Monitor logs for any issues

### To backup data:
1. Use the admin backup endpoint: `POST /api/admin/backup`
2. Download backup files from Render's dashboard

## 📊 Monitoring

- **Render**: Check service logs and metrics
- **Vercel**: Monitor build logs and performance
- **Health Check**: `https://your-backend.onrender.com/api/health`

## 🛡️ Security

1. **Change default passwords** before production
2. **Use strong SECRET_KEY** in production
3. **Keep API keys secure**
4. **Enable HTTPS** (automatic on Vercel/Render)
5. **Monitor for suspicious activity**

## 📞 Support

If you encounter issues:
1. Check the logs on Vercel and Render
2. Verify environment variables
3. Test API endpoints directly
4. Check CORS configuration
5. Review this deployment guide
