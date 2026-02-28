from __future__ import annotations

from openai import OpenAI
from app.core.config import OPENAI_API_KEY

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


SYSTEM_PROMPT = (
    "You are a calm financial assistant helping a first-time homebuyer "
    "understand risk. You never hallucinate data. You only reference the "
    "numbers provided to you. You speak in clear, everyday language."
)

USER_TEMPLATE = """\
Here are the analysis results for a home this buyer is considering:

- Confidence score: {confidence_score:.0%}
- Probability the home loses value: {prob_downside:.0%}
- Probability the home is worth less than the offer price: {prob_underwater:.0%}
- Projected value (optimistic, P90): ${p90:,.0f}
- Projected value (median, P50): ${p50:,.0f}
- Projected value (pessimistic, P10): ${p10:,.0f}
- Offer price: ${offer_price:,.0f}
- Fair value range for this ZIP: ${fair_value_low:,.0f} – ${fair_value_high:,.0f}
- Fragility index: {fragility_index}
- Buyer's risk tolerance: {risk_tolerance_label}

Please provide:
1. A one-sentence overall assessment.
2. 3 short bullet points explaining what the numbers mean in plain language.
3. One actionable suggestion for the buyer.

Keep the tone calm and supportive. Do not use technical jargon. Do not invent data.
"""


def _risk_label(risk_tolerance: float) -> str:
    if risk_tolerance < 0.3:
        return "Low"
    elif risk_tolerance < 0.6:
        return "Moderate"
    return "High"


def generate_explanation(
    confidence_score: float,
    prob_downside: float,
    prob_underwater: float,
    p10: float,
    p50: float,
    p90: float,
    offer_price: float,
    fair_value_low: float,
    fair_value_high: float,
    fragility_index: str,
    risk_tolerance: float,
) -> str:
    user_msg = USER_TEMPLATE.format(
        confidence_score=confidence_score,
        prob_downside=prob_downside,
        prob_underwater=prob_underwater,
        p10=p10,
        p50=p50,
        p90=p90,
        offer_price=offer_price,
        fair_value_low=fair_value_low,
        fair_value_high=fair_value_high,
        fragility_index=fragility_index,
        risk_tolerance_label=_risk_label(risk_tolerance),
    )

    client = _get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.4,
        max_tokens=400,
    )

    return response.choices[0].message.content or ""
