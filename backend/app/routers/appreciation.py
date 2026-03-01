from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.appreciation import get_appreciation, get_appreciation_bulk

router = APIRouter(tags=["appreciation"])


class AppreciationOut(BaseModel):
    zip: str
    predicted_12m_appreciation: float | None


class BulkAppreciationRequest(BaseModel):
    zips: list[str]


class BulkAppreciationOut(BaseModel):
    results: dict[str, float | None]


@router.get("/appreciation/{zip_code}", response_model=AppreciationOut)
def appreciation_single(zip_code: str):
    value = get_appreciation(zip_code)
    if value is None:
        raise HTTPException(status_code=404, detail=f"No prediction available for ZIP {zip_code}")
    return AppreciationOut(zip=zip_code, predicted_12m_appreciation=round(value, 6))


@router.post("/appreciation/bulk", response_model=BulkAppreciationOut)
def appreciation_bulk(req: BulkAppreciationRequest):
    results = get_appreciation_bulk(req.zips)
    return BulkAppreciationOut(
        results={z: round(v, 6) if v is not None else None for z, v in results.items()}
    )
