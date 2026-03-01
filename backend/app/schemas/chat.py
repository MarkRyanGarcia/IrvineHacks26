from __future__ import annotations

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    analysis_context: dict | None = None
    user_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
