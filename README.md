# SkillPath - AI-Powered Learning Management System

A full-stack learning management application with AI-powered content generation, role-based authentication, and personalized learning paths.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On macOS/Linux
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (create `.env` file):
   ```env
   DATABASE_URL=sqlite+aiosqlite:///./skillpath.db
   SECRET_KEY=your-secret-key-change-in-production-12345678
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   CORS_ORIGINS=http://localhost:3000
   GROQ_API_KEY=your-groq-api-key-here
   ```

5. Start FastAPI server:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. In a new terminal, navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables (create `.env` file):
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   WDS_SOCKET_PORT=443
   ENABLE_HEALTH_CHECK=false
   ```

4. Start development server:
   ```bash
   npm start
   # or
   yarn start
   ```
   The frontend will be available at `http://localhost:3000`

### Current Admin Credentials
- **Email**: admin@skillpath.com
- **Username**: administrator
- **Password**: Admin@2024

## 🚀 Features

### AI-Powered Content Generation
- **Intelligent Roadmaps**: AI generates personalized learning paths with real, topic-specific content
- **Dynamic Quizzes**: AI creates contextual quiz questions based on learning subtopics
- **Resource Recommendations**: AI suggests relevant learning materials and resources
- **Groq Integration**: Uses Groq's Llama models for fast, accurate content generation

### Authentication & Authorization
- **JWT-based Authentication**: Secure token-based authentication system
- **Role-Based Access Control**: Two distinct user roles (User and Admin)
- **Protected Routes**: Frontend and backend route protection
- **Profile Management**: Users can edit their profile information

### User Features
- **Personalized Dashboard**: View learning progress, courses, and statistics
- **Learning Roadmap Creation**: Generate custom learning paths for any topic
- **Interactive Quizzes**: Test knowledge with AI-generated, topic-specific questions
- **Progress Tracking**: Visual progress charts using Chart.js
- **Resource Generation**: AI-powered learning resource suggestions
- **Profile Customization**: Update username, full name, and email

### Admin Features
- **Admin Dashboard**: Comprehensive overview of platform statistics
- **User Management**: View all users, their roles, and status
- **User Actions**: 
  - Activate/Deactivate user accounts
  - Delete users
  - View user details and activity
- **Platform Statistics**: 
  - Total users and active users count
  - Total roadmaps created
  - Total quizzes completed

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLite**: Lightweight SQL database with async support (aiosqlite)
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation using Python type annotations
- **JWT**: JSON Web Tokens for authentication
- **Groq AI**: Advanced AI model integration for content generation

### Frontend
- **React 19**: Latest version of React
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Chart.js & react-chartjs-2**: Data visualization
- **Lucide React**: Beautiful icon library
- **Tailwind CSS**: Utility-first CSS framework
- **React Markdown**: Markdown rendering

##  API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Learning Content
- `POST /api/roadmap` - Generate AI-powered learning roadmap
- `GET /api/roadmaps` - Get all roadmaps for current user
- `POST /api/quiz` - Generate AI-powered quiz questions
- `POST /api/quiz/stats` - Save quiz results
- `GET /api/quiz/stats/{topic}` - Get quiz statistics
- `POST /api/generate-resources` - Generate AI-powered learning resources

### Admin Endpoints
- `GET /api/admin/dashboard` - Get admin dashboard statistics
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/{user_id}` - Update user (admin only)
- `DELETE /api/admin/users/{user_id}` - Delete user (admin only)

## 🎯 Current Status

### ✅ Completed Features
- **AI Integration**: Groq AI fully integrated for roadmap and quiz generation
- **Real Content**: No more mock data - all content is AI-generated and topic-specific
- **Authentication**: Secure login system with role-based access
- **Admin Panel**: Complete admin dashboard with user management
- **Progress Tracking**: Visual charts and statistics
- **Responsive Design**: Mobile-friendly interface

### 🔧 Technical Improvements Made
- Fixed bcrypt compatibility issues with password hashing
- Resolved database initialization order problems
- Implemented proper JSON parsing for AI responses
- Added comprehensive error handling and fallbacks
- Optimized API response handling

## 📄 License

This project is licensed under MIT License - see [LICENSE](LICENSE) file for details.