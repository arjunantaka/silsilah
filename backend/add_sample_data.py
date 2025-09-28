#!/usr/bin/env python3
import sys
sys.path.append('/root/keluarga/backend')

from keluarga_backend.database import engine
from keluarga_backend.models import FamilyGroup, Person, Union, ParentChild
from sqlmodel import Session, select

def add_sample_data():
    with Session(engine) as session:
        # Check if we already have data
        existing_families = session.exec(select(FamilyGroup)).all()
        if existing_families:
            print(f"Database already has {len(existing_families)} families")
            for f in existing_families:
                print(f"- {f.name} (ID: {f.id})")
            return

        # Create a sample family
        family = FamilyGroup(
            name="Keluarga Hartono",
            description="Family tree for testing A/P/B/C lineage system"
        )
        session.add(family)
        session.commit()
        session.refresh(family)
        
        print(f"Created family: {family.name} (ID: {family.id})")

        # Create root person
        root_person = Person(
            full_name="Hartono Wirjosoedirjo",
            birth_date="1940-01-01",
            gender="L",
            family_group_id=family.id,
            lineage_code="ROOT"
        )
        session.add(root_person)
        session.commit()
        session.refresh(root_person)
        
        # Update family root
        family.root_person_id = root_person.id
        session.add(family)
        session.commit()
        
        print(f"Created root person: {root_person.full_name} (ID: {root_person.id})")

        # Create children
        child1 = Person(
            full_name="Bambang Hartono",
            birth_date="1965-03-15", 
            gender="L",
            family_group_id=family.id,
            lineage_code="A1"
        )
        session.add(child1)

        child2 = Person(
            full_name="Sari Hartini",
            birth_date="1967-08-20",
            gender="P", 
            family_group_id=family.id,
            lineage_code="A2"
        )
        session.add(child2)
        session.commit()
        session.refresh(child1)
        session.refresh(child2)

        print(f"Created children: {child1.full_name}, {child2.full_name}")

        # Create parent-child relationships
        rel1 = ParentChild(
            parent_id=root_person.id,
            child_id=child1.id,
            birth_order=1
        )
        rel2 = ParentChild(
            parent_id=root_person.id,
            child_id=child2.id,
            birth_order=2
        )
        session.add(rel1)
        session.add(rel2)
        session.commit()

        print("Created parent-child relationships")

        # Create grandchild
        grandchild = Person(
            full_name="Agus Bambang",
            birth_date="1990-12-10",
            gender="L",
            family_group_id=family.id,
            lineage_code="A1P1"
        )
        session.add(grandchild)
        session.commit()
        session.refresh(grandchild)

        # Create parent-child relationship for grandchild
        rel3 = ParentChild(
            parent_id=child1.id,
            child_id=grandchild.id,
            birth_order=1
        )
        session.add(rel3)
        session.commit()

        print(f"Created grandchild: {grandchild.full_name}")
        print("Sample data added successfully!")

if __name__ == "__main__":
    add_sample_data()