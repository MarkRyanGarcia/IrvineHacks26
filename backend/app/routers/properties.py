from typing import Annotated, List
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.properties import PropertiesCreate, PropertiesOut
from app.db.models.properties import Properties
from app.deps.db import get_db

router = APIRouter(tags=["properties"])


@router.get("/properties/{user_id}", response_model=List[PropertiesOut])
def get_properties(
    user_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Properties).filter(Properties.user_id == user_id).all()


@router.post("/properties", response_model=PropertiesOut)
def create_properties(
    req: PropertiesCreate,
    db: Annotated[Session, Depends(get_db)],
):
    new_property = Properties(
        user_id=req.user_id,
        liked=req.liked,
        zpid=req.zpid,

        # Address
        street_address=req.street_address,
        city=req.city,
        state=req.state,
        zip_code=req.zip_code,

        # Coordinates
        latitude=req.latitude,
        longitude=req.longitude,

        # Listing info
        price=req.price,
        price_per_sqft=req.price_per_sqft,
        price_change=req.price_change,
        price_changed_date=req.price_changed_date,
        listing_status=req.listing_status,
        days_on_zillow=req.days_on_zillow,
        listing_date=req.listing_date,

        # Property details
        property_type=req.property_type,
        beds=req.beds,
        baths=req.baths,
        sqft=req.sqft,
        lot_size=req.lot_size,
        lot_size_unit=req.lot_size_unit,
        year_built=req.year_built,
        is_new_construction=req.is_new_construction,

        # Estimates
        zestimate=req.zestimate,
        rent_zestimate=req.rent_zestimate,

        # Tax
        tax_assessed_value=req.tax_assessed_value,
        tax_assessment_year=req.tax_assessment_year,

        # Media flags
        has_vr_model=req.has_vr_model,
        has_videos=req.has_videos,
        has_floor_plan=req.has_floor_plan,
        is_showcase_listing=req.is_showcase_listing,

        # Open house
        open_house_start=req.open_house_start,
        open_house_end=req.open_house_end,

        # Broker
        broker_name=req.broker_name,

        # Thumbnail
        photo_url=req.photo_url,
    )
    db.add(new_property)
    db.commit()
    db.refresh(new_property)
    return new_property


@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    prop = db.query(Properties).filter(Properties.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(prop)
    db.commit()
    return {"ok": True}
