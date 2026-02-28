from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, analyze, chat
from dotenv import load_dotenv

from app.routers import user

load_dotenv()

app = FastAPI(title="HomeConfidence AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(analyze.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
