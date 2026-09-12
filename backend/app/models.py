"""Cadastral data model. Geometry stored as GeoJSON dict (JSON column) so SQLite works.
On PostGIS, swap JSON geometry for geoalchemy2 Geometry columns — service layer is isolated."""
import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

def uid(): return str(uuid.uuid4())

class Parcel(Base):
    __tablename__ = "parcels"
    id = Column(String, primary_key=True, default=uid)
    parcel_id = Column(String, unique=True, index=True)          # DL-SKT-0182
    prototype_ulpin = Column(String, unique=True)
    survey_number = Column(String)
    locality = Column(String, index=True)
    city = Column(String, default="Delhi")
    land_use = Column(String, default="Residential")
    area_sqft = Column(Float, default=0)
    geometry = Column(JSON)                                       # GeoJSON polygon {lng,lat} ring
    center = Column(JSON)                                         # [lng, lat]
    verification_status = Column(String, default="Verified")
    confidence = Column(Float, default=95.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    buildings = relationship("Building", back_populates="parcel")

class Building(Base):
    __tablename__ = "buildings"
    id = Column(String, primary_key=True, default=uid)
    building_id = Column(String, index=True)                     # B01 (unique per parcel; global key parcel+B)
    parcel_id = Column(String, ForeignKey("parcels.parcel_id"))
    name = Column(String)
    geometry = Column(JSON)                                       # footprint ring
    center = Column(JSON)
    height_m = Column(Float, default=36.0)
    registered_height_m = Column(Float, default=36.0)
    lidar_height_m = Column(Float, default=36.0)
    num_floors = Column(Integer, default=10)
    building_type = Column(String, default="Residential")
    construction_year = Column(Integer, default=2021)
    verification_status = Column(String, default="Verified")
    confidence = Column(Float, default=95.0)
    parcel = relationship("Parcel", back_populates="buildings")
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")

class Floor(Base):
    __tablename__ = "floors"
    id = Column(String, primary_key=True, default=uid)
    floor_id = Column(String, unique=True, index=True)           # DL-SKT-0182-B01-F08
    building_key = Column(String, ForeignKey("buildings.id"))
    floor_number = Column(Integer)                               # -2..N (-2=B2,-1=B1,0=G)
    floor_label = Column(String)                                 # B2,B1,G,F1..
    z_min = Column(Float); z_max = Column(Float)
    geometry = Column(JSON)
    usage = Column(String, default="Residential")
    verification_status = Column(String, default="Verified")
    confidence = Column(Float, default=95.0)
    building = relationship("Building", back_populates="floors")
    units = relationship("Unit", back_populates="floor", cascade="all, delete-orphan")

class Unit(Base):
    __tablename__ = "units"
    id = Column(String, primary_key=True, default=uid)
    unit_id = Column(String, unique=True, index=True)            # DL-SKT-0182-B01-F08-U804
    prototype_ulpin = Column(String, unique=True, index=True)
    floor_key = Column(String, ForeignKey("floors.id"))
    unit_number = Column(String)                                 # 804 / A804
    geometry = Column(JSON)
    area_sqft = Column(Float, default=1100)
    unit_type = Column(String, default="Residential")
    owner_id = Column(String, ForeignKey("owners.id"), nullable=True)
    verification_status = Column(String, default="Verified")
    confidence = Column(Float, default=95.0)
    floor = relationship("Floor", back_populates="units")
    owner = relationship("Owner")

class Owner(Base):
    __tablename__ = "owners"
    id = Column(String, primary_key=True, default=uid)
    owner_reference = Column(String, unique=True)                # OWN-0001 (fictional)
    display_name = Column(String)                                # fictional demo names
    ownership_type = Column(String, default="Freehold")
    verification_status = Column(String, default="Verified")

class Right(Base):
    __tablename__ = "rights"
    id = Column(String, primary_key=True, default=uid)
    spatial_unit_id = Column(String, index=True)                 # unit prototype_ulpin
    owner_id = Column(String, ForeignKey("owners.id"))
    right_type = Column(String, default="Ownership")
    status = Column(String, default="Active")
    valid_from = Column(String, default="2021-01-01")
    valid_to = Column(String, nullable=True)

class Utility(Base):
    __tablename__ = "utilities"
    id = Column(String, primary_key=True, default=uid)
    utility_id = Column(String, unique=True, index=True)         # WTR-00182
    utility_type = Column(String, index=True)                    # Water/Electrical/Sewer/Telecom/Gas/Transport
    geometry = Column(JSON)                                       # LineString [[lng,lat],...]
    depth_m = Column(Float, default=-3.0)
    owner_agency = Column(String)
    installation_year = Column(Integer, default=2019)
    status = Column(String, default="Active")
    confidence = Column(Float, default=93.0)
    affected_parcels = Column(JSON, default=list)

class DataSource(Base):
    __tablename__ = "sources"
    id = Column(String, primary_key=True, default=uid)
    source_type = Column(String)                                 # GIS/LiDAR/DRONE/GNSS/FLOOR_PLAN/DEM/DSM/REGISTRY
    name = Column(String)
    capture_date = Column(String)
    resolution = Column(String)
    provider = Column(String)
    quality = Column(String, default="Verified")

class PropertySource(Base):
    __tablename__ = "property_sources"
    id = Column(String, primary_key=True, default=uid)
    entity_ulpin = Column(String, index=True)
    source_id = Column(String, ForeignKey("sources.id"))
    score = Column(Float, default=95.0)

class ValidationIssue(Base):
    __tablename__ = "validation_issues"
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String)                                 # Building/Floor/Unit/Parcel/Utility
    entity_id = Column(String, index=True)
    issue_type = Column(String)
    severity = Column(String, default="Medium")                  # Low/Medium/High
    description = Column(Text)
    evidence = Column(JSON, default=list)
    ai_confidence = Column(Float, default=90.0)
    suggested_action = Column(Text, default="")
    status = Column(String, default="Open")

