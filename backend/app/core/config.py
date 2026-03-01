import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "sk-...")
CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

ENV = os.getenv("ENV", "production")
DEBUG = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

ZHVI_CSV_PATH = os.getenv(
    "ZHVI_CSV_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "data.csv"),
)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")

MC_NUM_SIMULATIONS = int(os.getenv("MC_NUM_SIMULATIONS", "1000"))

HF_TOKEN = os.getenv("HF_TOKEN", "")
