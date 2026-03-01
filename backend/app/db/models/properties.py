from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.models import Base


class Properties(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    zpid: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    liked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Address
    street_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Coordinates
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Listing info
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_per_sqft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_changed_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    listing_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    days_on_zillow: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    listing_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Property details
    property_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    beds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    baths: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sqft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lot_size: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lot_size_unit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    year_built: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_new_construction: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Estimates
    zestimate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rent_zestimate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Tax
    tax_assessed_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tax_assessment_year: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Media flags
    has_vr_model: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    has_videos: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    has_floor_plan: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_showcase_listing: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Open house
    open_house_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    open_house_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Broker
    broker_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Thumbnail
    photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", back_populates="properties")