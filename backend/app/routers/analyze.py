from fastapi import APIRouter, HTTPException
from app.schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExplainRequest,
    ExplainResponse,
)
from app.services.monte_carlo import run_simulation
from app.services.llm_explain import generate_explanation

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        result = run_simulation(
            zip_code=req.zip,
            current_price=req.current_price,
            offer_price=req.offer_price,
            down_payment_pct=req.down_payment_pct,
            income=req.income,
            horizon_years=req.horizon_years,
            risk_tolerance=req.risk_tolerance,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AnalyzeResponse(
        confidence_score=result.confidence_score,
        prob_downside=result.prob_downside,
        p10=result.p10,
        p50=result.p50,
        p90=result.p90,
        fair_value_low=result.fair_value_low,
        fair_value_high=result.fair_value_high,
        fragility_index=result.fragility_index,
    )


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest):
    try:
        text = generate_explanation(
            confidence_score=req.confidence_score,
            prob_downside=req.prob_downside,
            prob_underwater=req.prob_underwater,
            p10=req.p10,
            p50=req.p50,
            p90=req.p90,
            offer_price=req.offer_price,
            fair_value_low=req.fair_value_low,
            fair_value_high=req.fair_value_high,
            fragility_index=req.fragility_index,
            risk_tolerance=req.risk_tolerance,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    return ExplainResponse(explanation=text)
