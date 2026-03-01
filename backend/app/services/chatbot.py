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
- Keep responses concise (3-5 sentences unless asked for more detail).
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


def chat(
    messages: list[dict[str, str]],
    analysis_context: dict | None = None,
) -> str:
    system = SYSTEM_PROMPT + build_context_prompt(analysis_context)

    formatted: list[dict[str, str]] = [{"role": "system", "content": system}]
    for msg in messages:
        formatted.append({"role": msg["role"], "content": msg["content"]})

    client = _get_client()
    response = client.chat_completion(
        messages=formatted,
        max_tokens=512,
        temperature=0.6,
        top_p=0.9,
    )

    return response.choices[0].message.content or ""
