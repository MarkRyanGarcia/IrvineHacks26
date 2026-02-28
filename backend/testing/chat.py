"""
AI Homebuyer Confidence Coach — Terminal Test Client
Uses Groq's free API with Llama 3 8B Instruct.

Setup:
    pip install groq
    Get your free API key at: https://console.groq.com
    Then run: python chat.py
"""

import os
from groq import Groq
from models import (
    UserSession, HomePreferences, BudgetRange,
    LocationType, DesignStyle, RiskTolerance, JourneyStage
)


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "your_api_key_here")
MODEL = "llama-3.1-8b-instant"   # Free Llama 3 8B on Groq


# ─────────────────────────────────────────────
# ONBOARDING — Collect basic preferences
# ─────────────────────────────────────────────

def onboard_user() -> UserSession:
    """Quick onboarding to populate preferences before chatting."""
    print("\n" + "="*50)
    print("  🏠 AI Homebuyer Confidence Coach")
    print("="*50)
    print("Let's get to know you before we start.\n")

    session = UserSession(user_id="test_user")
    prefs = HomePreferences()

    # Budget
    try:
        min_b = int(input("💰 Minimum budget (e.g. 200000): $").strip() or "200000")
        max_b = int(input("💰 Maximum budget (e.g. 400000): $").strip() or "400000")
        prefs.budget = BudgetRange(min_price=min_b, max_price=max_b)
    except ValueError:
        prefs.budget = BudgetRange(min_price=200000, max_price=400000)

    # Location
    print("\n📍 Location preference:")
    print("  1. Urban  2. Suburban  3. Rural  4. No preference")
    loc_choice = input("Choose (1-4): ").strip()
    loc_map = {"1": LocationType.URBAN, "2": LocationType.SUBURBAN,
               "3": LocationType.RURAL, "4": LocationType.NO_PREFERENCE}
    prefs.location_type = loc_map.get(loc_choice, LocationType.NO_PREFERENCE)

    # Cities
    cities_input = input("\n🏙️  Preferred cities (comma separated, or press Enter to skip): ").strip()
    if cities_input:
        prefs.preferred_cities = [c.strip() for c in cities_input.split(",")]

    # Bedrooms
    try:
        prefs.min_bedrooms = int(input("\n🛏️  Minimum bedrooms (e.g. 3): ").strip() or "3")
    except ValueError:
        prefs.min_bedrooms = 3

    # Schools
    try:
        prefs.school_importance = int(input("\n🎓 School quality importance (1=low, 5=critical): ").strip() or "3")
    except ValueError:
        prefs.school_importance = 3

    # Risk tolerance
    print("\n📊 Risk tolerance (how you feel about investment risk):")
    print("  1. Low (I want stability)  2. Medium  3. High (I want max upside)")
    risk_choice = input("Choose (1-3): ").strip()
    risk_map = {"1": RiskTolerance.LOW, "2": RiskTolerance.MEDIUM, "3": RiskTolerance.HIGH}
    prefs.risk_tolerance = risk_map.get(risk_choice, RiskTolerance.MEDIUM)

    session.preferences = prefs
    print("\n✅ Great! Let's start your homebuying journey.\n")
    return session


# ─────────────────────────────────────────────
# CHAT LOOP
# ─────────────────────────────────────────────

def chat(session: UserSession):
    """Main conversation loop."""
    client = Groq(api_key=GROQ_API_KEY)

    print("─" * 50)
    print("💬 Chat with your AI Homebuyer Coach")
    print("   Type 'quit' to exit | 'stage' to change journey stage")
    print("   Type 'profile' to see your current preferences")
    print("─" * 50 + "\n")

    # Opening message from the coach
    opening = call_llama(client, session, "Introduce yourself briefly and ask me one question to help understand what I'm looking for in a home.")
    print(f"🏠 Coach: {opening}\n")
    session.conversation.add("assistant", opening)

    while True:
        user_input = input("You: ").strip()

        if not user_input:
            continue

        # Special commands
        if user_input.lower() == "quit":
            print("\n👋 Good luck with your home search!")
            break

        if user_input.lower() == "profile":
            print("\n📋 Your Current Profile:")
            print(session.build_system_prompt())
            print()
            continue

        if user_input.lower() == "stage":
            print("\n🗺️  Journey Stages:")
            for i, stage in enumerate(JourneyStage, 1):
                marker = "◀" if stage == session.journey_stage else " "
                print(f"  {marker} {i}. {stage.value.replace('_', ' ').title()}")
            try:
                choice = int(input("Switch to stage (1-5): ").strip())
                stages = list(JourneyStage)
                if 1 <= choice <= 5:
                    session.journey_stage = stages[choice - 1]
                    print(f"✅ Now in: {session.journey_stage.value.replace('_', ' ').title()}\n")
            except ValueError:
                pass
            continue

        # Add user message to memory
        session.conversation.add("user", user_input)

        # Call Llama 3 via Groq
        response = call_llama(client, session)

        # Add response to memory
        session.conversation.add("assistant", response)

        print(f"\n🏠 Coach: {response}\n")


# ─────────────────────────────────────────────
# LLAMA 3 API CALL
# ─────────────────────────────────────────────

def call_llama(client: Groq, session: UserSession, override_message: str = None) -> str:
    """
    Sends the system prompt + conversation history to Llama 3 via Groq.
    The system prompt includes the full user profile so the model always
    has context about who it's talking to.
    """
    messages = [
        {"role": "system", "content": session.build_system_prompt()}
    ]

    if override_message:
        # Used for scripted prompts like the opening message
        messages.append({"role": "user", "content": override_message})
    else:
        # Use the real conversation history
        messages.extend(session.conversation.to_llama_format())

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return f"⚠️  Error calling Groq API: {e}"


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    if GROQ_API_KEY == "your_api_key_here":
        print("\n⚠️  No API key found!")
        print("Set it by running: export GROQ_API_KEY=your_key_here")
        print("Or paste it directly into chat.py on line 16.\n")
        exit(1)

    session = onboard_user()
    chat(session)
