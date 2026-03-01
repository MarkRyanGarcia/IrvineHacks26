from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.models import Base


class Properties(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)

    liked: Mapped[bool] = mapped_column(nullable=False, default=False)

    address: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    sqft: Mapped[float] = mapped_column(Float, nullable=False)
    beds: Mapped[int] = mapped_column(Integer, nullable=False)
    baths: Mapped[float] = mapped_column(Float, nullable=False)
    property_type: Mapped[str] = mapped_column(String, nullable=False)
    school_score: Mapped[float] = mapped_column(Float, nullable=False)
    zip_code: Mapped[str] = mapped_column(String, nullable=False)
    commute_minutes: Mapped[int] = mapped_column(Integer, nullable=False)


    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user = relationship("User", back_populates="properties")