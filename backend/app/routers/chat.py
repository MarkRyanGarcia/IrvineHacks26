from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chatbot import chat
from app.db.models.properties import Properties
from app.deps.db import get_db

router = APIRouter(tags=["chat"])


def _format_property(p: Properties) -> str:
    parts = []
    if p.street_address:
        parts.append(p.street_address)
    if p.city or p.state or p.zip_code:
        loc = ", ".join(x for x in (p.city, p.state, p.zip_code) if x)
        if loc:
            parts.append(loc)
    if p.beds is not None or p.baths is not None or p.sqft is not None:
        specs = []
        if p.beds is not None:
            specs.append(f"{p.beds}bd")
        if p.baths is not None:
            specs.append(f"{p.baths}ba")
        if p.sqft is not None:
            specs.append(f"{p.sqft:.0f} sqft")
        if specs:
            parts.append(" ".join(specs))
    if p.price is not None:
        parts.append(f"${p.price:,.0f}")
    return " | ".join(parts) if parts else "Property"


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(
    req: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
):
    liked_properties: list[dict] = []
    if req.user_id:
        rows = (
            db.query(Properties)
            .filter(Properties.user_id == req.user_id, Properties.liked == True)
            .order_by(desc(Properties.created_at))
            .limit(5)
            .all()
        )
        liked_properties = [
            {
                "address": _format_property(p),
                "street_address": p.street_address,
                "city": p.city,
                "state": p.state,
                "zip_code": p.zip_code,
                "price": p.price,
                "beds": p.beds,
                "baths": p.baths,
                "sqft": p.sqft,
                "zpid": p.zpid,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "price_per_sqft": p.price_per_sqft,
                "price_change": p.price_change,
                "listing_status": p.listing_status,
                "days_on_zillow": p.days_on_zillow,
                "property_type": p.property_type,
                "lot_size": p.lot_size,
                "lot_size_unit": p.lot_size_unit,
                "year_built": p.year_built,
                "is_new_construction": p.is_new_construction,
                "zestimate": p.zestimate,
                "rent_zestimate": p.rent_zestimate,
                "tax_assessed_value": p.tax_assessed_value,
                "broker_name": p.broker_name,
                "photo_url": p.photo_url,
                "has_vr_model": p.has_vr_model,
                "has_videos": p.has_videos,
                "has_floor_plan": p.has_floor_plan,
                "open_house_start": p.open_house_start.isoformat() if p.open_house_start else None,
                "open_house_end": p.open_house_end.isoformat() if p.open_house_end else None,
            }
            for p in rows
        ]

    user_msg_count = sum(1 for m in req.messages if m.role == "user")
    prefer_statement = req.prefer_statement or (user_msg_count == 3)

    try:
        reply = chat(
            messages=[m.model_dump() for m in req.messages],
            analysis_context=req.analysis_context,
            liked_properties=liked_properties,
            prefer_statement=prefer_statement,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat error: {e}")

    return ChatResponse(reply=reply)
