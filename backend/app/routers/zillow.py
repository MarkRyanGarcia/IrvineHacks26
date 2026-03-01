import os
from typing import Annotated, List
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.properties import PropertiesCreate, PropertiesOut
from app.db.models.properties import Properties
from app.deps.db import get_db
from app.core.config import RAPIDAPI_KEY
import requests

router = APIRouter(tags=["zillow"])


@router.get("/zillow/search")
def search_zillow_properties(
    location: str = Query(..., description="City, state or ZIP"),
    listing_status: str = Query("For_Sale"),
    page: int = Query(1),
):
    url = "https://private-zillow.p.rapidapi.com/search/byaddress"

    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "private-zillow.p.rapidapi.com",
    }

    params = {
        "location": location,
        "listingStatus": listing_status,
        "page": page,
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    data = response.json()

    # Zillow wraps actual properties here
    results = [
        r["property"]
        for r in data.get("searchResults", [])
        if "property" in r
    ]

    return {
        "count": len(results),
        "results": results
    }