from pydantic import BaseModel, Field


class HomeFeatures(BaseModel):
    sqft: float = Field(gt=0)
    beds: int = Field(ge=0)
    baths: int = Field(ge=0)
    property_type: str = "single_family"


class AnalyzeRequest(BaseModel):
    zip: str
    current_price: float = Field(gt=0)
    offer_price: float = Field(gt=0)
    down_payment_pct: float = Field(ge=0, le=1)
    income: float = Field(gt=0)
    horizon_years: int = Field(ge=1, le=30)
    risk_tolerance: float = Field(ge=0, le=1)
    home_features: HomeFeatures | None = None


class AnalyzeResponse(BaseModel):
    confidence_score: float
    prob_downside: float
    p10: float
    p50: float
    p90: float
    fair_value_low: float
    fair_value_high: float
    fragility_index: str


class ExplainRequest(BaseModel):
    confidence_score: float
    prob_downside: float
    prob_underwater: float
    p10: float
    p50: float
    p90: float
    offer_price: float
    fair_value_low: float
    fair_value_high: float
    fragility_index: str
    risk_tolerance: float


class ExplainResponse(BaseModel):
    explanation: str
