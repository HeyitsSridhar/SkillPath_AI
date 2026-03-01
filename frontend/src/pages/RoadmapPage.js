from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from groq import Groq
import os
import json

from database import get_db, init_db, engine
from models import User, Roadmap
from schemas import *
from auth import *

load_dotenv()

# ==============================
# Lifespan
# ==============================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await engine.dispose()

app = FastAPI(title="SkillPath AI", lifespan=lifespan)

# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ==============================
# AUTH
# ==============================

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
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == credentials.email))
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

# ==============================
# ROADMAP
# ==============================

@api_router.post("/roadmap")
async def create_roadmap(
    roadmap_data: RoadmapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    roadmap_structure = await generate_ai_roadmap(
        roadmap_data.topic,
        roadmap_data.time,
        roadmap_data.knowledge_level,
    )

    new_roadmap = Roadmap(
        user_id=current_user.id,
        topic=roadmap_data.topic,
        time=roadmap_data.time,
        knowledge_level=roadmap_data.knowledge_level,
        roadmap_data=roadmap_structure,
    )

    db.add(new_roadmap)
    await db.commit()
    await db.refresh(new_roadmap)

    return roadmap_structure


@api_router.get("/roadmap/{topic}")
async def get_roadmap_by_topic(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Roadmap).filter(
            and_(Roadmap.user_id == current_user.id, Roadmap.topic == topic)
        )
    )
    roadmap = result.scalars().first()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    return roadmap.roadmap_data

# ==============================
# GENERATE RESOURCES
# ==============================

@api_router.post("/generate-resources")
async def generate_resources(data: dict):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
Generate detailed study resources in markdown format.

Course: {data.get("course")}
Topic Description: {data.get("description")}
Time Allocation: {data.get("time")}

Include:
- Learning explanation
- Recommended YouTube topics
- Practice platforms
- Mini project idea
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        return {"resources": response.choices[0].message.content.strip()}

    except Exception:
        return {
            "resources": """
### Study Resources

- 📘 Read official documentation
- 🎥 Watch structured tutorials
- 💻 Practice exercises
- 🚀 Build small mini projects
"""
        }

# ==============================
# QUIZ GENERATION
# ==============================

@api_router.post("/quiz")
async def generate_quiz(data: dict):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
Generate 5 multiple choice questions.

Topic: {data.get("topic")}

Return ONLY valid JSON in this format:

[
  {{
    "question": "...",
    "options": ["A", "B", "C", "D"],
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
                "question": "What is an algorithm?",
                "options": [
                    "Step-by-step procedure",
                    "Database",
                    "Framework",
                    "Compiler"
                ],
                "answer": "Step-by-step procedure"
            }
        ]

# ==============================
# AI ROADMAP GENERATION
# ==============================

async def generate_ai_roadmap(topic, time, level):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
Generate a COMPLETE learning roadmap.

Topic: {topic}
Level: {level}
Duration: {time}

IMPORTANT:
- Generate AT LEAST 4 weeks
- Each week must contain 3 to 5 subtopics
- Each subtopic must include description and time
- Return ONLY valid JSON

Format:
{{
  "title": "...",
  "duration": "...",
  "weeks": [
    {{
      "week": 1,
      "topic": "...",
      "subtopics": [
        {{
          "subtopic": "...",
          "description": "...",
          "time": "2 hours"
        }}
      ]
    }}
  ]
}}
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        data = json.loads(content)

        # Normalize for frontend
        roadmap_dict = {}

        for week in data.get("weeks", []):
            roadmap_dict[f"Week {week['week']}"] = {
                "topic": week.get("topic"),
                "subtopics": week.get("subtopics", []),
            }

        return roadmap_dict

    except Exception:
        return {
            "Week 1": {
                "topic": "Introduction",
                "subtopics": [
                    {
                        "subtopic": "Basics",
                        "description": "Learn the fundamentals",
                        "time": "2 hours"
                    }
                ]
            }
        }

# ==============================
# HEALTH
# ==============================

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
