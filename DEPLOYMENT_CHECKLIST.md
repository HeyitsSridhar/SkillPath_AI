# Deployment Checklist for SkillPath AI

## ✅ Pre-Deployment Checklist

### Backend Preparation
- [ ] Environment variables configured (see `.env.example`)
- [ ] Database URL set for production
- [ ] SECRET_KEY changed from default
- [ ] GROQ_API_KEY configured
- [ ] CORS origins updated for production
- [ ] Procfile created for Render
- [ ] Requirements.txt optimized for production

### Frontend Preparation  
- [ ] Environment variables configured (see `.env.example`)
- [ ] API_URL uses environment variable
- [ ] Build process tested (`npm run build`)
- [ ] Production dependencies only

### Repository Preparation
- [ ] All changes committed to Git
- [ ] `.gitignore` properly configured
- [ ] Database file excluded (or included for persistence)
- [ ] Sensitive data in `.env.example` only
- [ ] Documentation updated (README.md, DEPLOYMENT.md)

## 🚀 Deployment Steps

### 1. GitHub Setup
- [ ] Repository pushed to GitHub
- [ ] Branch protection rules set (optional)
- [ ] Repository is public or private as needed

### 2. Backend Deployment (Render)
- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Web service created with correct settings:
  - Root directory: `backend`
  - Build command: `pip install -r requirements.txt`
  - Start command: `python server.py`
- [ ] Environment variables added:
  - `DATABASE_URL`
  - `SECRET_KEY`
  - `GROQ_API_KEY`
  - `FRONTEND_URL`
  - `PORT=8000`
  - `HOST=0.0.0.0`
- [ ] Service deployed and running

### 3. Frontend Deployment (Vercel)
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project created with correct settings:
  - Framework: Create React App
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `build`
- [ ] Environment variable added:
  - `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`
- [ ] Project deployed and running

### 4. Post-Deployment Testing
- [ ] Frontend loads correctly
- [ ] Backend health check works
- [ ] User registration works
- [ ] User login works
- [ ] Admin login works
- [ ] AI features (roadmaps, quizzes) work
- [ ] CORS properly configured
- [ ] Database persistence works

## 🔧 Production Configuration

### Required Environment Variables

#### Backend (Render)
```
DATABASE_URL=sqlite+aiosqlite:///./skillpath.db
SECRET_KEY=your-secure-secret-key-here
GROQ_API_KEY=your-groq-api-key
FRONTEND_URL=https://your-frontend.vercel.app
PORT=8000
HOST=0.0.0.0
```

#### Frontend (Vercel)
```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

## 📊 Monitoring & Maintenance

### Regular Checks
- [ ] Monitor service logs on Render and Vercel
- [ ] Check API response times
- [ ] Monitor database size and performance
- [ ] Test critical user flows weekly
- [ ] Update dependencies regularly

### Backup Strategy
- [ ] Regular database backups via admin endpoint
- [ ] Backup configuration files
- [ ] Document recovery procedures

## 🚨 Troubleshooting

### Common Issues & Solutions

1. **CORS Errors**
   - Verify `FRONTEND_URL` is set correctly
   - Check frontend URL is in allowed origins
   - Redeploy backend after changes

2. **Database Connection Issues**
   - Verify `DATABASE_URL` format
   - Check database permissions
   - Test database connectivity

3. **API Connection Issues**
   - Verify `REACT_APP_BACKEND_URL` is correct
   - Check backend service status
   - Test API endpoints directly

4. **AI Features Not Working**
   - Verify `GROQ_API_KEY` is valid
   - Check API key permissions
   - Monitor API usage limits

## 📱 URLs After Deployment

- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.onrender.com`
- **API Docs**: `https://your-app-name.onrender.com/docs`
- **Health Check**: `https://your-app-name.onrender.com/api/health`

## 🔐 Security Checklist

- [ ] Default passwords changed
- [ ] Strong SECRET_KEY used
- [ ] API keys secured
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] Environment variables not exposed
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting considered
- [ ] Input validation working

## 📈 Performance Optimization

- [ ] Frontend build optimized
- [ ] Images compressed
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] Bundle size analyzed and minimized

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Both frontend and backend are accessible
- ✅ Users can register and login
- ✅ AI features work correctly
- ✅ Data persists between sessions
- ✅ Admin functions work
- ✅ No CORS or API errors
- ✅ Mobile responsive design works
- ✅ Error handling works gracefully

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs)
