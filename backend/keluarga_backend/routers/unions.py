from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models import Union

router = APIRouter()

@router.get("/unions", response_model=List[Union])
async def list_unions(session: Session = Depends(get_session)):
    """List all unions"""
    statement = select(Union).where(Union.deleted_at == None)
    results = session.exec(statement).all()
    return results

@router.get("/unions/{union_id}", response_model=Union)
async def get_union(union_id: int, session: Session = Depends(get_session)):
    """Get union by ID"""
    statement = select(Union).where(
        Union.id == union_id,
        Union.deleted_at == None
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Union not found")
    return result

@router.post("/unions", response_model=Union)
async def create_union(union: Union, session: Session = Depends(get_session)):
    """Create new union"""
    session.add(union)
    session.commit()
    session.refresh(union)
    return union