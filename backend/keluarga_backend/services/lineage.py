"""
Lineage code generation service

Implements the Javanese family lineage code algorithm:
- A (gen-1), P (gen-2), B (gen-3), Cg (gen-4), Wr (gen-5), Ud (gen-6)
- Examples: A1 (first child), A2P3B1 (first child of third child of second child)
"""

from typing import List, Dict, Any, Optional, Tuple
from uuid import uuid4
import logging
from datetime import datetime

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlmodel import Session, select
    from ..database import get_session
    from ..models import Person, Union, ParentChild, FamilyGroup, Settings, RebuildLog
else:
    try:
        from sqlmodel import Session, select
        from ..database import get_session
        from ..models import Person, Union, ParentChild, FamilyGroup, Settings, RebuildLog
    except ImportError:
        # For static analysis when packages aren't installed
        pass

logger = logging.getLogger(__name__)

# Generation labels for Javanese family tree
GENERATION_LABELS = ['A', 'P', 'B', 'Cg', 'Wr', 'Ud']


class LineageService:
    """Service for managing lineage codes"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def rebuild_lineage_codes(
        self, 
        family_group_id: int, 
        start_person_id: Optional[int] = None, 
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Rebuild lineage codes for family group or starting from specific person
        
        Args:
            family_group_id: Target family group
            start_person_id: Optional, for rebuilding specific branch only
            dry_run: If True, return preview without writing to database
            
        Returns:
            Dictionary with total_changes, changes list, and batch_id
        """
        logger.info(f"Starting lineage rebuild for family_group_id={family_group_id}, start_person_id={start_person_id}, dry_run={dry_run}")
        
        # 1. Validate and get root
        family_group = self.session.get(FamilyGroup, family_group_id)
        if not family_group:
            raise ValueError(f"Family group {family_group_id} not found")
        
        if not family_group.root_id:
            raise ValueError("Family group does not have a root person set")
        
        root_person = self.session.get(Person, family_group.root_id)
        if not root_person:
            raise ValueError(f"Root person {family_group.root_id} not found")
        
        # 2. Track changes
        changes = []
        
        # 3. Recursive traversal function
        def traverse_descendants(person_id: int, path: List[int], depth: int):
            """Recursively traverse descendants and generate codes"""
            
            person = self.session.get(Person, person_id)
            if not person or person.deleted_at:
                return
            
            # Generate code for this person
            if depth == 0:
                # Root person
                lineage_path = ""
                lineage_code = "ROOT"
            else:
                lineage_path = "." + ".".join(map(str, path)) + "."
                
                # Generate readable code
                code_parts = []
                for i, order in enumerate(path):
                    if i < len(GENERATION_LABELS):
                        code_parts.append(f"{GENERATION_LABELS[i]}{order}")
                    else:
                        # Beyond Ud (6th generation), use G7, G8, etc.
                        code_parts.append(f"G{i+1}_{order}")
                lineage_code = "".join(code_parts)
            
            # Record change if different
            if person.lineage_code != lineage_code or person.lineage_path != lineage_path:
                changes.append({
                    'person_id': person_id,
                    'person_name': person.nama_lengkap,
                    'old_code': person.lineage_code,
                    'new_code': lineage_code,
                    'old_path': person.lineage_path,
                    'new_path': lineage_path
                })
            
            # Update if not dry run
            if not dry_run:
                person.lineage_path = lineage_path
                person.lineage_code = lineage_code
                person.updated_at = datetime.utcnow()
                self.session.add(person)
            
            # Get children ordered by birth_order
            children = self.get_children_ordered_by_birth_order(person_id)
            
            for child_data in children:
                child_id = child_data['person_id']
                birth_order = child_data['birth_order']
                
                # Check if this child should follow this parent's lineage
                if self.should_follow_lineage(child_id, person_id, family_group_id):
                    new_path = path + [birth_order]
                    traverse_descendants(child_id, new_path, depth + 1)
        
        # 4. Start traversal
        if start_person_id:
            start_person = self.session.get(Person, start_person_id)
            if not start_person:
                raise ValueError(f"Start person {start_person_id} not found")
            
            # Extract path from existing lineage_path
            start_path = self.parse_lineage_path(start_person.lineage_path)
            start_depth = len(start_path)
            traverse_descendants(start_person_id, start_path, start_depth)
        else:
            traverse_descendants(root_person.id, [], 0)
        
        # 5. Commit changes and log
        batch_id = None
        if not dry_run and changes:
            batch_id = str(uuid4())
            self.session.commit()
            self.log_rebuild_changes(batch_id, changes)
        
        logger.info(f"Lineage rebuild completed: {len(changes)} changes")
        
        return {
            'total_changes': len(changes),
            'changes': changes[:10] if dry_run else [],  # Preview for dry_run
            'batch_id': batch_id
        }
    
    def should_follow_lineage(self, child_id: int, current_parent_id: int, family_group_id: int) -> bool:
        """
        Determine if child should follow lineage from current_parent
        
        Logic: If child has 2 parents in same family group,
        choose based on lineage_preference setting (matrilineal/patrilineal)
        """
        parents = self.get_parents(child_id, family_group_id)
        
        if len(parents) <= 1:
            return True  # Only one parent, must follow
        
        # Two parents in same family group
        preference = self.get_setting('lineage_preference', 'matrilineal')
        
        if preference == 'matrilineal':
            # Find parent with gender P (female)
            mother = next((p for p in parents if p['gender'] == 'female'), None)
            return current_parent_id == (mother['id'] if mother else parents[0]['id'])
        else:  # patrilineal
            # Find parent with gender L (male)  
            father = next((p for p in parents if p['gender'] == 'male'), None)
            return current_parent_id == (father['id'] if father else parents[0]['id'])
    
    def get_children_ordered_by_birth_order(self, parent_id: int) -> List[Dict[str, Any]]:
        """Get children ordered by birth_order within unions"""
        
        # Query with JOIN to parent_child and union tables
        stmt = (
            select(Person.id, ParentChild.birth_order, ParentChild.union_id)
            .join(ParentChild, Person.id == ParentChild.child_id)
            .where(
                ParentChild.parent_id == parent_id
            )
            .where(Person.deleted_at == None)
            .where(ParentChild.deleted_at == None)
            .order_by(ParentChild.union_id, ParentChild.birth_order)
        )
        
        results = self.session.exec(stmt).all()
        
        return [
            {
                'person_id': result[0],
                'birth_order': result[1], 
                'union_id': result[2]
            }
            for result in results
        ]
    
    def get_parents(self, child_id: int, family_group_id: int) -> List[Dict[str, Any]]:
        """Get parents of a child within the same family group"""
        
        stmt = (
            select(Person.id, Person.gender)
            .join(ParentChild, Person.id == ParentChild.parent_id)
            .where(ParentChild.child_id == child_id)
            .where(Person.family_group_id == family_group_id)
            .where(Person.deleted_at == None)
            .where(ParentChild.deleted_at == None)
        )
        
        results = self.session.exec(stmt).all()
        
        return [
            {
                'id': result[0],
                'gender': result[1]
            }
            for result in results
        ]
    
    def parse_lineage_path(self, lineage_path: str) -> List[int]:
        """Parse lineage_path string into list of integers"""
        if not lineage_path:
            return []
        
        # Remove leading/trailing dots and split
        path_parts = lineage_path.strip('.').split('.')
        
        try:
            return [int(part) for part in path_parts if part]
        except ValueError:
            logger.warning(f"Invalid lineage_path format: {lineage_path}")
            return []
    
    def get_setting(self, key: str, default: str) -> str:
        """Get setting value with default fallback"""
        
        stmt = select(Settings).where(Settings.key == key)
        setting = self.session.exec(stmt).first()
        
        return setting.value if setting else default
    
    def log_rebuild_changes(self, batch_id: str, changes: List[Dict[str, Any]]):
        """Log rebuild changes to database"""
        
        for change in changes:
            log_entry = RebuildLog(
                batch_id=batch_id,
                person_id=change['person_id'],
                old_code=change['old_code'],
                new_code=change['new_code']
            )
            self.session.add(log_entry)
        
        self.session.commit()
    
    def set_family_root(self, family_group_id: int, person_id: int) -> FamilyGroup:
        """Set root person for family group"""
        
        family_group = self.session.get(FamilyGroup, family_group_id)
        if not family_group:
            raise ValueError(f"Family group {family_group_id} not found")
        
        person = self.session.get(Person, person_id)
        if not person:
            raise ValueError(f"Person {person_id} not found")
        
        if person.family_group_id != family_group_id:
            raise ValueError("Person must belong to the same family group")
        
        family_group.root_id = person_id
        family_group.updated_at = datetime.utcnow()
        
        self.session.add(family_group)
        self.session.commit()
        
        return family_group


def get_lineage_service() -> LineageService:
    """Get lineage service instance"""
    session = next(get_session())
    return LineageService(session)