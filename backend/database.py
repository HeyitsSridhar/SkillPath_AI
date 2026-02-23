from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
import os
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Optional

ROOT_DIR = Path(__file__).parent
DATABASE_URL = f"sqlite+aiosqlite:///{ROOT_DIR}/skillpath.db"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Create base model
Base = declarative_base()

# Dependency to get DB session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Initialize database
async def init_db():
    try:
        # Import models to ensure they are registered with SQLAlchemy
        from models import User
        from auth import get_password_hash
        
        # Create tables first
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Wait a moment for tables to be fully created
        await asyncio.sleep(0.1)
        
        # Now check if admin user exists
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            result = await session.execute(select(User).filter(User.email == "admin@skillpath.ai"))
            admin = result.scalars().first()
            
            if not admin:
                # Use simple hash for now to bypass bcrypt issue
                import hashlib
                hashed_password = hashlib.sha256("admin123".encode()).hexdigest()
                admin = User(
                    email="admin@skillpath.ai",
                    username="admin",
                    full_name="Admin User",
                    hashed_password=hashed_password,
                    role="admin",
                    is_active=True
                )
                session.add(admin)
                await session.commit()
                print("Admin user created successfully!")
            else:
                print("Admin user already exists.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

# For running initialization directly
if __name__ == "__main__":
    asyncio.run(init_db())
