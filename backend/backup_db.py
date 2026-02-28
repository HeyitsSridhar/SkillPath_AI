"""
Database backup utility for SkillPath AI
"""
import shutil
import asyncio
from pathlib import Path
from datetime import datetime
from database import AsyncSessionLocal
from sqlalchemy import select
from models import User, Roadmap, QuizStat
import logging

logger = logging.getLogger(__name__)

async def create_backup():
    """Create a backup of the database with user count verification"""
    try:
        # Get current database stats before backup
        async with AsyncSessionLocal() as session:
            user_count = len((await session.execute(select(User))).scalars().all())
            roadmap_count = len((await session.execute(select(Roadmap))).scalars().all())
            quiz_count = len((await session.execute(select(QuizStat))).scalars().all())
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path(__file__).parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        
        backup_file = backup_dir / f"skillpath_backup_{timestamp}.db"
        original_db = Path(__file__).parent / "skillpath.db"
        
        # Copy the database file
        shutil.copy2(original_db, backup_file)
        
        logger.info(f"Database backup created: {backup_file}")
        logger.info(f"Backup contains: {user_count} users, {roadmap_count} roadmaps, {quiz_count} quiz stats")
        
        return {
            "success": True,
            "backup_file": str(backup_file),
            "stats": {
                "users": user_count,
                "roadmaps": roadmap_count,
                "quiz_stats": quiz_count
            }
        }
        
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def restore_backup(backup_file: str):
    """Restore database from backup (use with caution)"""
    try:
        backup_path = Path(backup_file)
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_file}")
        
        original_db = Path(__file__).parent / "skillpath.db"
        
        # Create backup of current database before restore
        current_backup = original_db.with_suffix(f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        shutil.copy2(original_db, current_backup)
        
        # Restore from backup
        shutil.copy2(backup_path, original_db)
        
        logger.info(f"Database restored from: {backup_file}")
        logger.info(f"Previous database backed up to: {current_backup}")
        
        return {"success": True, "previous_backup": str(current_backup)}
        
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    asyncio.run(create_backup())
