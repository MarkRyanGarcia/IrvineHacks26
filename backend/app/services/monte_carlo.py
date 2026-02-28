from __future__ import annotations

import numpy as np
from dataclasses import dataclass
from app.services.zhvi_loader import compute_monthly_stats, get_zip_series, get_zip_median
from app.core.config import MC_NUM_SIMULATIONS


@dataclass
class SimulationResult:
    confidence_score: float
    prob_downside: float
    prob_underwater: float
    p10: float
    p50: float
    p90: float
    fair_value_low: float
    fair_value_high: float
    fragility_index: str


def _volatility_adjustment(current_price: float, zip_median: float) -> float:
    """Increase volatility when the property deviates from ZIP median."""
    ratio = current_price / zip_median if zip_median > 0 else 1.0
    deviation = abs(ratio - 1.0)
    return 1.0 + 0.5 * deviation  # up to 1.5x for 100% deviation


def _fragility_label(sigma: float) -> str:
    if sigma < 0.015:
        return "Low"
    elif sigma < 0.03:
        return "Moderate"
    elif sigma < 0.05:
        return "High"
    return "Very High"


def run_simulation(
    zip_code: str | int,
    current_price: float,
    offer_price: float,
    down_payment_pct: float,
    income: float,
    horizon_years: int,
    risk_tolerance: float,
) -> SimulationResult:
    values = get_zip_series(zip_code)
    mu, sigma = compute_monthly_stats(values)
    zip_median = get_zip_median(zip_code)

    vol_adj = _volatility_adjustment(current_price, zip_median)
    adj_sigma = sigma * vol_adj

    n_months = horizon_years * 12
    n_sims = MC_NUM_SIMULATIONS

    rng = np.random.default_rng()
    monthly_returns = rng.normal(mu, adj_sigma, size=(n_sims, n_months))
    cumulative = np.cumprod(1 + monthly_returns, axis=1)
    final_prices = offer_price * cumulative[:, -1]

    p10 = float(np.percentile(final_prices, 10))
    p50 = float(np.percentile(final_prices, 50))
    p90 = float(np.percentile(final_prices, 90))

    prob_underwater = float(np.mean(final_prices < offer_price))
    prob_downside = float(np.mean(final_prices < current_price))

    # Acceptable loss threshold scales with risk tolerance
    # risk_tolerance 0 = accept 0% loss, 1 = accept up to 20% loss
    max_acceptable_loss = risk_tolerance * 0.20
    loss_threshold = offer_price * (1 - max_acceptable_loss)
    confident = (final_prices >= offer_price) | (final_prices >= loss_threshold)
    confidence_score = float(np.mean(confident))

    # Fair value band: ZIP median ± 10%
    fair_value_low = round(zip_median * 0.90, 2)
    fair_value_high = round(zip_median * 1.10, 2)

    fragility_index = _fragility_label(adj_sigma)

    return SimulationResult(
        confidence_score=round(confidence_score, 4),
        prob_downside=round(prob_downside, 4),
        prob_underwater=round(prob_underwater, 4),
        p10=round(p10, 2),
        p50=round(p50, 2),
        p90=round(p90, 2),
        fair_value_low=fair_value_low,
        fair_value_high=fair_value_high,
        fragility_index=fragility_index,
    )
