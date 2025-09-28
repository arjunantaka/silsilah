#!/usr/bin/env python3
import sys
sys.path.append('/root/keluarga/backend')

from keluarga_backend.database import get_session
from keluarga_backend.models import FamilyGroup
from sqlmodel import select

def test_database():
    """Test database connection and query"""
    try:
        # First create tables
        from keluarga_backend.database import create_db_and_tables
        create_db_and_tables()
        print("Tables created successfully!")
        
        session_gen = get_session()
        session = next(session_gen)
        
        # Test simple query
        statement = select(FamilyGroup).where(FamilyGroup.deleted_at == None)
        results = session.exec(statement).all()
        print(f"Found {len(results)} family groups")
        
        session.close()
        print("Database test successful!")
        return True
    except Exception as e:
        print(f"Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_database()