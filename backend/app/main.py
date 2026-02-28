from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import problems, teams, users, leaderboard
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Change this later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)