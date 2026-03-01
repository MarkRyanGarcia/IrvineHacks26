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


# ZHVI is a smoothed index; individual homes carry significantly more variance.
_INDIVIDUAL_VOL_MULTIPLIER = 2.5

# In ~15% of simulations, inject a market correction event
_CORRECTION_PROBABILITY = 0.15
_CORRECTION_RANGE = (-0.08, -0.20)  # 8–20% drawdown applied once

# Affordability: standard 28% front-end DTI guideline
_SAFE_DTI_RATIO = 0.28
_STRESSED_DTI_RATIO = 0.36


def _volatility_adjustment(current_price: float, zip_median: float) -> float:
    """Increase volatility when the property deviates from the ZIP median."""
    ratio = current_price / zip_median if zip_median > 0 else 1.0
    deviation = abs(ratio - 1.0)
    return 1.0 + 0.7 * deviation


def _fragility_label(sigma: float) -> str:
    if sigma < 0.025:
        return "Low"
    if sigma < 0.04:
        return "Moderate"
    if sigma < 0.06:
        return "High"
    return "Very High"


def _overpay_ratio(offer_price: float, fair_high: float) -> float:
    """How much the offer exceeds the top of the fair-value band (0 = at/below)."""
    if offer_price <= fair_high or fair_high <= 0:
        return 0.0
    return (offer_price - fair_high) / fair_high


def _affordability_penalty(
    offer_price: float, down_payment_pct: float, income: float
) -> float:
    """Return a 0–1 penalty based on how stretched the buyer's DTI is.
    0 = comfortable, 1 = severely stretched."""
    if income <= 0:
        return 0.5
    loan = offer_price * (1 - down_payment_pct)
    annual_payment = loan * 0.065  # ~6.5% mortgage rate approximation
    dti = annual_payment / income

    if dti <= _SAFE_DTI_RATIO:
        return 0.0
    if dti >= _STRESSED_DTI_RATIO:
        return 1.0
    return (dti - _SAFE_DTI_RATIO) / (_STRESSED_DTI_RATIO - _SAFE_DTI_RATIO)


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
    adj_sigma = sigma * vol_adj * _INDIVIDUAL_VOL_MULTIPLIER

    n_months = horizon_years * 12
    n_sims = MC_NUM_SIMULATIONS
    rng = np.random.default_rng()

    # --- GBM with fat tails (t-distribution, df=5) ---
    t_samples = rng.standard_t(df=5, size=(n_sims, n_months))
    monthly_returns = mu + adj_sigma * t_samples

    cumulative = np.cumprod(1 + monthly_returns, axis=1)
    final_prices = offer_price * cumulative[:, -1]

    # --- Market correction shocks ---
    correction_mask = rng.random(n_sims) < _CORRECTION_PROBABILITY
    correction_factors = rng.uniform(
        1 + _CORRECTION_RANGE[1], 1 + _CORRECTION_RANGE[0], size=n_sims
    )
    final_prices[correction_mask] *= correction_factors[correction_mask]

    # --- Mean-reversion pressure if offer is above fair value ---
    fair_value_low = round(zip_median * 0.90, 2)
    fair_value_high = round(zip_median * 1.10, 2)
    overpay = _overpay_ratio(offer_price, fair_value_high)
    if overpay > 0:
        reversion_drag = 1.0 - overpay * 0.35  # up to ~35% drag for extreme overpay
        final_prices *= max(reversion_drag, 0.70)

    # --- Core statistics ---
    p10 = float(np.percentile(final_prices, 10))
    p50 = float(np.percentile(final_prices, 50))
    p90 = float(np.percentile(final_prices, 90))

    prob_underwater = float(np.mean(final_prices < offer_price))
    prob_downside = float(np.mean(final_prices < current_price))

    # --- Confidence score (multi-factor) ---
    # Base: fraction of sims that end at or above offer price
    sim_confidence = float(np.mean(final_prices >= offer_price))

    # Overpay penalty: paying above fair value should hurt confidence
    overpay_penalty = min(overpay * 1.5, 0.35)

    # Affordability penalty
    afford_penalty = _affordability_penalty(offer_price, down_payment_pct, income) * 0.15

    # Risk tolerance adjustment: lower tolerance = stricter scoring
    tolerance_adj = (1 - risk_tolerance) * 0.08

    raw_confidence = sim_confidence - overpay_penalty - afford_penalty - tolerance_adj

    # Clamp to [0.05, 0.97] — never show a perfect 0% or 100%
    confidence_score = float(np.clip(raw_confidence, 0.05, 0.97))

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
