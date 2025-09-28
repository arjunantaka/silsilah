from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models import Person

router = APIRouter()

@router.get("/persons", response_model=List[Person])
async def list_persons(session: Session = Depends(get_session)):
    """List all persons"""
    statement = select(Person).where(Person.deleted_at == None)
    results = session.exec(statement).all()
    return results

@router.get("/persons/{person_id}", response_model=Person)
async def get_person(person_id: int, session: Session = Depends(get_session)):
    """Get person by ID"""
    statement = select(Person).where(
        Person.id == person_id,
        Person.deleted_at == None
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")
    return result

@router.post("/persons", response_model=Person)
async def create_person(person: Person, session: Session = Depends(get_session)):
    """Create new person"""
    session.add(person)
    session.commit()
    session.refresh(person)
    return person