from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.models import Base


class Analysis(Base):
    __tablename__ = "saved_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    zip_code: Mapped[str] = mapped_column(String, nullable=False)
    offer_price: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    prob_downside: Mapped[float] = mapped_column(Float, nullable=False)
    p10: Mapped[float] = mapped_column(Float, nullable=False)
    p50: Mapped[float] = mapped_column(Float, nullable=False)
    p90: Mapped[float] = mapped_column(Float, nullable=False)
    fair_value_low: Mapped[float] = mapped_column(Float, nullable=False)
    fair_value_high: Mapped[float] = mapped_column(Float, nullable=False)
    fragility_index: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user = relationship("User", back_populates="analyses")