class PropertyHistory(Base):
    __tablename__ = "history"
    id = Column(String, primary_key=True, default=uid)
    entity_id = Column(String, index=True)
    event_type = Column(String)
    description = Column(Text)
    timestamp = Column(String)
    source_id = Column(String, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, default="demo-officer")
    user_role = Column(String, default="officer")
    entity_type = Column(String)
    entity_id = Column(String)
    action = Column(String)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# ---------------- Property Data Submission intake layer ----------------
# Intake-only: submissions feed the existing cadastral tables above.
# Citizen = authenticated user, UNVERIFIED data → human verification required.
# Government department = authenticated + authorized source → auto-validate, no citizen queue.

SUBMISSION_STATUSES = ("DRAFT", "SUBMITTED", "PENDING_VERIFICATION", "UNDER_VERIFICATION",
                       "FIELD_CHECK", "CORRECTION_REQUIRED", "APPROVED", "REJECTED",
                       "INTEGRATED", "NEEDS_REVIEW")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(String, primary_key=True, default=uid)
    submission_id = Column(String, unique=True, index=True)        # SUB-2026-000184
    submitter = Column(String, index=True)                         # username
    submitter_role = Column(String)                                # citizen | officer | surveyor | admin
    source_type = Column(String)                                   # PROPERTY_OWNER | GOVERNMENT_DEPARTMENT
    department = Column(String, nullable=True)                     # dept for govt submissions
    kind = Column(String, default="new")                           # new | update
    property_type = Column(String)                                 # Land Parcel | Apartment / Flat | ...
    payload = Column(JSON, default=dict)                           # full wizard data (identification/address/parcel/...)
    measurements = Column(JSON, default=dict)                      # {key: {value, unit, sqm}} canonical m²
    target_parcel = Column(String, nullable=True)
    target_building = Column(String, nullable=True)                # parcel-B key
    target_floor = Column(String, nullable=True)                   # floor_id
    target_unit = Column(String, nullable=True)                    # prototype ULPIN
    status = Column(String, default="DRAFT", index=True)
    trust = Column(String, default="UNVERIFIED")                   # UNVERIFIED | AUTHORIZED | VERIFIED
    priority = Column(String, default="Normal")                    # Normal | High (AI assist)
    assignee = Column(String, nullable=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class SubmissionDocument(Base):
    __tablename__ = "submission_documents"
    id = Column(String, primary_key=True, default=uid)
    submission_id = Column(String, ForeignKey("submissions.submission_id"), index=True)
    doc_type = Column(String)                                      # Ownership document | Floor plan | ...
    doc_number = Column(String, nullable=True)
    doc_date = Column(String, nullable=True)
    authority = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    filename = Column(String, nullable=True)                       # stored under backend/uploads/
    mime = Column(String, nullable=True)
    size = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    id = Column(String, primary_key=True, default=uid)
    submission_id = Column(String, ForeignKey("submissions.submission_id"), index=True)
    reviewer = Column(String)
    reviewer_role = Column(String)
    action = Column(String)                                        # verify-start | approve | reject | correction | field-request | field-result
    reason = Column(Text, nullable=True)
    fields = Column(JSON, default=list)                            # fields needing correction
    created_at = Column(DateTime, default=datetime.utcnow)

class FieldVerification(Base):
    __tablename__ = "field_verifications"
    id = Column(String, primary_key=True, default=uid)
    verification_id = Column(String, unique=True, index=True)      # FV-2026-0001
    submission_id = Column(String, ForeignKey("submissions.submission_id"), index=True)
    assignee = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    scheduled = Column(String, nullable=True)
    checklist = Column(JSON, default=list)                         # [{item, done}]
    observed = Column(JSON, default=dict)                          # coords/area/height/notes/...
    recommendation = Column(String, nullable=True)                 # APPROVE | REJECT | REQUEST_CORRECTION
    status = Column(String, default="Open")                        # Open | Completed
    created_at = Column(DateTime, default=datetime.utcnow)

class SubmissionVersion(Base):
    __tablename__ = "submission_versions"
    id = Column(String, primary_key=True, default=uid)
    submission_id = Column(String, ForeignKey("submissions.submission_id"), index=True)
    version = Column(Integer)
    payload = Column(JSON, default=dict)
    measurements = Column(JSON, default=dict)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SubmissionNotification(Base):
    __tablename__ = "submission_notifications"
    id = Column(String, primary_key=True, default=uid)
    username = Column(String, index=True)
    title = Column(String)
    body = Column(Text, nullable=True)
    link = Column(String, nullable=True)                           # e.g. /submit/track/SUB-2026-1
    read = Column(String, default="0")                             # 0 | 1 (string for SQLite simplicity)
    created_at = Column(DateTime, default=datetime.utcnow)
