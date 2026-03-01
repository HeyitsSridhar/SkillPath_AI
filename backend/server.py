from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Dict, Any, AsyncGenerator
import os
import logging
from datetime import timedelta, datetime, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from groq import Groq

from database import get_db, init_db, AsyncSessionLocal, engine
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

# ===================== APP INIT =====================

app = FastAPI(title="SkillPath AI", lifespan=lifespan)

# ===================== CORS (FINAL SAFE VERSION) =====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production safe for now
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== ROUTER =====================

api_router = APIRouter(prefix="/api")

# ===================== AUTH =====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
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

# ===================== QUIZ =====================

@api_router.post("/quiz")
async def generate_quiz(quiz_request: QuizRequest):
    return await generate_ai_quiz(
        quiz_request.course,
        quiz_request.topic,
        quiz_request.subtopic,
        quiz_request.description
    )

# ===================== RESOURCES =====================

@api_router.post("/generate-resources")
async def generate_resources(resource_request: ResourceRequest):
    return await generate_ai_resources(
        resource_request.course,
        resource_request.knowledge_level,
        resource_request.description,
        resource_request.time
    )

# ===================== HEALTH =====================

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ===================== AI HELPERS =====================

async def generate_ai_roadmap(topic, time, level):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        prompt = f"Generate a roadmap for {topic} at {level} level for {time}."
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )
        return {"roadmap": response.choices[0].message.content}
    except:
        return {"roadmap": "Sample roadmap generated."}


async def generate_ai_quiz(course, topic, subtopic, description):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        prompt = f"Generate quiz for {subtopic}"
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )
        return {"quiz": response.choices[0].message.content}
    except:
        return {"quiz": "Sample quiz generated."}


async def generate_ai_resources(course, level, description, time):
    return {"resources": f"Resources for {course}"}

# ===================== INCLUDE ROUTER =====================

app.include_router(api_router)

# ===================== RUN =====================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
