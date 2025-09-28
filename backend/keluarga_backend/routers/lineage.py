"""
Lineage management API endpoints - Updated for A/P/B/C coding system
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session
import csv
import json
from io import StringIO

from ..database import get_session
from ..services import LineageCodeService, ValidationService

router = APIRouter(prefix="/api/lineage", tags=["Lineage"])


class SetRootRequest(BaseModel):
    """Request model for setting family root"""
    person_id: int


@router.post("/codes/recalculate/{family_group_id}")
def recalculate_lineage_codes(
    family_group_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Recalculate semua kode lineage dalam family group menggunakan sistem A/P/B/C
    """
    service = LineageCodeService(session)
    
    try:
        result = service.recalculate_all_codes(family_group_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation failed: {str(e)}")


@router.get("/descendants/{person_id}")
def get_descendants_table(
    person_id: int,
    format: str = Query("json", regex="^(json|csv)$"),
    session: Session = Depends(get_session)
):
    """
    Dapatkan tabel keturunan dari person tertentu
    Hasil mencakup kode, nama, TTL, alamat, pekerjaan, pasangan, orang tua
    """
    service = LineageCodeService(session)
    
    try:
        # Validasi person exists
        from ..models import Person
        person = session.get(Person, person_id)
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        
        # Ambil data descendants
        descendants_data = service.get_descendants_table(person_id)
        
        if format == "csv":
            # Export sebagai CSV
            output = StringIO()
            if descendants_data:
                fieldnames = descendants_data[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(descendants_data)
            
            content = output.getvalue()
            output.close()
            
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=keturunan_{person.nama_lengkap.replace(' ', '_')}.csv"}
            )
        
        # Default: return JSON
        return {
            "person": {
                "id": person.id,
                "nama": person.nama_lengkap,
                "kode": person.lineage_code
            },
            "total_descendants": len(descendants_data),
            "descendants": descendants_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get descendants: {str(e)}")


@router.patch("/family-groups/{family_group_id}/root")
def set_family_root(
    family_group_id: int,
    request: SetRootRequest,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Set root person untuk family group dan trigger recalculation
    """
    try:
        # Validasi family group dan person
        from ..models import FamilyGroup, Person
        family_group = session.get(FamilyGroup, family_group_id)
        if not family_group:
            raise HTTPException(status_code=404, detail="Family group not found")
        
        person = session.get(Person, request.person_id)
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        
        if person.family_group_id != family_group_id:
            raise HTTPException(status_code=400, detail="Person not in specified family group")
        
        # Set root
        family_group.root_id = request.person_id
        session.add(family_group)
        session.commit()
        
        # Trigger recalculation
        service = LineageCodeService(session)
        recalc_result = service.recalculate_all_codes(family_group_id)
        
        return {
            "message": "Root person set and codes recalculated",
            "family_group_id": family_group.id,
            "root_person_id": family_group.root_id,
            "recalculation": recalc_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set root: {str(e)}")


@router.get("/validate/person/{person_id}")
def validate_person_data(
    person_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Validasi data person untuk kelengkapan field wajib
    """
    validation_service = ValidationService(session)
    
    from ..models import Person
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Convert person to dict for validation
    person_data = {
        "nama_lengkap": person.nama_lengkap,
        "tempat_lahir": person.tempat_lahir,
        "tanggal_lahir": person.tanggal_lahir,
        "alamat": person.alamat,
        "pekerjaan_sekolah": person.pekerjaan_sekolah,
        "gender": person.gender
    }
    
    result = validation_service.validate_person_data(person_data)
    
    return {
        "person_id": person_id,
        "nama": person.nama_lengkap,
        "validation": result
    }


@router.get("/codes/explain/{person_id}")
def explain_lineage_code(
    person_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Jelaskan makna kode lineage untuk person tertentu
    """
    service = LineageCodeService(session)
    
    from ..models import Person
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    root = service.get_family_root(person.family_group_id)
    if not root:
        return {
            "person_id": person_id,
            "nama": person.nama_lengkap,
            "kode": person.lineage_code,
            "explanation": "Root belum ditetapkan untuk family group ini"
        }
    
    # Parse kode untuk penjelasan
    code = person.lineage_code
    if code == "ROOT":
        explanation = f"Akar/Trah keluarga ({person.nama_lengkap})"
    elif not code:
        explanation = "Kode belum digenerate"
    else:
        # Parse komponen kode
        explanation_parts = []
        i = 0
        generation_level = 0
        
        while i < len(code):
            if i + 1 < len(code) and code[i].isalpha() and code[i + 1:].lstrip('0123456789') != code[i + 1:]:
                # Ambil huruf dan angka
                letter = code[i]
                num_end = i + 1
                while num_end < len(code) and code[num_end].isdigit():
                    num_end += 1
                number = code[i + 1:num_end]
                
                # Tentukan makna berdasarkan huruf
                if letter == 'A':
                    explanation_parts.append(f"Anak ke-{number} dari ROOT")
                elif letter == 'P':
                    explanation_parts.append(f"Cucu ke-{number}")
                elif letter == 'B':
                    explanation_parts.append(f"Buyut ke-{number}")
                elif letter == 'C':
                    explanation_parts.append(f"Canggah ke-{number}")
                else:
                    explanation_parts.append(f"Generasi {letter} ke-{number}")
                
                i = num_end
            else:
                i += 1
        
        explanation = " → ".join(explanation_parts) if explanation_parts else "Format kode tidak dikenali"
    
    return {
        "person_id": person_id,
        "nama": person.nama_lengkap,
        "kode": code,
        "explanation": explanation,
        "root_person": {
            "id": root.id,
            "nama": root.nama_lengkap
        } if root else None
    }