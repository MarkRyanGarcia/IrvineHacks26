from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import user, analyze, chat, properties, appreciation, zillow
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HomeConfidence AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://reallease.markgarcia.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(properties.router)
app.include_router(appreciation.router)
app.include_router(zillow.router)


@app.get("/health")
def health():
    return {"status": "ok"}
