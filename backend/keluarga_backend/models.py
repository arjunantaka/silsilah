from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class FamilyGroup(SQLModel, table=True):
    """Family Group model - container untuk satu silsilah"""
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)
    root_id: Optional[int] = Field(default=None, foreign_key="person.id")
    prefix: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    persons: List["Person"] = Relationship(
        back_populates="family_group",
        sa_relationship_kwargs={"foreign_keys": "Person.family_group_id"}
    )
    unions: List["Union"] = Relationship(back_populates="family_group")


class Person(SQLModel, table=True):
    """Person model - individu dalam keluarga"""
    id: Optional[int] = Field(default=None, primary_key=True)
    family_group_id: int = Field(foreign_key="familygroup.id", index=True)
    nama_lengkap: str = Field(index=True)
    nama_alias: str = Field(default="")
    gender: str = Field(default="unknown")  # L|P|unknown
    tempat_lahir: str = Field(default="")
    tanggal_lahir: Optional[datetime] = Field(default=None)
    tanggal_wafat: Optional[datetime] = Field(default=None)
    alamat: str = Field(default="")
    pekerjaan_sekolah: str = Field(default="")
    catatan: str = Field(default="")
    foto_path: str = Field(default="")
    lineage_path: str = Field(default="", index=True)  # ".2.5.1."
    lineage_code: str = Field(default="", index=True)  # "A2P5B1"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    family_group: Optional[FamilyGroup] = Relationship(
        back_populates="persons",
        sa_relationship_kwargs={"foreign_keys": "Person.family_group_id"}
    )
    
    # Parent-child relationships
    parent_relations: List["ParentChild"] = Relationship(
        back_populates="parent", 
        sa_relationship_kwargs={"foreign_keys": "ParentChild.parent_id"}
    )
    child_relations: List["ParentChild"] = Relationship(
        back_populates="child",
        sa_relationship_kwargs={"foreign_keys": "ParentChild.child_id"}
    )
    
    # Union relationships
    partner1_unions: List["Union"] = Relationship(
        back_populates="partner1",
        sa_relationship_kwargs={"foreign_keys": "Union.partner1_id"}
    )
    partner2_unions: List["Union"] = Relationship(
        back_populates="partner2",
        sa_relationship_kwargs={"foreign_keys": "Union.partner2_id"}
    )


class Union(SQLModel, table=True):
    """Union model - hubungan pasangan"""
    id: Optional[int] = Field(default=None, primary_key=True)
    family_group_id: int = Field(foreign_key="familygroup.id", index=True)
    partner1_id: int = Field(foreign_key="person.id")
    partner2_id: int = Field(foreign_key="person.id")
    start_date: Optional[datetime] = Field(default=None)
    end_date: Optional[datetime] = Field(default=None)
    status: str = Field(default="menikah")  # menikah|cerai|wafat|unknown
    lokasi: str = Field(default="")
    catatan: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    family_group: Optional[FamilyGroup] = Relationship(back_populates="unions")
    partner1: Optional[Person] = Relationship(
        back_populates="partner1_unions",
        sa_relationship_kwargs={"foreign_keys": "Union.partner1_id"}
    )
    partner2: Optional[Person] = Relationship(
        back_populates="partner2_unions", 
        sa_relationship_kwargs={"foreign_keys": "Union.partner2_id"}
    )
    parent_child_relations: List["ParentChild"] = Relationship(back_populates="union")


class ParentChild(SQLModel, table=True):
    """Parent-Child relationship model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="person.id", index=True)
    child_id: int = Field(foreign_key="person.id", index=True)
    union_id: Optional[int] = Field(default=None, foreign_key="union.id", index=True)
    jenis: str = Field(default="biological")  # biological|adoptive|step
    birth_order: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)

    # Relationships
    parent: Optional[Person] = Relationship(
        back_populates="parent_relations",
        sa_relationship_kwargs={"foreign_keys": "ParentChild.parent_id"}
    )
    child: Optional[Person] = Relationship(
        back_populates="child_relations",
        sa_relationship_kwargs={"foreign_keys": "ParentChild.child_id"}
    )
    union: Optional[Union] = Relationship(back_populates="parent_child_relations")


class Settings(SQLModel, table=True):
    """Settings model - konfigurasi aplikasi"""
    key: str = Field(primary_key=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RebuildLog(SQLModel, table=True):
    """Rebuild log model - tracking perubahan kode"""
    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: str = Field(index=True)
    person_id: int = Field(foreign_key="person.id", index=True)
    old_code: str = Field(default="")
    new_code: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)