from __future__ import annotations

from huggingface_hub import InferenceClient
from app.core.config import HF_TOKEN

MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

_client: InferenceClient | None = None


def _get_client() -> InferenceClient:
    global _client
    if _client is None:
        _client = InferenceClient(model=MODEL_ID, token=HF_TOKEN)
    return _client


SYSTEM_PROMPT = """\
You are Realease, a calm and supportive assistant for first-time home buyers.

Rules:
- You ONLY discuss topics related to home buying, real estate, mortgages, and personal finance as it relates to purchasing a home.
- You never predict specific home prices or guarantee investment returns.
- You speak in clear, everyday language — no jargon.
- Keep responses brief — aim for 2-3 sentences. Only go longer if the user explicitly asks for more detail.
- If the user provides analysis context, reference those numbers naturally.
- Be warm, reassuring, and honest about uncertainty.
- If asked about something unrelated to home buying, politely redirect.
"""


def build_context_prompt(analysis_context: dict | None) -> str:
    if not analysis_context:
        return ""
    ctx = analysis_context
    return (
        f"\n\nThe buyer is currently reviewing an analysis with these results:\n"
        f"- Confidence score: {ctx.get('confidence_score', 'N/A')}\n"
        f"- Downside probability: {ctx.get('prob_downside', 'N/A')}\n"
        f"- Projected values — P10: ${ctx.get('p10', 0):,.0f}, "
        f"P50: ${ctx.get('p50', 0):,.0f}, P90: ${ctx.get('p90', 0):,.0f}\n"
        f"- Fair value range: ${ctx.get('fair_value_low', 0):,.0f} – "
        f"${ctx.get('fair_value_high', 0):,.0f}\n"
        f"- Fragility index: {ctx.get('fragility_index', 'N/A')}\n"
        f"- Offer price: ${ctx.get('offer_price', 0):,.0f}\n"
    )


def build_liked_properties_prompt(liked_properties: list[dict]) -> str:
    if not liked_properties:
        return ""
    lines = ["\n\nThe buyer has recently saved/liked these properties (most recent first):"]
    for i, p in enumerate(liked_properties, 1):
        addr = p.get("address", "")
        if not addr and p.get("street_address"):
            addr = f"{p.get('street_address', '')}, {p.get('city', '')} {p.get('state', '')} {p.get('zip_code', '')}".strip(", ")
        if p.get("price"):
            addr = f"{addr} — ${p['price']:,.0f}" if addr else f"${p['price']:,.0f}"
        lines.append(f"  {i}. {addr or 'Property'}")

        # Open house
        oh_start = p.get("open_house_start")
        oh_end = p.get("open_house_end")
        if oh_start or oh_end:
            oh_str = f"Open house: {oh_start or '?'} to {oh_end or '?'}"
            lines.append(f"      {oh_str}")

        # Other useful fields
        extras = []
        if p.get("property_type"):
            extras.append(f"type: {p['property_type']}")
        if p.get("year_built"):
            extras.append(f"built {p['year_built']}")
        if p.get("lot_size") is not None and p.get("lot_size_unit"):
            extras.append(f"lot: {p['lot_size']:.0f} {p['lot_size_unit']}")
        elif p.get("lot_size") is not None:
            extras.append(f"lot: {p['lot_size']:.0f} sqft")
        if p.get("days_on_zillow") is not None:
            extras.append(f"{p['days_on_zillow']} days on market")
        if p.get("zestimate") is not None:
            extras.append(f"zestimate: ${p['zestimate']:,.0f}")
        if p.get("price_change") is not None and p.get("price_change") != 0:
            extras.append(f"price change: ${p['price_change']:,.0f}")
        if p.get("broker_name"):
            extras.append(f"broker: {p['broker_name']}")
        if extras:
            lines.append(f"      ({'; '.join(extras)})")
    return "\n".join(lines) + "\n"


def chat(
    messages: list[dict[str, str]],
    analysis_context: dict | None = None,
    liked_properties: list[dict] | None = None,
) -> str:
    system = (
        SYSTEM_PROMPT
        + build_context_prompt(analysis_context)
        + build_liked_properties_prompt(liked_properties or [])
    )

    formatted: list[dict[str, str]] = [{"role": "system", "content": system}]
    for msg in messages:
        formatted.append({"role": msg["role"], "content": msg["content"]})

    client = _get_client()
    response = client.chat_completion(
        messages=formatted,
        max_tokens=256,
        temperature=0.6,
        top_p=0.9,
    )

    return response.choices[0].message.content or ""
