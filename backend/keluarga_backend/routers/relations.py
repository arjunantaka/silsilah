"""
Parent-Child relationship management API endpoints
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime

from ..database import get_session
from ..models import ParentChild, Person

router = APIRouter(prefix="/api/relations", tags=["Relations"])


class CreateRelationRequest(BaseModel):
    """Request model for creating parent-child relation"""
    parent_id: int
    child_id: int
    union_id: Optional[int] = None
    jenis: str = "biological"  # biological, adoptive, step
    birth_order: int


class UpdateRelationRequest(BaseModel):
    """Request model for updating relation"""
    birth_order: Optional[int] = None
    jenis: Optional[str] = None


class ReorderRequest(BaseModel):
    """Request model for batch reordering birth_order"""
    relations: List[Dict[str, int]]  # [{"relation_id": 1, "birth_order": 1}, ...]


@router.get("")
def list_relations(
    parent_id: Optional[int] = None,
    child_id: Optional[int] = None,
    union_id: Optional[int] = None,
    session: Session = Depends(get_session)
) -> List[ParentChild]:
    """
    List parent-child relations with optional filters
    """
    stmt = select(ParentChild).where(ParentChild.deleted_at == None)
    
    if parent_id:
        stmt = stmt.where(ParentChild.parent_id == parent_id)
    if child_id:
        stmt = stmt.where(ParentChild.child_id == child_id)
    if union_id:
        stmt = stmt.where(ParentChild.union_id == union_id)
    
    stmt = stmt.order_by(ParentChild.union_id, ParentChild.birth_order)
    
    return session.exec(stmt).all()


@router.post("")
def create_relation(
    request: CreateRelationRequest,
    session: Session = Depends(get_session)
) -> ParentChild:
    """
    Create parent-child relation
    """
    # Validate parent and child exist
    parent = session.get(Person, request.parent_id)
    child = session.get(Person, request.child_id)
    
    if not parent:
        raise HTTPException(status_code=404, detail="Parent person not found")
    if not child:
        raise HTTPException(status_code=404, detail="Child person not found")
    
    # Check if relation already exists
    existing = session.exec(
        select(ParentChild)
        .where(ParentChild.parent_id == request.parent_id)
        .where(ParentChild.child_id == request.child_id)
        .where(ParentChild.deleted_at == None)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Relation already exists")
    
    # Check birth_order uniqueness within union
    if request.union_id:
        existing_order = session.exec(
            select(ParentChild)
            .where(ParentChild.union_id == request.union_id)
            .where(ParentChild.birth_order == request.birth_order)
            .where(ParentChild.deleted_at == None)
        ).first()
        
        if existing_order:
            raise HTTPException(
                status_code=400, 
                detail=f"Birth order {request.birth_order} already exists in union {request.union_id}"
            )
    
    # Create relation
    relation = ParentChild(
        parent_id=request.parent_id,
        child_id=request.child_id,
        union_id=request.union_id,
        jenis=request.jenis,
        birth_order=request.birth_order
    )
    
    session.add(relation)
    session.commit()
    session.refresh(relation)
    
    return relation


@router.patch("/{relation_id}")
def update_relation(
    relation_id: int,
    request: UpdateRelationRequest,
    session: Session = Depends(get_session)
) -> ParentChild:
    """
    Update parent-child relation
    """
    relation = session.get(ParentChild, relation_id)
    if not relation or relation.deleted_at:
        raise HTTPException(status_code=404, detail="Relation not found")
    
    # Update fields if provided
    if request.birth_order is not None:
        # Check birth_order uniqueness within union
        if relation.union_id:
            existing_order = session.exec(
                select(ParentChild)
                .where(ParentChild.union_id == relation.union_id)
                .where(ParentChild.birth_order == request.birth_order)
                .where(ParentChild.id != relation_id)
                .where(ParentChild.deleted_at == None)
            ).first()
            
            if existing_order:
                raise HTTPException(
                    status_code=400,
                    detail=f"Birth order {request.birth_order} already exists in union {relation.union_id}"
                )
        
        relation.birth_order = request.birth_order
    
    if request.jenis is not None:
        relation.jenis = request.jenis
    
    relation.updated_at = datetime.utcnow()
    
    session.add(relation)
    session.commit()
    session.refresh(relation)
    
    return relation


@router.delete("/{relation_id}")
def delete_relation(
    relation_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, str]:
    """
    Soft delete parent-child relation
    """
    relation = session.get(ParentChild, relation_id)
    if not relation or relation.deleted_at:
        raise HTTPException(status_code=404, detail="Relation not found")
    
    # Soft delete
    relation.deleted_at = datetime.utcnow()
    
    session.add(relation)
    session.commit()
    
    return {"message": "Relation deleted successfully"}


@router.post("/reorder")
def reorder_relations(
    request: ReorderRequest,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Batch reorder birth_order for multiple relations
    """
    updated_count = 0
    errors = []
    
    for item in request.relations:
        try:
            relation_id = item["relation_id"]
            new_birth_order = item["birth_order"]
            
            relation = session.get(ParentChild, relation_id)
            if not relation or relation.deleted_at:
                errors.append(f"Relation {relation_id} not found")
                continue
            
            # Check birth_order uniqueness within union
            if relation.union_id:
                existing_order = session.exec(
                    select(ParentChild)
                    .where(ParentChild.union_id == relation.union_id)
                    .where(ParentChild.birth_order == new_birth_order)
                    .where(ParentChild.id != relation_id)
                    .where(ParentChild.deleted_at == None)
                ).first()
                
                if existing_order:
                    errors.append(f"Birth order {new_birth_order} already exists in union {relation.union_id}")
                    continue
            
            relation.birth_order = new_birth_order
            relation.updated_at = datetime.utcnow()
            session.add(relation)
            updated_count += 1
            
        except Exception as e:
            errors.append(f"Error updating relation {item.get('relation_id', 'unknown')}: {str(e)}")
    
    session.commit()
    
    return {
        "updated_count": updated_count,
        "errors": errors
    }