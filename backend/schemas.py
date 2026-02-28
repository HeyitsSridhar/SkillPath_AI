from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)
    role: Optional[str] = "user"
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "password": "SecurePass123!",
                "role": "user"
            }
        }

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    hardness_index: Optional[float] = None

class UserUpdateByAdmin(UserUpdate):
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: str
    avatar: str
    hardness_index: float
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Roadmap Schemas
class RoadmapCreate(BaseModel):
    topic: str
    time: str
    knowledge_level: str

class RoadmapResponse(BaseModel):
    id: int
    topic: str
    time: str
    knowledge_level: str
    roadmap_data: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Quiz Schemas
class QuizRequest(BaseModel):
    course: str
    topic: str
    subtopic: str
    description: str

class QuizStatCreate(BaseModel):
    topic: str
    week_num: int
    subtopic_num: int
    num_correct: int
    num_questions: int
    time_taken: int

class QuizStatResponse(BaseModel):
    id: int
    topic: str
    week_num: int
    subtopic_num: int
    num_correct: int
    num_questions: int
    time_taken: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Resource Generation
class ResourceRequest(BaseModel):
    course: str
    knowledge_level: str
    description: str
    time: str

# Dashboard Stats
class DashboardStats(BaseModel):
    total_courses: int
    completed_quizzes: int
    hardness_index: float
    progress: Dict[str, Dict[str, Any]]

class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_roadmaps: int
    total_quizzes: int
    recent_users: List[UserResponse]
