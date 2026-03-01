from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import os
import json
from datetime import timedelta, datetime, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from groq import Groq

from database import get_db, init_db, engine
from models import User, Roadmap, QuizStat
from schemas import *
from auth import *

load_dotenv()

# ===================== LIFESPAN =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await engine.dispose()

app = FastAPI(title="SkillPath AI", lifespan=lifespan)

# ===================== CORS =====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ===================== AUTH =====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True,
        hardness_index=1.0
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == credentials.email))
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

# ===================== ROADMAP =====================

@api_router.post("/roadmap")
async def create_roadmap(
    roadmap_data: RoadmapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    roadmap_structure = await generate_ai_roadmap(
        roadmap_data.topic,
        roadmap_data.time,
        roadmap_data.knowledge_level
    )

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


@api_router.get("/roadmap/{topic}")
async def get_roadmap_by_topic(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Roadmap).filter(
            and_(Roadmap.user_id == current_user.id, Roadmap.topic == topic)
        )
    )
    roadmap = result.scalars().first()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    return {
        "topic": roadmap.topic,
        "knowledge_level": roadmap.knowledge_level,
        "time": roadmap.time,
        "roadmap_data": roadmap.roadmap_data
    }


@api_router.get("/roadmaps")
async def get_user_roadmaps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Roadmap).filter(Roadmap.user_id == current_user.id))
    roadmaps = result.scalars().all()

    return [
        {
            "topic": rm.topic,
            "time": rm.time,
            "knowledge_level": rm.knowledge_level,
            "created_at": rm.created_at
        }
        for rm in roadmaps
    ]

# ===================== QUIZ =====================

@api_router.post("/quiz")
async def generate_quiz(request: QuizRequest):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
        Generate 5 multiple choice questions for:
        Course: {request.course}
        Topic: {request.topic}

        Return JSON format:
        [
          {{
            "question": "string",
            "options": ["A","B","C","D"],
            "answer": "correct option"
          }}
        ]
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except Exception:
        return [
            {
                "question": "Sample question?",
                "options": ["A", "B", "C", "D"],
                "answer": "A"
            }
        ]

# ===================== RESOURCES =====================

@api_router.post("/generate-resources")
async def generate_resources(request: ResourceRequest):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
        Generate helpful learning resources in markdown for:

        Course: {request.course}
        Topic Description: {request.description}
        Study Time: {request.time}

        Include:
        - YouTube suggestions
        - Articles
        - Practice problems
        - Books
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        return {
            "resources": response.choices[0].message.content
        }

    except Exception:
        return {
            "resources": "Failed to generate resources. Please try again."
        }

# ===================== DASHBOARD =====================

@api_router.get("/dashboard/stats")
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    roadmap_count = await db.scalar(
        select(func.count()).select_from(Roadmap).filter(Roadmap.user_id == current_user.id)
    )

    quiz_count = await db.scalar(
        select(func.count()).select_from(QuizStat).filter(QuizStat.user_id == current_user.id)
    )

    return {
        "total_courses": roadmap_count or 0,
        "completed_quizzes": quiz_count or 0,
        "hardness_index": current_user.hardness_index,
        "progress": {}
    }

# ===================== HEALTH =====================

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ===================== AI ROADMAP =====================

async def generate_ai_roadmap(topic, time, level):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
        Generate structured learning roadmap JSON for {topic}
        for {level} level in {time} duration.

        Format:
        {{
          "Week 1": {{
            "topic": "string",
            "subtopics": [
              {{
                "subtopic": "string",
                "description": "string",
                "time": "string"
              }}
            ]
          }}
        }}

        Return ONLY valid JSON.
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except Exception:
        return {
            "Week 1": {
                "topic": "Introduction",
                "subtopics": [
                    {
                        "subtopic": "Basics",
                        "description": "Learn fundamentals",
                        "time": "2 hours"
                    }
                ]
            }
        }

# ===================== INCLUDE ROUTER =====================

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
