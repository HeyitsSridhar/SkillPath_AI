from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
import os
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

# Use environment variable for database URL, fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{ROOT_DIR}/skillpath.db")

# Create async engine with better configuration for production
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging in development
    future=True,
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,  # Better for SQLite
    connect_args={
        "check_same_thread": False,  # Required for SQLite
        "timeout": 20  # Connection timeout
    } if "sqlite" in DATABASE_URL else {}
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
    """Initialize database with better error handling and recovery"""
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Database initialization attempt {attempt + 1}/{max_retries}")
            
            # Import models to ensure they are registered with SQLAlchemy
            from models import User
            from auth import get_password_hash
            
            # Create tables first with better error handling
            try:
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified successfully")
            except Exception as table_error:
                logger.error(f"Error creating tables: {table_error}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(retry_delay)
                continue
            
            # Wait a moment for tables to be fully created
            await asyncio.sleep(0.1)
            
            # Now check if admin user exists
            async with AsyncSessionLocal() as session:
                try:
                    from sqlalchemy import select
                    result = await session.execute(select(User).filter(User.email == "admin@gmail.com"))
                    admin = result.scalars().first()
                    
                    if not admin:
                        # Use simple hash for now to bypass bcrypt issue
                        import hashlib
                        hashed_password = hashlib.sha256("admin123".encode()).hexdigest()
                        admin = User(
                            email="admin@gmail.com",
                            username="admin",
                            full_name="Admin User",
                            hashed_password=hashed_password,
                            role="admin",
                            is_active=True
                        )
                        session.add(admin)
                        await session.commit()
                        logger.info("Admin user created successfully!")
                    else:
                        logger.info("Admin user already exists.")
                        
                    # Verify database connection
                    test_result = await session.execute(select(User).limit(1))
                    logger.info(f"Database connection verified - found {len(test_result.all())} users")
                    
                except Exception as session_error:
                    logger.error(f"Error in database session: {session_error}")
                    await session.rollback()
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(retry_delay)
                    continue
            
            logger.info("Database initialization completed successfully")
            return
            
        except Exception as e:
            logger.error(f"Database initialization attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("All database initialization attempts failed")
                raise

# For running initialization directly
if __name__ == "__main__":
    asyncio.run(init_db())
