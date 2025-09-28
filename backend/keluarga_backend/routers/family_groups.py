from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models import FamilyGroup

router = APIRouter()

@router.get("/family-groups", response_model=List[FamilyGroup])
async def list_family_groups(session: Session = Depends(get_session)):
    """List all family groups"""
    statement = select(FamilyGroup).where(FamilyGroup.deleted_at == None)
    results = session.exec(statement).all()
    return results

@router.get("/family-groups/{group_id}", response_model=FamilyGroup)
async def get_family_group(group_id: int, session: Session = Depends(get_session)):
    """Get family group by ID"""
    statement = select(FamilyGroup).where(
        FamilyGroup.id == group_id,
        FamilyGroup.deleted_at == None
    )
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Family group not found")
    return result

@router.post("/family-groups", response_model=FamilyGroup)
async def create_family_group(group: FamilyGroup, session: Session = Depends(get_session)):
    """Create new family group"""
    session.add(group)
    session.commit()
    session.refresh(group)
    return group