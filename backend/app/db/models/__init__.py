from sqlalchemy.orm import declarative_base

Base = declarative_base()

from .user import User
from .analysis import SavedAnalysis

__all__ = [
    "User",
    "SavedAnalysis",
]
