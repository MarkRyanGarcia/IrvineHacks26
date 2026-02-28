"""
AI Homebuyer Confidence Coach
Data models for user preferences, session memory, and Llama 3 prompt construction.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
from datetime import datetime


# ─────────────────────────────────────────────
# ENUMS — Controlled vocabulary for preferences
# ─────────────────────────────────────────────

class LocationType(str, Enum):
    URBAN = "urban"
    SUBURBAN = "suburban"
    RURAL = "rural"
    NO_PREFERENCE = "no_preference"

class DesignStyle(str, Enum):
    MODERN = "modern"
    TRADITIONAL = "traditional"
    FARMHOUSE = "farmhouse"
    MINIMALIST = "minimalist"
    CRAFTSMAN = "craftsman"
    NO_PREFERENCE = "no_preference"

class RiskTolerance(str, Enum):
    LOW = "low"          # Wants stability, low volatility
    MEDIUM = "medium"    # Balanced
    HIGH = "high"        # OK with risk for higher upside

class JourneyStage(str, Enum):
    DEFINE_PREFERENCES = "define_preferences"   # Stage 1
    EXPLORE_HOMES = "explore_homes"             # Stage 2
    FINANCIAL_EVALUATION = "financial_evaluation"  # Stage 3
    OFFER_AND_CLOSING = "offer_and_closing"     # Stage 4
    FINAL_REVIEW = "final_review"               # Stage 5


# ─────────────────────────────────────────────
# USER PREFERENCES — Collected during onboarding
# ─────────────────────────────────────────────

@dataclass
class BudgetRange:
    min_price: int = 0          # e.g. 200000
    max_price: int = 500000     # e.g. 500000
    currency: str = "USD"

    def to_prompt_str(self) -> str:
        return f"${self.min_price:,} – ${self.max_price:,}"


@dataclass
class HomePreferences:
    # Location
    location_type: LocationType = LocationType.NO_PREFERENCE
    preferred_cities: list[str] = field(default_factory=list)   # e.g. ["Austin", "Denver"]
    max_commute_minutes: Optional[int] = None                   # e.g. 30

    # Budget
    budget: BudgetRange = field(default_factory=BudgetRange)

    # Home features
    min_bedrooms: int = 2
    min_bathrooms: float = 1.0
    min_sqft: Optional[int] = None
    max_sqft: Optional[int] = None
    min_lot_size_sqft: Optional[int] = None

    # Lifestyle
    school_importance: int = 3          # 1 (not important) to 5 (critical)
    design_style: DesignStyle = DesignStyle.NO_PREFERENCE
    needs_home_office: bool = False
    needs_garage: bool = False
    pet_friendly: bool = False

    # Financial mindset
    risk_tolerance: RiskTolerance = RiskTolerance.MEDIUM
    investment_horizon_years: int = 5   # How long they plan to stay


# ─────────────────────────────────────────────
# HOME INTERACTION LOG — Tracks likes/skips/saves
# ─────────────────────────────────────────────

class InteractionType(str, Enum):
    LIKED = "liked"
    SKIPPED = "skipped"
    SAVED = "saved"
    VIEWED_DETAILS = "viewed_details"

@dataclass
class HomeInteraction:
    home_id: str
    interaction: InteractionType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    notes: Optional[str] = None     # User can add freeform notes


# ─────────────────────────────────────────────
# CONVERSATION MEMORY — What the AI remembers
# ─────────────────────────────────────────────

@dataclass
class Message:
    role: str       # "user" or "assistant"
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ConversationMemory:
    messages: list[Message] = field(default_factory=list)
    max_history: int = 20   # Limit to avoid exceeding context window

    def add(self, role: str, content: str):
        self.messages.append(Message(role=role, content=content))
        # Keep only the most recent N messages
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]

    def to_llama_format(self) -> list[dict]:
        """Convert to the message list format Llama 3 expects."""
        return [{"role": m.role, "content": m.content} for m in self.messages]


# ─────────────────────────────────────────────
# USER SESSION — The full object passed to Llama
# ─────────────────────────────────────────────

@dataclass
class UserSession:
    user_id: str
    preferences: HomePreferences = field(default_factory=HomePreferences)
    journey_stage: JourneyStage = JourneyStage.DEFINE_PREFERENCES
    home_interactions: list[HomeInteraction] = field(default_factory=list)
    conversation: ConversationMemory = field(default_factory=ConversationMemory)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def get_liked_homes(self) -> list[str]:
        return [i.home_id for i in self.home_interactions if i.interaction == InteractionType.LIKED]

    def get_saved_homes(self) -> list[str]:
        return [i.home_id for i in self.home_interactions if i.interaction == InteractionType.SAVED]

    def build_system_prompt(self) -> str:
        """
        Constructs the system prompt injected at the start of every Llama 3 call.
        This is how the model 'remembers' the user across messages.
        """
        p = self.preferences

        liked = self.get_liked_homes()
        saved = self.get_saved_homes()

        system_prompt = f"""You are an AI Homebuyer Confidence Coach — a friendly, knowledgeable guide 
helping first-time homebuyers navigate the process with clarity and confidence.

## Current User Profile
- Journey Stage: {self.journey_stage.value.replace('_', ' ').title()}
- Location Preference: {p.location_type.value}
- Preferred Cities: {', '.join(p.preferred_cities) if p.preferred_cities else 'Not specified'}
- Budget: {p.budget.to_prompt_str()}
- Bedrooms: {p.min_bedrooms}+ | Bathrooms: {p.min_bathrooms}+
- Design Style: {p.design_style.value}
- School Importance: {p.school_importance}/5
- Max Commute: {f"{p.max_commute_minutes} minutes" if p.max_commute_minutes else "Not specified"}
- Risk Tolerance: {p.risk_tolerance.value}
- Investment Horizon: {p.investment_horizon_years} years
- Needs Home Office: {p.needs_home_office} | Garage: {p.needs_garage} | Pet Friendly: {p.pet_friendly}

## Engagement History
- Homes Liked: {len(liked)} | Homes Saved: {len(saved)}

## Your Behavior Rules
- Always explain real estate terms in plain English when you use them.
- Reference the user's preferences naturally in your responses.
- Be encouraging and reduce anxiety — this is a big decision.
- When discussing finances, be honest about uncertainty and risk.
- Keep responses concise unless the user asks for more detail.
- Current stage focus: {self.journey_stage.value.replace('_', ' ').title()}
"""
        return system_prompt.strip()


# ─────────────────────────────────────────────
# EXAMPLE USAGE
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # Create a new user session
    session = UserSession(user_id="user_001")

    # Set their preferences (would come from onboarding form)
    session.preferences = HomePreferences(
        location_type=LocationType.SUBURBAN,
        preferred_cities=["Austin", "Round Rock"],
        max_commute_minutes=30,
        budget=BudgetRange(min_price=300000, max_price=450000),
        min_bedrooms=3,
        min_bathrooms=2.0,
        school_importance=4,
        design_style=DesignStyle.MODERN,
        needs_home_office=True,
        risk_tolerance=RiskTolerance.LOW,
        investment_horizon_years=7
    )

    # Simulate a conversation turn
    session.conversation.add("user", "Is this neighborhood a good investment?")

    # Build what gets sent to Llama 3
    system_prompt = session.build_system_prompt()
    messages = session.conversation.to_llama_format()

    print("=== SYSTEM PROMPT ===")
    print(system_prompt)
    print("\n=== MESSAGES ===")
    for m in messages:
        print(f"[{m['role']}]: {m['content']}")
