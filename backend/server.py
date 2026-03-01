from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Dict, Any, AsyncGenerator
import os
import logging
from pathlib import Path
from datetime import timedelta, datetime, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from groq import Groq

from database import get_db, init_db, AsyncSessionLocal, engine, Base
from models import User, Roadmap, QuizStat
from schemas import *
from auth import *

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ==================== LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SkillPath AI backend...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield
    logger.info("Shutting down backend...")
    await engine.dispose()

# ==================== APP INIT ====================

app = FastAPI(title="SkillPath AI", lifespan=lifespan)

# ==================== CORS (FINAL FIX) ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],  # empty when using regex
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ROUTER ====================

api_router = APIRouter(prefix="/api")

# ==================== LOGGING ====================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"\n=== {request.method} {request.url} ===")
    response = await call_next(request)
    print(f"Response: {response.status_code}")
    return response

# ==================== AUTH ROUTES ====================

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
        is_active=True,
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

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "skillpath-ai-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
