from typing import List, Dict, Optional, Tuple, Any
from sqlmodel import Session, text
from ..models import Person, ParentChild, Union, FamilyGroup
from datetime import datetime


class LineageCodeService:
    """Service untuk mengelola kode silsilah dengan sistem A/P/B/C"""
    
    # Mapping generasi ke huruf
    GENERATION_LETTERS = ["A", "P", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_family_root(self, family_group_id: int) -> Optional[Person]:
        """Dapatkan root person dari family group"""
        family_group = self.session.get(FamilyGroup, family_group_id)
        if not family_group or not family_group.root_id:
            return None
        return self.session.get(Person, family_group.root_id)
    
    def get_children_ordered(self, parent_id: int) -> List[Dict[str, Any]]:
        """Ambil anak-anak dari parent, diurutkan berdasarkan birth_order, tanggal_lahir, lalu nama"""
        from sqlmodel import select, func
        
        stmt = (
            select(Person, ParentChild.birth_order)
            .select_from(Person)
            .join(ParentChild, Person.id == ParentChild.child_id)
            .where(ParentChild.parent_id == parent_id)
            .where(Person.deleted_at == None)
            .order_by(
                func.coalesce(ParentChild.birth_order, 999),
                func.coalesce(Person.tanggal_lahir, "1900-01-01"),
                Person.nama_lengkap
            )
        )
        
        results = self.session.exec(stmt).all()
        
        children = []
        for person, birth_order in results:
            child_data = {
                "id": person.id,
                "nama_lengkap": person.nama_lengkap,
                "tanggal_lahir": person.tanggal_lahir,
                "tempat_lahir": person.tempat_lahir,
                "alamat": person.alamat,
                "pekerjaan_sekolah": person.pekerjaan_sekolah,
                "gender": person.gender,
                "catatan": person.catatan,
                "lineage_code": person.lineage_code,
                "family_group_id": person.family_group_id,
                "birth_order": birth_order
            }
            children.append(child_data)
        
        return children
    
    def build_lineage_code(self, person_id: int, root_id: int) -> str:
        """Bangun kode lineage untuk person berdasarkan jalur dari root"""
        if person_id == root_id:
            return "ROOT"
        
        # Trace path dari root ke person
        path = self._find_path_to_person(root_id, person_id)
        if not path:
            return ""
        
        # Bangun kode berdasarkan path
        code_parts = []
        for i, (parent_id, child_id) in enumerate(path):
            # Dapatkan posisi child dalam daftar children dari parent
            children = self.get_children_ordered(parent_id)
            child_position = 1
            for idx, child in enumerate(children):
                if child["id"] == child_id:
                    child_position = idx + 1
                    break
            
            # Tentukan huruf generasi
            if i < len(self.GENERATION_LETTERS):
                letter = self.GENERATION_LETTERS[i]
                code_parts.append(f"{letter}{child_position}")
            else:
                # Fallback jika lebih dari 26 generasi
                code_parts.append(f"Z{child_position}")
        
        return "".join(code_parts)
    
    def _find_path_to_person(self, root_id: int, target_id: int, path: Optional[List[Tuple[int, int]]] = None) -> Optional[List[Tuple[int, int]]]:
        """Cari jalur dari root ke target person menggunakan DFS"""
        if path is None:
            path = []
        
        if root_id == target_id:
            return path
        
        children = self.get_children_ordered(root_id)
        for child in children:
            if child["id"]:
                new_path = path + [(root_id, child["id"])]
                result = self._find_path_to_person(child["id"], target_id, new_path)
                if result is not None:
                    return result
        
        return None
    
    def recalculate_all_codes(self, family_group_id: int) -> Dict[str, Any]:
        """Recalculate semua kode lineage dalam family group"""
        root = self.get_family_root(family_group_id)
        if not root or not root.id:
            return {"success": False, "message": "Root person tidak ditemukan"}
        
        # Ambil semua person dalam family group
        from sqlmodel import select
        stmt = select(Person).where(
            Person.family_group_id == family_group_id
        ).where(
            Person.deleted_at == None
        )
        persons = self.session.exec(stmt).all()
        result = [(p.id, p.nama_lengkap, p.lineage_code) for p in persons]
        
        updated_count = 0
        changes = []
        
        for row in result:
            person_id = row[0]
            nama = row[1]
            old_code = row[2]
            
            if root.id is None:
                continue
            new_code = self.build_lineage_code(person_id, root.id)
            
            if old_code != new_code:
                # Update kode
                person_to_update = self.session.get(Person, person_id)
                if person_to_update:
                    person_to_update.lineage_code = new_code
                    person_to_update.updated_at = datetime.utcnow()
                    self.session.add(person_to_update)
                
                changes.append({
                    "person_id": person_id,
                    "nama": nama,
                    "old_code": old_code,
                    "new_code": new_code
                })
                updated_count += 1
        
        # Commit perubahan
        self.session.commit()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "total_persons": len(result),
            "changes": changes,
            "root_person": {
                "id": root.id,
                "nama": root.nama_lengkap,
                "code": root.lineage_code
            }
        }
    
    def get_descendants_table(self, person_id: int) -> List[Dict[str, Any]]:
        """Dapatkan tabel keturunan dari person tertentu"""
        person = self.session.get(Person, person_id)
        if not person:
            return []
        
        descendants = []
        self._collect_descendants(person_id, descendants)
        
        # Format hasil untuk tabel
        table_data = []
        for desc in descendants:
            # Ambil info pasangan
            pasangan_info = self._get_spouse_info(desc["id"])
            
            # Ambil info orang tua
            parents_info = self._get_parents_info(desc["id"])
            
            table_data.append({
                "kode": desc["lineage_code"],
                "nama": desc["nama_lengkap"],
                "tempat_lahir": desc["tempat_lahir"],
                "tanggal_lahir": desc["tanggal_lahir"].strftime("%d-%m-%Y") if desc["tanggal_lahir"] else "",
                "alamat": desc["alamat"],
                "pekerjaan_sekolah": desc["pekerjaan_sekolah"],
                "pasangan": pasangan_info,
                "orang_tua": parents_info,
                "gender": desc["gender"],
                "catatan": desc["catatan"]
            })
        
        # Urutkan berdasarkan kode
        table_data.sort(key=lambda x: x["kode"])
        return table_data
    
    def _collect_descendants(self, person_id: int, descendants: List[Dict[str, Any]]):
        """Kumpulkan semua keturunan secara rekursif"""
        # Ambil data person
        person = self.session.get(Person, person_id)
        if not person or person.deleted_at is not None:
            return
        
        result = (person.id, person.nama_lengkap, person.tanggal_lahir, person.tempat_lahir,
                 person.alamat, person.pekerjaan_sekolah, person.gender, person.catatan, person.lineage_code)
        
        if result:
            person_data = {
                "id": result[0],
                "nama_lengkap": result[1],
                "tanggal_lahir": result[2],
                "tempat_lahir": result[3],
                "alamat": result[4],
                "pekerjaan_sekolah": result[5],
                "gender": result[6],
                "catatan": result[7],
                "lineage_code": result[8]
            }
            descendants.append(person_data)
        
        children = self.get_children_ordered(person_id)
        for child in children:
            if child["id"]:
                self._collect_descendants(child["id"], descendants)
    
    def _get_spouse_info(self, person_id: int) -> str:
        """Dapatkan informasi pasangan"""
        from sqlmodel import select, or_
        
        stmt = (
            select(Person.nama_lengkap)
            .select_from(Person)
            .join(Union, or_(Person.id == Union.partner1_id, Person.id == Union.partner2_id))
            .where(or_(Union.partner1_id == person_id, Union.partner2_id == person_id))
            .where(Person.id != person_id)
            .where(Union.deleted_at == None)
            .where(Union.status == 'menikah')
        )
        
        result = self.session.exec(stmt).all()
        spouses = [row for row in result]
        return ", ".join(spouses) if spouses else ""
    
    def _get_parents_info(self, person_id: int) -> str:
        """Dapatkan informasi orang tua"""
        from sqlmodel import select, case
        
        stmt = (
            select(Person.nama_lengkap, Person.gender)
            .select_from(Person)
            .join(ParentChild, Person.id == ParentChild.parent_id)
            .where(ParentChild.child_id == person_id)
            .where(Person.deleted_at == None)
            .order_by(
                case((Person.gender == 'L', 1), else_=2),
                Person.nama_lengkap
            )
        )
        
        result = self.session.exec(stmt).all()
        parent_names = [row[0] for row in result]
        return " & ".join(parent_names) if parent_names else ""


