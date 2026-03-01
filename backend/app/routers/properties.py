from typing import Annotated, List
from clerk_backend_api import Session
from fastapi import APIRouter, Depends, HTTPException
from app.services.monte_carlo import run_simulation
from app.services.llm_explain import generate_explanation
from app.schemas.properties import PropertiesCreate, PropertiesOut
from app.db.models.properties import Properties
from app.deps.db import get_db

router = APIRouter(tags=["properties"])


@router.get("/properties/{user_id}", response_model=List[PropertiesOut] | None)
def get_properties(
    user_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        properties = db.query(Properties).filter(Properties.user_id == user_id).all()
        return properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching properties: {e}")

@router.post("/properties", response_model=PropertiesOut)
def create_properties(
    req: PropertiesCreate,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        new_properties = Properties(
            user_id=req.user_id,
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

        db.add(new_properties)
        db.commit()
        db.refresh(new_properties)

        return new_properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating property: {e}")