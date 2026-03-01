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
        address=req.address,
        city=req.city,
        price=req.price,
        sqft=req.sqft,
        beds=req.beds,
        baths=req.baths,
        property_type=req.property_type,
        school_score=req.school_score,
        zip_code=req.zip_code,
        commute_minutes=req.commute_minutes,
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
