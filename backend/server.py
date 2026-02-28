from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Dict, Any, AsyncGenerator
import os
import logging
from pathlib import Path
from datetime import timedelta
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from groq import Groq

from database import get_db, init_db, AsyncSessionLocal, engine, Base
from models import User, Roadmap, QuizStat
from schemas import (
    UserCreate, UserLogin, UserResponse, UserUpdate, UserUpdateByAdmin,
    Token, RoadmapCreate, RoadmapResponse, QuizStatCreate, QuizStatResponse,
    QuizRequest, ResourceRequest, DashboardStats, AdminDashboardStats
)
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_admin_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    logger.info("Starting SkillPath AI backend...")
    try:
        await init_db()
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Fatal error during startup: {e}")
        # Don't raise here to allow the app to start, but log the error
        # The database will be initialized on first request if needed
    
    yield
    
    # Shutdown: Clean up resources
    logger.info("Shutting down SkillPath AI backend...")
    try:
        await engine.dispose()
        logger.info("Database engine disposed successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

app = FastAPI(title="SkillPath AI", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    print(f"\n=== Registration Attempt ===")
    print(f"Email: {user_data.email}")
    print(f"Username: {user_data.username}")
    print(f"Full Name: {user_data.full_name}")
    print(f"Role: {user_data.role}")
    
    try:
        # Check password length
        if len(user_data.password) > 72:
            error_msg = "Password cannot be longer than 72 characters"
            print(error_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
            
        # Check if email already exists
        print("\nChecking if email exists...")
        result = await db.execute(select(User).filter(User.email == user_data.email))
        existing_email = result.scalars().first()
        if existing_email:
            print(f"Email {user_data.email} already exists!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        print("Checking if username exists...")
        result = await db.execute(select(User).filter(User.username == user_data.username))
        existing_username = result.scalars().first()
        if existing_username:
            print(f"Username {user_data.username} already taken!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create new user
        print("\nCreating new user...")
        hashed_password = get_password_hash(user_data.password)
        print(f"Password hashed successfully")
        
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role=user_data.role,
            is_active=True  # Ensure the user is active by default
        )
        print("User object created")
        
        db.add(new_user)
        print("User added to session")
        
        try:
            await db.commit()
            print("Database commit successful")
            await db.refresh(new_user)
            print("User refreshed from database")
            print(f"New user created with ID: {new_user.id}")
        except Exception as e:
            print(f"Database commit error: {str(e)}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user in database"
            )
        
        # Create access token
        print("\nCreating access token...")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user.email}, expires_delta=access_token_expires
        )
        print("Access token created successfully")
        
        # Prepare response
        user_response = UserResponse.model_validate(new_user)
        response = Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
        print("\n=== Registration Successful ===")
        return response
        
    except HTTPException as he:
        print(f"Registration failed with HTTP {he.status_code}: {he.detail}")
        raise
    except Exception as e:
        print(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}"
        )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user"""
    print(f"Login attempt for email: {credentials.email}")
    result = await db.execute(select(User).filter(User.email == credentials.email))
    user = result.scalars().first()
    
    if not user:
        print(f"No user found with email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    print(f"User found: {user.email}, checking password...")
    print(f"Stored hash: {user.hashed_password}")
    
    if not verify_password(credentials.password, user.hashed_password):
        print("Password verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse.model_validate(current_user)

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile"""
    # Check if email is being changed and if it's already taken
    if user_update.email and user_update.email != current_user.email:
        result = await db.execute(select(User).filter(User.email == user_update.email))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_update.email
    
    # Check if username is being changed and if it's already taken
    if user_update.username and user_update.username != current_user.username:
        result = await db.execute(select(User).filter(User.username == user_update.username))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_update.username
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.avatar is not None:
        current_user.avatar = user_update.avatar
    if user_update.hardness_index is not None:
        current_user.hardness_index = user_update.hardness_index
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)

# ==================== ROADMAP ROUTES ====================