class ValidationService:
    """Service untuk validasi data keluarga"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def validate_person_data(self, person_data: Dict) -> Dict[str, Any]:
        """Validasi data person sebelum disimpan"""
        errors = []
        
        # Field wajib
        required_fields = ["nama_lengkap", "tempat_lahir", "alamat", "pekerjaan_sekolah"]
        for field in required_fields:
            if not person_data.get(field, "").strip():
                errors.append(f"Field {field} wajib diisi")
        
        # Validasi tanggal
        if person_data.get("tanggal_lahir"):
            try:
                if isinstance(person_data["tanggal_lahir"], str):
                    datetime.strptime(person_data["tanggal_lahir"], "%Y-%m-%d")
            except ValueError:
                errors.append("Format tanggal_lahir tidak valid (gunakan YYYY-MM-DD)")
        
        # Validasi gender
        if person_data.get("gender") not in ["L", "P", "unknown"]:
            errors.append("Gender harus L, P, atau unknown")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def validate_parent_child_relation(self, parent_id: int, child_id: int) -> Dict[str, Any]:
        """Validasi relasi orang tua-anak"""
        errors = []
        
        # Tidak boleh sama
        if parent_id == child_id:
            errors.append("Orang tua dan anak tidak boleh sama")
        
        # Cek apakah sudah ada relasi sebaliknya (child sebagai parent dari parent)
        from sqlmodel import select
        reverse_stmt = select(ParentChild).where(
            ParentChild.parent_id == child_id,
            ParentChild.child_id == parent_id,
            ParentChild.deleted_at == None
        )
        reverse_relation = self.session.exec(reverse_stmt).first()
        if reverse_relation:
            errors.append("Relasi circular terdeteksi")
        
        # Cek apakah relasi sudah ada
        existing_stmt = select(ParentChild).where(
            ParentChild.parent_id == parent_id,
            ParentChild.child_id == child_id,
            ParentChild.deleted_at == None
        )
        existing_relation = self.session.exec(existing_stmt).first()
        if existing_relation:
            errors.append("Relasi sudah ada")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }