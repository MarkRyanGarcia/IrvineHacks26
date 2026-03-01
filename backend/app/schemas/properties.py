from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PropertiesCreate(BaseModel):
    user_id: str
    liked: bool = False
    zpid: Optional[int] = None

    # Address
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # Coordinates
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Listing info
    price: Optional[float] = None
    price_per_sqft: Optional[float] = None
    price_change: Optional[float] = None
    price_changed_date: Optional[datetime] = None
    listing_status: Optional[str] = None
    days_on_zillow: Optional[int] = None
    listing_date: Optional[datetime] = None

    # Property details
    property_type: Optional[str] = None
    beds: Optional[int] = None
    baths: Optional[float] = None
    sqft: Optional[float] = None
    lot_size: Optional[float] = None
    lot_size_unit: Optional[str] = None
    year_built: Optional[int] = None
    is_new_construction: Optional[bool] = None

    # Estimates
    zestimate: Optional[float] = None
    rent_zestimate: Optional[float] = None

    # Tax
    tax_assessed_value: Optional[float] = None
    tax_assessment_year: Optional[str] = None

    # Media flags
    has_vr_model: Optional[bool] = None
    has_videos: Optional[bool] = None
    has_floor_plan: Optional[bool] = None
    is_showcase_listing: Optional[bool] = None

    # Open house
    open_house_start: Optional[datetime] = None
    open_house_end: Optional[datetime] = None

    # Broker
    broker_name: Optional[str] = None

    # Thumbnail
    photo_url: Optional[str] = None


class PropertiesOut(BaseModel):
    id: int
    user_id: str
    liked: bool
    zpid: Optional[int] = None

    # Address
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # Coordinates
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Listing info
    price: Optional[float] = None
    price_per_sqft: Optional[float] = None
    price_change: Optional[float] = None
    price_changed_date: Optional[datetime] = None
    listing_status: Optional[str] = None
    days_on_zillow: Optional[int] = None
    listing_date: Optional[datetime] = None

    # Property details
    property_type: Optional[str] = None
    beds: Optional[int] = None
    baths: Optional[float] = None
    sqft: Optional[float] = None
    lot_size: Optional[float] = None
    lot_size_unit: Optional[str] = None
    year_built: Optional[int] = None
    is_new_construction: Optional[bool] = None

    # Estimates
    zestimate: Optional[float] = None
    rent_zestimate: Optional[float] = None

    # Tax
    tax_assessed_value: Optional[float] = None
    tax_assessment_year: Optional[str] = None

    # Media flags
    has_vr_model: Optional[bool] = None
    has_videos: Optional[bool] = None
    has_floor_plan: Optional[bool] = None
    is_showcase_listing: Optional[bool] = None

    # Open house
    open_house_start: Optional[datetime] = None
    open_house_end: Optional[datetime] = None

    # Broker
    broker_name: Optional[str] = None

    # Thumbnail
    photo_url: Optional[str] = None

    created_at: datetime

    model_config = {"from_attributes": True}