@api_router.post("/roadmap", response_model=Dict[str, Any])
async def create_roadmap(
    roadmap_data: RoadmapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or get a roadmap for a topic"""
    # Check if roadmap already exists for this user and topic
    result = await db.execute(
        select(Roadmap).filter(
            and_(Roadmap.user_id == current_user.id, Roadmap.topic == roadmap_data.topic)
        )
    )
    existing_roadmap = result.scalars().first()
    
    if existing_roadmap:
        return existing_roadmap.roadmap_data
    
    # Generate roadmap structure using AI
    roadmap_structure = await generate_ai_roadmap(
        roadmap_data.topic,
        roadmap_data.time,
        roadmap_data.knowledge_level
    )
    
    # Save roadmap to database
    new_roadmap = Roadmap(
        user_id=current_user.id,
        topic=roadmap_data.topic,
        time=roadmap_data.time,
        knowledge_level=roadmap_data.knowledge_level,
        roadmap_data=roadmap_structure
    )
    
    db.add(new_roadmap)
    await db.commit()
    await db.refresh(new_roadmap)
    
    return roadmap_structure

@api_router.get("/roadmaps", response_model=List[RoadmapResponse])
async def get_user_roadmaps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all roadmaps for current user"""
    result = await db.execute(
        select(Roadmap).filter(Roadmap.user_id == current_user.id)
    )
    roadmaps = result.scalars().all()
    return [RoadmapResponse.model_validate(rm) for rm in roadmaps]

@api_router.get("/roadmap/{topic}")
async def get_roadmap_by_topic(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific roadmap by topic"""
    result = await db.execute(
        select(Roadmap).filter(
            and_(Roadmap.user_id == current_user.id, Roadmap.topic == topic)
        )
    )
    roadmap = result.scalars().first()
    
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roadmap not found"
        )
    
    return {
        "topic": roadmap.topic,
        "time": roadmap.time,
        "knowledge_level": roadmap.knowledge_level,
        "roadmap_data": roadmap.roadmap_data
    }

# ==================== QUIZ ROUTES ====================

@api_router.post("/quiz")
async def get_quiz(quiz_request: QuizRequest):
    """Generate quiz questions using AI"""
    quiz_data = await generate_ai_quiz(
        quiz_request.course,
        quiz_request.topic,
        quiz_request.subtopic,
        quiz_request.description
    )
    return quiz_data

@api_router.post("/quiz/stats", response_model=QuizStatResponse)
async def save_quiz_stats(
    quiz_stat: QuizStatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save quiz completion statistics"""
    new_stat = QuizStat(
        user_id=current_user.id,
        topic=quiz_stat.topic,
        week_num=quiz_stat.week_num,
        subtopic_num=quiz_stat.subtopic_num,
        num_correct=quiz_stat.num_correct,
        num_questions=quiz_stat.num_questions,
        time_taken=quiz_stat.time_taken
    )
    
    db.add(new_stat)
    await db.commit()
    await db.refresh(new_stat)
    
    return QuizStatResponse.model_validate(new_stat)

@api_router.get("/quiz/stats/{topic}")
async def get_quiz_stats_by_topic(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get quiz statistics for a specific topic"""
    result = await db.execute(
        select(QuizStat).filter(
            and_(QuizStat.user_id == current_user.id, QuizStat.topic == topic)
        )
    )
    stats = result.scalars().all()
    
    # Format stats by week and subtopic
    formatted_stats = {}
    for stat in stats:
        if stat.week_num not in formatted_stats:
            formatted_stats[stat.week_num] = {}
        formatted_stats[stat.week_num][stat.subtopic_num] = {
            "numCorrect": stat.num_correct,
            "numQues": stat.num_questions,
            "timeTaken": stat.time_taken
        }
    
    return formatted_stats

# ==================== RESOURCES ROUTE ====================

@api_router.post("/generate-resources")
async def generate_resources(resource_request: ResourceRequest):
    """Generate learning resources using AI"""
    resources = await generate_ai_resources(
        resource_request.course,
        resource_request.knowledge_level,
        resource_request.description,
        resource_request.time
    )
    return resources

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user dashboard statistics"""
    # Get roadmaps count
    roadmaps_result = await db.execute(
        select(Roadmap).filter(Roadmap.user_id == current_user.id)
    )
    roadmaps = roadmaps_result.scalars().all()
    
    # Get quiz stats
    quiz_result = await db.execute(
        select(QuizStat).filter(QuizStat.user_id == current_user.id)
    )
    quiz_stats = quiz_result.scalars().all()
    
    # Calculate progress for each topic
    progress = {}
    for roadmap in roadmaps:
        topic = roadmap.topic
        roadmap_data = roadmap.roadmap_data
        
        total_time = 0
        completed_time = 0
        
        for week_key, week_data in roadmap_data.items():
            subtopics = week_data.get("subtopics", [])
            for i, subtopic in enumerate(subtopics):
                time_str = subtopic.get("time", "1 hour")
                time_value = float(time_str.split()[0]) if time_str.split()[0].replace('.', '').isdigit() else 1
                total_time += time_value
                
                # Check if quiz is completed for this subtopic
                week_num = int(week_key.split()[1])
                subtopic_num = i + 1
                
                is_completed = any(
                    stat.topic == topic and 
                    stat.week_num == week_num and 
                    stat.subtopic_num == subtopic_num
                    for stat in quiz_stats
                )
                
                if is_completed:
                    completed_time += time_value
        
        progress[topic] = {
            "total": total_time,
            "completed": completed_time
        }
    
    return DashboardStats(
        total_courses=len(roadmaps),
        completed_quizzes=len(quiz_stats),
        hardness_index=current_user.hardness_index,
        progress=progress
    )

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()
    
    # Active users
    active_users_result = await db.execute(
        select(func.count(User.id)).filter(User.is_active == True)
    )
    active_users = active_users_result.scalar()
    
    # Total roadmaps
    total_roadmaps_result = await db.execute(select(func.count(Roadmap.id)))
    total_roadmaps = total_roadmaps_result.scalar()
    
    # Total quizzes
    total_quizzes_result = await db.execute(select(func.count(QuizStat.id)))
    total_quizzes = total_quizzes_result.scalar()
    
    # Recent users
    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = recent_users_result.scalars().all()
    
    return AdminDashboardStats(
        total_users=total_users or 0,
        active_users=active_users or 0,
        total_roadmaps=total_roadmaps or 0,
        total_quizzes=total_quizzes or 0,
        recent_users=[UserResponse.model_validate(user) for user in recent_users]
    )

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]

@api_router.put("/admin/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: int,
    user_update: UserUpdateByAdmin,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user details (admin only)"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.username is not None:
        user.username = user_update.username
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (admin only)"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}

# ==================== AI HELPER FUNCTIONS ====================

async def generate_ai_roadmap(topic: str, time: str, knowledge_level: str) -> Dict[str, Any]:
    """Generate roadmap structure using Groq AI"""
    print(f"=== AI ROADMAP GENERATION ===")
    print(f"Topic: {topic}")
    print(f"Time: {time}")
    print(f"Knowledge Level: {knowledge_level}")
    
    try:
        api_key = os.getenv("GROQ_API_KEY")
        print(f"API Key found: {bool(api_key)}")
        print(f"API Key length: {len(api_key) if api_key else 0}")
        
        client = Groq(api_key=api_key)
        print("Groq client created successfully")
        
        weeks = int(time.split()[0]) if time.split()[0].isdigit() else 4
        print(f"Weeks: {weeks}")
        
        prompt = f"""
        Generate a comprehensive learning roadmap for "{topic}" at {knowledge_level} level.
        The roadmap should cover {weeks} weeks.
        
        Return a JSON structure with the following format:
        {{
            "Week 1": {{
                "topic": "Week 1 Topic Name",
                "subtopics": [
                    {{
                        "subtopic": "Specific subtopic name",
                        "description": "Detailed description of what will be learned",
                        "time": "estimated time in hours"
                    }}
                ]
            }}
        }}
        
        Make sure to:
        1. Create realistic and educational content
        2. Include practical, hands-on topics
        3. Progress from basic to advanced concepts
        4. Include appropriate time estimates
        5. Return valid JSON only
        """
        
        print("Sending request to Groq API...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4000
        )
        
        content = response.choices[0].message.content
        print(f"Groq response received: {content[:200]}...")
        
        # Remove markdown code blocks if present
        if content.startswith('```'):
            content = content.strip('`')
            if content.startswith('json'):
                content = content[4:].strip()
            if content.endswith('```'):
                content = content[:-3].strip()
        
        import json
        roadmap_data = json.loads(content)
        print("AI roadmap generated successfully!")
        
        return roadmap_data
        
    except Exception as e:
        print(f"Error generating AI roadmap: {e}")
        print(f"Falling back to mock data...")
        # Fallback to mock data
        return generate_mock_roadmap(topic, time, knowledge_level)

async def generate_ai_resources(course: str, knowledge_level: str, description: str, time: str) -> str:
    """Generate learning resources using Groq AI"""
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY", "gsk_qK4H2K8Q3J8K2J4K8J2K"))
        
        prompt = f"""
        Generate comprehensive learning resources for a student studying:
        Course: {course}
        Knowledge Level: {knowledge_level}
        Topic: {description}
        Time Allotted: {time}
        
        Create detailed learning materials including:
        1. Key concepts and definitions
        2. Recommended online resources (videos, articles, tutorials)
        3. Practice exercises or projects
        4. Study tips and best practices
        5. Additional reading materials
        
        Format as markdown with clear sections and bullet points.
        Be specific and provide actionable resources.
        """
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=3000
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error generating AI resources: {e}")
        # Fallback to mock data
        return generate_mock_resources(course, knowledge_level, description, time)

def generate_mock_roadmap(topic: str, time: str, knowledge_level: str) -> Dict[str, Any]:
    """Generate a mock roadmap structure"""
    weeks = int(time.split()[0]) if time.split()[0].isdigit() else 4
    
    roadmap = {}
    for i in range(1, min(weeks + 1, 5)):
        roadmap[f"Week {i}"] = {
            "topic": f"{topic} - Phase {i}",
            "subtopics": [
                {
                    "subtopic": f"Introduction to {topic} Part {i}.1",
                    "description": f"Learn the fundamentals of {topic} focusing on key concepts.",
                    "time": f"{1.5 * i} hours"
                },
                {
                    "subtopic": f"Advanced {topic} Concepts {i}.2",
                    "description": f"Deep dive into advanced topics and practical applications.",
                    "time": f"{2 * i} hours"
                }
            ]
        }
    
    return roadmap

async def generate_ai_quiz(course: str, topic: str, subtopic: str, description: str) -> Dict[str, Any]:
    """Generate quiz questions using Groq AI"""
    print(f"=== AI QUIZ GENERATION ===")
    print(f"Course: {course}")
    print(f"Topic: {topic}")
    print(f"Subtopic: {subtopic}")
    print(f"Description: {description}")
    
    try:
        api_key = os.getenv("GROQ_API_KEY")
        print(f"API Key found: {bool(api_key)}")
        
        client = Groq(api_key=api_key)
        print("Groq client created successfully")
        
        prompt = f"""
        Generate a comprehensive quiz for the following learning material:
        
        Course: {course}
        Topic: {topic}
        Subtopic: {subtopic}
        Description: {description}
        
        Create 5 multiple-choice questions that test understanding of this specific subtopic.
        
        Return a JSON structure with the following format:
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "Specific question about {subtopic}",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": 0
                }}
            ]
        }}
        
        Requirements:
        1. Questions should be specific to {subtopic}
        2. Options should be plausible but clearly distinguishable
        3. Only one option should be correct (0-3 index)
        4. Questions should test different aspects (concepts, applications, problem-solving)
        5. Return valid JSON only
        """
        
        print("Sending quiz request to Groq API...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        print(f"Groq quiz response received: {content[:200]}...")
        
        # Remove markdown code blocks if present
        if content.startswith('```'):
            content = content.strip('`')
            if content.startswith('json'):
                content = content[4:].strip()
            if content.endswith('```'):
                content = content[:-3].strip()
        
        import json
        quiz_data = json.loads(content)
        print("AI quiz generated successfully!")
        
        return quiz_data
        
    except Exception as e:
        print(f"Error generating AI quiz: {e}")
        print(f"Falling back to mock data...")
        # Fallback to mock data
        return generate_mock_quiz(course, topic, subtopic, description)

def generate_mock_quiz(course: str, topic: str, subtopic: str, description: str) -> Dict[str, Any]:
    """Generate mock quiz questions"""
    return {
        "questions": [
            {
                "id": 1,
                "question": f"What is the primary focus of {subtopic}?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct": 0
            },
            {
                "id": 2,
                "question": f"Which of the following is a key concept in {topic}?",
                "options": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
                "correct": 1
            },
            {
                "id": 3,
                "question": f"How does {subtopic} relate to {course}?",
                "options": ["Relation A", "Relation B", "Relation C", "Relation D"],
                "correct": 2
            }
        ]
    }

def generate_mock_resources(course: str, knowledge_level: str, description: str, time: str) -> str:
    """Generate mock learning resources"""
    return f"""# Learning Resources for {course}

## Overview
Based on your {knowledge_level} level and {time} available, here are curated resources.

## Recommended Materials

### Online Courses
- **Course 1**: Comprehensive guide covering all fundamentals
- **Course 2**: Hands-on projects and practical applications

### Books
- *Essential {course}*: Perfect for {knowledge_level} learners
- *Advanced {course} Techniques*: Deep dive into complex topics

### Practice Resources
- Interactive coding challenges
- Real-world project ideas
- Community forums for help

## Study Plan
Dedicate {time} to structured learning with regular practice sessions.

Happy Learning! 🚀
"""

# Database backup endpoints
@api_router.post("/admin/backup")
async def backup_database(current_admin: User = Depends(get_admin_user)):
    """Create database backup (admin only)"""
    try:
        from backup_db import create_backup
        result = await create_backup()
        return result
    except Exception as e:
        logger.error(f"Backup endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@api_router.get("/admin/backups")
async def list_backups(current_admin: User = Depends(get_admin_user)):
    """List available database backups (admin only)"""
    try:
        backup_dir = Path(__file__).parent / "backups"
        if not backup_dir.exists():
            return {"backups": []}
        
        backups = []
        for backup_file in backup_dir.glob("skillpath_backup_*.db"):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created"], reverse=True)
        
        return {"backups": backups}
        
    except Exception as e:
        logger.error(f"List backups error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")

# Health check
@api_router.get("/health")
async def health_check():
    """Enhanced health check with database connectivity"""
    try:
        # Test database connectivity
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            from models import User
            result = await session.execute(select(User).limit(1))
            db_status = "connected"
            user_count = len(result.all())
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"
        user_count = 0
    
    from datetime import datetime, timezone
    return {
        "status": "healthy",
        "service": "skillpath-ai-backend",
        "version": "1.0.0",
        "database": {
            "status": db_status,
            "user_count": user_count
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Include the router in the main app
app.include_router(api_router)

# CORS middleware - Allow production frontend URL
allowed_origins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000"
]

# Add production frontend URL from environment variable
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add request/response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"\n=== New Request: {request.method} {request.url} ===")
    print(f"Headers: {dict(request.headers)}")
    
    if request.method in ["POST", "PUT"]:
        try:
            body = await request.json()
            print(f"Request Body: {body}")
        except:
            print("No JSON body")
    
    response = await call_next(request)
    
    print(f"Response Status: {response.status_code}")
    if response.status_code >= 400:
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        print(f"Error Response: {response_body.decode()}")
        from starlette.responses import Response
        return Response(
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    return response

# Database dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Run the server
if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", 8000))
    
    # Get host from environment variable or default to 0.0.0.0 for production
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(app, host=host, port=port)
