from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.deps.auth import require_clerk_auth
from app.deps.db import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserOut
from app.core.config import CLERK_WEBHOOK_SECRET
from svix.webhooks import Webhook, WebhookVerificationError

router = APIRouter(tags=["users"])


@router.get("/user/{user_id}", response_model=UserOut | None)
def get_user(
    user_id: str,
    db: Annotated[Session, Depends(get_db)],
    auth_id: Annotated[str, Depends(require_clerk_auth)],
):
    if auth_id != user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return db.query(User).filter(User.id == user_id).first()


@router.post("/user")
async def create_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    
    # 1. Get headers for verification
    headers = request.headers
    payload = await request.body()
    
    # 2. Verify the webhook signature using Svix
    wh = Webhook(CLERK_WEBHOOK_SECRET)
    try:
        # This will raise an error if the signature is invalid
        msg = wh.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )


    event_type = msg.get("type")
    if event_type == "user.created":
        user_data = msg.get("data")
        user_id = user_data.get("id")
        first_name = user_data.get("first_name")
        last_name = user_data.get("last_name")
        email = user_data.get("email_addresses")[0].get("email_address")

        new_user = User(id=user_id, email=email, first_name=first_name, last_name=last_name)
        db.add(new_user)
        db.commit()
        
    return {"status": "success"}