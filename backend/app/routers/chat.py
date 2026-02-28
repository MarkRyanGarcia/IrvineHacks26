from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chatbot import chat

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    try:
        reply = chat(
            messages=[m.model_dump() for m in req.messages],
            analysis_context=req.analysis_context,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat error: {e}")

    return ChatResponse(reply=reply)
