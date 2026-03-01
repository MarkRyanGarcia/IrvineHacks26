import { useState, useRef, useEffect } from "react";
import { deleteSavedProperty, fetchBulkAppreciation, fetchSavedProperties, saveProperty, sendChat } from "../api";
import Navbar from "../components/Navbar";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { fetchProperties } from "../data/properties";
import type { PropertyCard, SavedProperty } from "../types";
import { SURVEY } from "../data/dashboardData";
import { useWaveCanvas } from "./DashboardPage";
import SwipeCard from "../components/SwipeCard";
// Import your SwipeCard component here
// import SwipeCard from "../components/SwipeCard"; 

const SCOPE_CLASS = "chatting-page-isolated";

type Message = {
    role: "user" | "assistant";
    content: string;
};

// Placeholder SwipeCard for demonstration 
// Replace this with your actual SwipeCard component logic
function SwipeCardPlaceholder({
    propertiesLoading,
    properties,
    deck,
    setDeck,
    handleSwipe,
    appreciation,
    setLiked,
}: {
    propertiesLoading: boolean;
    properties: PropertyCard[];
    deck: PropertyCard[];
    setDeck: any;
    handleSwipe: (action: "like" | "dislike") => void;
    appreciation: Record<string, number | null>;
    setLiked: React.Dispatch<React.SetStateAction<PropertyCard[]>>;
}) {
    const navigate = useNavigate();

    return (
        <div
            style={{
                width: "100%",
                maxWidth: "420px", // Slightly wider for swipe room
                height: "600px",    // Increased height to accommodate card + action buttons
                margin: "40px auto",
                position: "relative",
                zIndex: 50,         // Ensure it sits above background blobs
            }}
        >
            {propertiesLoading ? (
                <div style={{
                    height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.1)", backdropFilter: "blur(14px)", borderRadius: 20,
                }}>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, color: "white", opacity: 0.6 }}>
                        Finding properties...
                    </p>
                </div>
            ) : deck.length === 0 ? (
                <div style={{
                    height: "100%", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.1)", backdropFilter: "blur(14px)", borderRadius: 20,
                    textAlign: "center", padding: "20px"
                }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🌊</div>
                    <p style={{ fontFamily: 'Fraunces', fontSize: 24, color: "white", marginBottom: 8 }}>All caught up</p>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>Review matches or start fresh.</p>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => { setDeck([...properties].reverse()); setLiked([]); }}
                            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 20, padding: "10px 20px", color: "white", cursor: "pointer" }}>
                            Reset
                        </button>
                    </div>
                </div>
            ) : (
                /* This is the stack container. It MUST be relative and full height */
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    {deck.slice(-3).map((listing, i) => {
                        // Correct stack index calculation
                        const stackIndex = Math.min(deck.length, 3) - 1 - i;
                        return (
                            <SwipeCard
                                key={listing.zpid || i}
                                listing={listing}
                                onSwipe={handleSwipe}
                                isTop={stackIndex === 0}
                                stackIndex={stackIndex}
                                appreciationPct={appreciation[listing.zip_code ?? ""] ?? null}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ChattingPage() {
    const { user } = useUser();
    const userId = user?.id ?? "";

    const [properties, setProperties] = useState<PropertyCard[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);
    const [deck, setDeck] = useState<PropertyCard[]>([]);
    const [liked, setLiked] = useState<PropertyCard[]>([]);
    const [saved, setSaved] = useState<SavedProperty[]>([]);
    const [surveyStep, setSurveyStep] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [fadeIn, setFadeIn] = useState(true);
    const [tab, setTab] = useState<"explore" | "saved">("explore");
    const [appreciation, setAppreciation] = useState<Record<string, number | null>>({});
    const canvasRef = useWaveCanvas(tab === "explore");
    const surveyDone = surveyStep >= SURVEY.length;

    // Load live properties
    useEffect(() => {
        fetchProperties()
            .then((props) => {
                setProperties(props);
                setDeck([...props].reverse());
            })
            .catch(console.error)
            .finally(() => setPropertiesLoading(false));
    }, []);

    useEffect(() => {
        if (userId) fetchSavedProperties(userId).then(setSaved).catch(() => { });
    }, [userId]);

    useEffect(() => {
        const propertyZips = properties.map(p => p.zip_code).filter(Boolean) as string[];
        const savedZips = saved.map(p => p.zip_code).filter(Boolean) as string[];
        const allZips = [...new Set([...propertyZips, ...savedZips])];
        if (allZips.length > 0) {
            fetchBulkAppreciation(allZips).then(r => setAppreciation(prev => ({ ...prev, ...r.results }))).catch(() => { });
        }
    }, [saved, properties]);

    const handleSwipe = (action: "like" | "dislike") => {
        const top = deck[deck.length - 1];
        if (top) {
            if (action === "like") setLiked(l => [...l, top]);
            if (userId) {
                saveProperty({
                    user_id: userId,
                    liked: action === "like",
                    zpid: top.zpid,
                    street_address: top.street_address,
                    city: top.city,
                    state: top.state,
                    zip_code: top.zip_code,
                    latitude: top.latitude,
                    longitude: top.longitude,
                    price: top.price,
                    price_per_sqft: top.price_per_sqft,
                    price_change: top.price_change,
                    price_changed_date: top.price_changed_date,
                    listing_status: top.listing_status,
                    days_on_zillow: top.days_on_zillow,
                    listing_date: top.listing_date,
                    property_type: top.property_type,
                    beds: top.beds,
                    baths: top.baths,
                    sqft: top.sqft,
                    lot_size: top.lot_size,
                    lot_size_unit: top.lot_size_unit,
                    year_built: top.year_built,
                    is_new_construction: top.is_new_construction,
                    zestimate: top.zestimate,
                    rent_zestimate: top.rent_zestimate,
                    tax_assessed_value: top.tax_assessed_value,
                    tax_assessment_year: top.tax_assessment_year,
                    has_vr_model: top.has_vr_model,
                    has_videos: top.has_videos,
                    has_floor_plan: top.has_floor_plan,
                    is_showcase_listing: top.is_showcase_listing,
                    open_house_start: top.open_house_start,
                    open_house_end: top.open_house_end,
                    broker_name: top.broker_name,
                    photo_url: top.image,
                }).then(s => setSaved(prev => [...prev, s])).catch(() => { });
            }
        }
        setDeck(d => d.slice(0, -1));
    };

    const handleRemoveSaved = (id: number) => {
        deleteSavedProperty(id).then(() => setSaved(prev => prev.filter(p => p.id !== id))).catch(() => { });
    };

    const handleAnswer = (opt: string) => {
        setSelected(opt);
        setTimeout(() => {
            setFadeIn(false);
            setTimeout(() => { setSurveyStep(s => s + 1); setSelected(null); setFadeIn(true); }, 200);
        }, 340);
    };


    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const conversationStarted = messages.length > 0;

    // Logic: Count only messages where role is "user"
    const userMessageCount = messages.filter(m => m.role === "user").length;
    const showSwipeCard = userMessageCount >= 5;

    useEffect(() => {
        document.documentElement.classList.add(SCOPE_CLASS);
        document.body.classList.add(SCOPE_CLASS);
        textareaRef.current?.focus();
        return () => {
            document.documentElement.classList.remove(SCOPE_CLASS);
            document.body.classList.remove(SCOPE_CLASS);
        };
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [input]);

    useEffect(() => {
        if (conversationStarted) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: "user", content: input };
        const updated = [...messages, userMessage];

        setMessages(updated);
        setInput("");
        setLoading(true);

        try {
            const res = await sendChat({ messages: updated.slice(-10) });
            setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Something went wrong. Try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Jost:wght@300;400&display=swap');

        html.${SCOPE_CLASS}, body.${SCOPE_CLASS} { background: #FF6200 !important; margin: 0; padding: 0; }
        
        .${SCOPE_CLASS} .page-root {
          min-height: 100vh;
          background: #FF6200 !important;
          position: relative;
          font-family: 'Jost', sans-serif;
          color: white;
          overflow-x: hidden;
        }

        @keyframes drift-a { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.05); } 100% { transform: translate(-10px, 15px) scale(0.98); } }
        @keyframes sun-rise { 0% { clip-path: circle(48px at 50% 50%); } 100% { clip-path: circle(150vmax at 50% 50%); } }
        @keyframes face-fade { 0%, 30% { opacity: 1; } 60%, 100% { opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        .${SCOPE_CLASS} .sun-overlay {
          position: fixed; inset: 0; background: #FF6200; z-index: 1; pointer-events: none;
          clip-path: circle(48px at 50% 50%);
          animation: sun-rise 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
        }
        .${SCOPE_CLASS} .sun-face {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 96px; height: 96px; z-index: 2; pointer-events: none;
          animation: face-fade 1.8s ease 0.3s forwards;
        }

        .${SCOPE_CLASS} .bg-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .${SCOPE_CLASS} .blob-a { animation: drift-a 18s ease-in-out infinite; }

        .${SCOPE_CLASS} .chat-container {
          position: relative; z-index: 10;
          width: min(900px, 90vw);
          margin: 0 auto;
          padding: 120px 0 250px; /* Increased bottom padding for input area */
          display: flex;
          flex-direction: column;
          gap: 60px;
        }

        .${SCOPE_CLASS} .message {
          font-family: 'Fraunces', serif;
          font-size: clamp(24px, 4vw, 42px);
          line-height: 1.2;
          font-weight: 300;
          animation: fade-in-up 0.5s ease forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .${SCOPE_CLASS} .assistant { opacity: 0.8; font-style: italic; color: rgba(255,255,255,0.85); }

        .${SCOPE_CLASS} .input-fixed-wrapper {
          position: fixed;
          bottom: 0; left: 0; width: 100%;
          padding: 40px 0;
          background: linear-gradient(transparent, #FF6200 40%);
          z-index: 20;
          display: flex;
          justify-content: center;
        }

        .${SCOPE_CLASS} .input-box {
          width: min(800px, 84vw);
          border-bottom: 1px solid rgba(255,255,255,0.4);
          display: flex;
          align-items: flex-start;
          position: relative;
        }

        .${SCOPE_CLASS} .input-textarea {
          width: 100%; background: transparent; border: none; outline: none;
          resize: none; font-family: 'Jost', sans-serif; font-size: 1.2rem;
          color: white; padding: 10px 0; caret-color: white;
        }

        .${SCOPE_CLASS} .cursor-line {
          display: inline-block; width: 2px; height: 1.4rem;
          background: #fff; animation: blink 1.05s step-start infinite;
          position: absolute; left: 0; top: 12px; pointer-events: none;
        }
      `}</style>

            <div className="page-root">
                <div className="sun-overlay" />
                <svg className="sun-face" viewBox="0 0 96 96" fill="none">
                    <path d="M33 40 Q36 36 39 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M57 40 Q60 36 63 40" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M30 56 Q48 70 66 56" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
                </svg>

                <svg className="bg-canvas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
                    <defs><filter id="blur"><feGaussianBlur stdDeviation="60" /></filter></defs>
                    <g className="blob-a"><ellipse cx="170" cy="210" rx="370" ry="290" fill="#F9C89A" opacity="0.4" filter="url(#blur)" /></g>
                    <g className="blob-b"><ellipse cx="1300" cy="100" rx="300" ry="300" fill="#F4A26A" opacity="0.3" filter="url(#blur)" /></g>
                </svg>

                <Navbar />

                <main className="chat-container">
                    {!conversationStarted && (
                        <h1 style={{
                            fontFamily: 'Fraunces', fontSize: 'clamp(3rem, 5vw, 5.5rem)',
                            fontWeight: 300, fontStyle: 'italic', textAlign: 'center',
                            marginTop: '10vh'
                        }}>
                            I'm Realease. <br /><em>what's on your mind?</em>
                        </h1>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            {msg.content}
                        </div>
                    ))}

                    {/* Conditional Rendering of SwipeCard */}
                    {showSwipeCard && (
                        <div className="swipe-card-wrapper" style={{ animation: 'fade-in-up 0.8s ease forwards' }}>
                            <SwipeCardPlaceholder
                                propertiesLoading={propertiesLoading}
                                properties={properties}
                                deck={deck}
                                setDeck={setDeck}
                                handleSwipe={handleSwipe}
                                appreciation={appreciation}
                                setLiked={setLiked}
                            />
                        </div>
                    )}

                    {loading && <div className="message assistant" style={{ opacity: 0.4 }}>Thinking...</div>}
                    <div ref={bottomRef} />
                </main>

                <div className="input-fixed-wrapper">
                    <div className="input-box" onClick={() => textareaRef.current?.focus()}>
                        {(input.length === 0 && !isFocused) && <span className="cursor-line" />}
                        <textarea
                            ref={textareaRef}
                            className="input-textarea"
                            value={input}
                            rows={1}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder=""
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}