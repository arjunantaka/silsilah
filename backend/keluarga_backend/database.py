import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/keluarga.db")

engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """Create database and tables"""
    # Import models to register them
    from . import models
    
    # Ensure data directory exists
    os.makedirs("./data", exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """Get database session"""
    with Session(engine) as session:
        yield session