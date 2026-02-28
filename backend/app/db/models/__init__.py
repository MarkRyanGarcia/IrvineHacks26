from sqlalchemy.orm import declarative_base

Base = declarative_base()

from .user import User
from .analysis import Analysis

__all__ = [
    "User",
    "Analysis",
]
