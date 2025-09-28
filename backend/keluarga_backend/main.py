from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import create_db_and_tables
from .routers import family_groups, persons, unions, lineage, relations

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Silsilah Keluarga API",
    description="Family tree management system for Javanese families",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(family_groups.router, prefix="/api", tags=["Family Groups"])
app.include_router(persons.router, prefix="/api", tags=["Persons"])
app.include_router(unions.router, prefix="/api", tags=["Unions"])
app.include_router(lineage.router)
app.include_router(relations.router)

@app.get("/")
async def root():
    return {"message": "Silsilah Keluarga API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}