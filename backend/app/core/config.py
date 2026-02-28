import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost/dbname",
)
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "sk-...")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEBUG = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
ENV = os.getenv("ENV", "production")

ZHVI_CSV_PATH = os.getenv(
    "ZHVI_CSV_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "data.csv"),
)

MC_NUM_SIMULATIONS = int(os.getenv("MC_NUM_SIMULATIONS", "1000"))
