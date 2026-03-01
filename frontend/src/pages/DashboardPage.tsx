import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { fetchProperties } from "../data/properties";
import type { PropertyCard, SavedProperty, ChatMessage } from "../types";
import { sendChat, saveProperty, fetchSavedProperties, deleteSavedProperty, fetchBulkAppreciation } from "../api";
import SwipeCard from "../components/SwipeCard";

/* ── helpers ── */
export function fmtPrice(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toLocaleString()}k`;
}
export function matchScore(p: PropertyCard) {
  const priceW = Math.max(0, 1 - (p.price ?? 0) / 2_000_000) * 50;
  const sizeW = Math.min((p.sqft ?? 0) / 3000, 1) * 50;
  return Math.round(Math.min(98, Math.max(55, priceW + sizeW + 20)));
}
export function tags(p: PropertyCard) {
  const t: { label: string; color: string }[] = [];
  if (p.is_new_construction) t.push({ label: "New Construction", color: "#6db8a0" });
  if ((p.days_on_zillow ?? 99) <= 7) t.push({ label: "Just Listed", color: "#6db8a0" });
  if ((p.price_change ?? 0) < 0) t.push({ label: "Price Cut", color: "#c4a882" });
  if ((p.price ?? 0) < 600000) t.push({ label: "Under Budget", color: "#6db8a0" });
  if ((p.price ?? 0) > 1000000) t.push({ label: "Premium", color: "#c4a882" });
  if (p.property_type === "condo") t.push({ label: "Condo", color: "#9eb8d4" });
  if ((p.sqft ?? 0) >= 2000) t.push({ label: "Spacious", color: "#7ab3c8" });
  if (p.is_showcase_listing) t.push({ label: "Showcase", color: "#7ab3c8" });
  return t.slice(0, 3);
}

export const SURVEY = [
  { q: "How many bedrooms are you looking for?", options: ["1–2", "3", "4", "5+"] },
  { q: "What's your ideal location type?", options: ["Urban", "Suburban", "Coastal", "Rural"] },
  { q: "What's your budget range?", options: ["Under $500k", "$500–750k", "$750k–1M", "$1M+"] },
  { q: "How important are schools nearby?", options: ["Very", "Somewhat", "Not really", "No kids"] },
];

function filterByBedrooms(props: PropertyCard[], bedroomPref: string | null): PropertyCard[] {
  if (!bedroomPref) return props;
  const beds = (p: PropertyCard) => p.beds ?? 0;
  switch (bedroomPref) {
    case "1–2": return props.filter(p => beds(p) >= 1 && beds(p) <= 2);
    case "3": return props.filter(p => beds(p) >= 3);
    case "4": return props.filter(p => beds(p) >= 4);
    case "5+": return props.filter(p => beds(p) >= 5);
    default: return props;
  }
}

function filterByBudget(props: PropertyCard[], budgetPref: string | null): PropertyCard[] {
  if (!budgetPref) return props;
  const price = (p: PropertyCard) => p.price ?? 0;
  switch (budgetPref) {
    case "Under $500k": return props.filter(p => price(p) < 500_000);
    case "$500–750k": return props.filter(p => price(p) >= 500_000 && price(p) < 750_000);
    case "$750k–1M": return props.filter(p => price(p) >= 750_000 && price(p) < 1_000_000);
    case "$1M+": return props.filter(p => price(p) >= 1_000_000);
    default: return props;
  }
}

/* ── MatchArc ── */
export function MatchArc({ pct }: { pct: number }) {
  const r = 16, stroke = 3, circ = 2 * Math.PI * r;
  const color = pct >= 88 ? "#6db8a0" : pct >= 78 ? "#7ab3c8" : "#c4a882";
  return (
    <svg width={38} height={38} viewBox="0 0 38 38">
      <circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "19px 19px" }} />
      <text x={19} y={23} textAnchor="middle" fill="white" fontSize={9} fontWeight={700} fontFamily="'DM Sans',sans-serif">{pct}%</text>
    </svg>
  );
}

/* ── Wave canvas ── */
export function useWaveCanvas(paused: boolean) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    const waves = [
      { amp: 28, freq: 0.007, speed: 0.003, y: 0.30, color: "rgba(130,195,185,0.13)" },
      { amp: 20, freq: 0.010, speed: 0.002, y: 0.46, color: "rgba(105,180,200,0.10)" },
      { amp: 16, freq: 0.013, speed: 0.004, y: 0.60, color: "rgba(148,205,182,0.09)" },
      { amp: 24, freq: 0.006, speed: 0.0015, y: 0.73, color: "rgba(90,172,198,0.08)" },
      { amp: 12, freq: 0.017, speed: 0.005, y: 0.86, color: "rgba(128,202,187,0.07)" },
    ];
    let t = 0, raf: number;
    const draw = () => {
      if (!pausedRef.current) {
        ctx.clearRect(0, 0, W, H);
        waves.forEach(w => {
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 2) ctx.lineTo(x, w.y * H + Math.sin(x * w.freq + t * w.speed * 60) * w.amp);
          ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = w.color; ctx.fill();
        });
        t++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return ref;
}

/* ── Inline Chat Widget ── */
type ChatMode = "idle" | "inline" | "fullscreen";

function InlineChat() {
  const [mode, setMode] = useState<ChatMode>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! Ask me anything about a home, the buying process, or your finances." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (prefill?: string) => {
    const text = (prefill || input).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    if (mode === "idle") setMode("inline");
    try {
      const resp = await sendChat({ messages: updated.slice(-10) });
      setMessages(prev => [...prev, { role: "assistant", content: resp.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mode]);

  const hasMessages = messages.length > 1;

  const chatContent = (isFullscreen: boolean) => (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isFullscreen ? "16px 24px" : "10px 14px",
        borderBottom: "1px solid rgba(200,230,222,0.1)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6db8a0", boxShadow: "0 0 6px rgba(109,184,160,0.6)" }} />
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: isFullscreen ? 18 : 13, color: "rgba(220,240,235,0.9)", fontWeight: 500 }}>realease AI</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {mode === "inline" && (
            <button onClick={() => setMode("fullscreen")} title="Expand" style={{
              background: "rgba(200,230,222,0.08)", border: "1px solid rgba(200,230,222,0.12)",
              borderRadius: 6, width: 24, height: 24, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(200,230,222,0.5)", fontSize: 11,
            }}>⤢</button>
          )}
          {mode === "fullscreen" && (
            <button onClick={() => setMode("inline")} title="Minimize" style={{
              background: "rgba(200,230,222,0.08)", border: "1px solid rgba(200,230,222,0.12)",
              borderRadius: 6, width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(200,230,222,0.5)", fontSize: 13,
            }}>⤡</button>
          )}
          {hasMessages && (
            <button onClick={() => { setMode("idle"); setMessages([messages[0]]); }} title="Close" style={{
              background: "rgba(200,230,222,0.08)", border: "1px solid rgba(200,230,222,0.12)",
              borderRadius: 6, width: isFullscreen ? 28 : 24, height: isFullscreen ? 28 : 24, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(200,230,222,0.4)", fontSize: isFullscreen ? 14 : 11,
            }}>✕</button>
          )}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: isFullscreen ? "20px 28px" : "10px 12px",
        display: "flex", flexDirection: "column", gap: isFullscreen ? 12 : 8,
        scrollbarWidth: "none",
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            animation: i === messages.length - 1 ? "fadeUp 0.25s ease" : undefined,
          }}>
            <div style={{
              maxWidth: isFullscreen ? "65%" : "88%",
              padding: isFullscreen ? "12px 16px" : "8px 11px",
              borderRadius: 14, fontSize: isFullscreen ? 14 : 12, lineHeight: 1.55,
              color: msg.role === "user" ? "rgba(220,240,235,0.95)" : "rgba(220,240,235,0.8)",
              background: msg.role === "user" ? "rgba(109,184,160,0.2)" : "rgba(200,230,222,0.06)",
              border: msg.role === "user" ? "1px solid rgba(109,184,160,0.15)" : "1px solid rgba(200,230,222,0.06)",
              borderBottomRightRadius: msg.role === "user" ? 4 : 14,
              borderBottomLeftRadius: msg.role === "assistant" ? 4 : 14,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp 0.2s ease" }}>
            <div style={{
              padding: isFullscreen ? "12px 16px" : "8px 11px", borderRadius: 14,
              fontSize: isFullscreen ? 14 : 12, color: "rgba(200,230,222,0.4)",
              background: "rgba(200,230,222,0.06)", border: "1px solid rgba(200,230,222,0.06)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ display: "inline-block", animation: "pulse 1.2s ease infinite" }}>●</span>
              <span style={{ display: "inline-block", animation: "pulse 1.2s ease 0.2s infinite" }}>●</span>
              <span style={{ display: "inline-block", animation: "pulse 1.2s ease 0.4s infinite" }}>●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); send(); }} style={{
        display: "flex", gap: 6,
        padding: isFullscreen ? "14px 24px 18px" : "8px 12px 10px",
        borderTop: "1px solid rgba(200,230,222,0.08)", flexShrink: 0,
      }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask anything..."
          style={{
            flex: 1, background: "rgba(200,230,222,0.06)", border: "1px solid rgba(200,230,222,0.1)",
            borderRadius: 10, padding: isFullscreen ? "11px 14px" : "8px 11px",
            fontSize: isFullscreen ? 14 : 12, color: "rgba(220,240,235,0.9)",
            outline: "none", fontFamily: "inherit",
          }}
          onFocus={() => { if (mode === "idle") setMode("inline"); }}
        />
        <button type="submit" disabled={!input.trim() || loading} style={{
          width: isFullscreen ? 40 : 32, height: isFullscreen ? 40 : 32,
          borderRadius: 10, border: "none", flexShrink: 0,
          background: input.trim() ? "rgba(109,184,160,0.6)" : "rgba(200,230,222,0.08)",
          color: input.trim() ? "white" : "rgba(200,230,222,0.3)",
          fontSize: isFullscreen ? 16 : 13, cursor: input.trim() ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>→</button>
      </form>
    </>
  );

  if (mode === "fullscreen") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(15,35,30,0.6)", backdropFilter: "blur(10px)",
      }} onClick={() => setMode("inline")}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "min(600px, 90vw)", height: "min(700px, 85vh)",
          borderRadius: 24, overflow: "hidden",
          background: "rgba(32,62,56,0.95)", backdropFilter: "blur(30px)",
          boxShadow: "0 32px 80px rgba(15,35,30,0.4), 0 0 0 1px rgba(200,230,222,0.08)",
          display: "flex", flexDirection: "column",
        }}>
          {chatContent(true)}
        </div>
      </div>
    );
  }

  if (mode === "idle") {
    return (
      <div style={{
        background: "rgba(38,72,64,0.76)", backdropFilter: "blur(20px)",
        borderRadius: 18, padding: 0, display: "flex", flexDirection: "column", flex: 1,
        boxShadow: "0 6px 28px rgba(42,74,66,0.13)", minHeight: 0, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 18px 0", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: "rgba(220,240,235,0.95)", lineHeight: 1.25, marginBottom: 8 }}>
            How can I help?
          </div>
          <p style={{ fontSize: 12, color: "rgba(200,230,222,0.45)", lineHeight: 1.6, marginBottom: "auto" }}>
            Tell me what you need clarity on…
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "12px 0 10px" }}>
            {["Good buy?", "What's next?", "Explain risks"].map(p => (
              <button key={p} onClick={() => send(p)} style={{
                background: "rgba(200,230,222,0.07)", border: "1px solid rgba(200,230,222,0.14)",
                borderRadius: 18, padding: "4px 10px", fontSize: 10, color: "rgba(200,230,222,0.5)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}>{p}</button>
            ))}
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); send(); }} style={{
          display: "flex", gap: 6, padding: "10px 14px 12px",
          borderTop: "1px solid rgba(200,230,222,0.08)",
        }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Start a conversation..."
            style={{
              flex: 1, background: "rgba(200,230,222,0.06)", border: "1px solid rgba(200,230,222,0.1)",
              borderRadius: 10, padding: "8px 11px", fontSize: 12,
              color: "rgba(220,240,235,0.9)", outline: "none", fontFamily: "inherit",
            }}
            onFocus={() => setMode("inline")}
          />
          <button type="submit" disabled={!input.trim()} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", flexShrink: 0,
            background: input.trim() ? "rgba(109,184,160,0.6)" : "rgba(200,230,222,0.08)",
            color: input.trim() ? "white" : "rgba(200,230,222,0.3)",
            fontSize: 13, cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>→</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(38,72,64,0.82)", backdropFilter: "blur(20px)",
      borderRadius: 18, display: "flex", flexDirection: "column", flex: 1,
      boxShadow: "0 6px 28px rgba(42,74,66,0.13)", minHeight: 0, overflow: "hidden",
    }}>
      {chatContent(false)}
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const userId = user?.id ?? "";

  const [properties, setProperties] = useState<PropertyCard[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [deck, setDeck] = useState<PropertyCard[]>([]);
  const [liked, setLiked] = useState<PropertyCard[]>([]);
  const [saved, setSaved] = useState<SavedProperty[]>([]);
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [tab, setTab] = useState<"explore" | "saved">("explore");
  const [appreciation, setAppreciation] = useState<Record<string, number | null>>({});
  const canvasRef = useWaveCanvas(tab === "explore");
  const surveyDone = surveyStep >= SURVEY.length;

  const bedroomPref = surveyAnswers[0] ?? null;
  const budgetPref = surveyAnswers[2] ?? null;

  // Load live properties
  useEffect(() => {
    fetchProperties()
      .then((props) => setProperties(props))
      .catch(console.error)
      .finally(() => setPropertiesLoading(false));
  }, []);

  // Re-filter deck when preferences or properties change
  useEffect(() => {
    if (properties.length === 0) return;
    let filtered = filterByBedrooms(properties, bedroomPref);
    filtered = filterByBudget(filtered, budgetPref);
    setDeck([...filtered].reverse());
  }, [bedroomPref, budgetPref, properties]);

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
    const removed = saved.find(p => p.id === id);
    deleteSavedProperty(id).then(() => {
      setSaved(prev => prev.filter(p => p.id !== id));
      if (removed?.zpid) setLiked(prev => prev.filter(l => l.zpid !== removed.zpid));
    }).catch(() => { });
  };

  const handleAnswer = (opt: string) => {
    setSelected(opt);
    setSurveyAnswers(prev => {
      const next = [...prev];
      next[surveyStep] = opt;
      return next;
    });
    setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => { setSurveyStep(s => s + 1); setSelected(null); setFadeIn(true); }, 200);
    }, 340);
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden", fontFamily: "'DM Sans', sans-serif", color: "#1c3a35", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .chat-btn { transition: all 0.2s; cursor: pointer; }
        .chat-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 44px rgba(28,58,53,0.18) !important; }
        .chat-btn:hover .arrow { transform: translateX(4px); }
        .arrow { transition: transform 0.2s; display: inline-block; }
        .opt-btn { transition: all 0.14s; cursor: pointer; border: none; }
        .opt-btn:hover { background: rgba(28,58,53,0.11) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOut { to { opacity:0; transform:translateY(-6px); } }
        @keyframes pulse { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
        .fade-up { animation: fadeUp 0.26s ease forwards; }
        .fade-out { animation: fadeOut 0.17s ease forwards; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(155deg, #c0eae2 0%, #acdae8 38%, #c0e8d2 68%, #aadee8 100%)" }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: tab === "explore" ? 0 : 1, transition: "opacity 0.6s ease" }} />

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 48px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, letterSpacing: 0.5, color: "#2a4a42" }}>realease</span>
          <nav style={{ display: "flex", gap: 36 }}>
            {(["explore", "saved"] as const).map((n) => (
              <span key={n} onClick={() => setTab(n)} style={{
                fontSize: 14, cursor: "pointer", textTransform: "capitalize",
                color: tab === n ? "#2a4a42" : "rgba(42,74,66,0.38)",
                fontWeight: tab === n ? 600 : 400,
                borderBottom: tab === n ? "1.5px solid #2a4a42" : "none", paddingBottom: 2,
              }}>{n}</span>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(() => {
              const savedCount = saved.filter(p => p.liked === true).length;
              const displayCount = savedCount > 0 ? savedCount : liked.length;
              return displayCount > 0 && (
                <span onClick={() => setTab("saved")} style={{ fontSize: 12, color: "rgba(42,74,66,0.6)", background: "rgba(255,255,255,0.5)", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>
                  ♥ {displayCount} saved
                </span>
              );
            })()}
            <UserButton />
          </div>
        </header>

        {/* Tab Content */}
        {tab === "explore" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 256px", gap: 24, padding: "4px 48px 32px", flex: 1, minHeight: 0 }}>
            {/* Left — swipe */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: "rgba(42,74,66,0.45)", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>Best Matches · {deck.length} remaining</p>
                <p style={{ fontSize: 10, color: "rgba(42,74,66,0.32)" }}>drag or tap ✕ / ♥</p>
              </div>
              <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                {propertiesLoading ? (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.38)", backdropFilter: "blur(14px)", borderRadius: 20,
                  }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#2a4a42", opacity: 0.6 }}>Loading properties…</p>
                  </div>
                ) : deck.length === 0 ? (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.38)", backdropFilter: "blur(14px)", borderRadius: 20,
                  }}>
                    <div style={{ fontSize: 34, marginBottom: 12 }}>🌊</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#2a4a42", marginBottom: 8 }}>All caught up</p>
                    <p style={{ fontSize: 14, color: "rgba(42,74,66,0.45)", marginBottom: 20 }}>You've reviewed all your matches.</p>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => { let filtered = filterByBedrooms(properties, bedroomPref); filtered = filterByBudget(filtered, budgetPref); setDeck([...filtered].reverse()); setLiked([]); }} style={{
                        background: "rgba(42,74,66,0.09)", border: "1px solid rgba(42,74,66,0.18)",
                        borderRadius: 20, padding: "8px 22px", fontSize: 13, color: "#2a4a42", cursor: "pointer", fontFamily: "inherit",
                      }}>Start over</button>
                      <button onClick={() => navigate("/analyze")} style={{
                        background: "rgba(42,74,66,0.8)", border: "none",
                        borderRadius: 20, padding: "8px 22px", fontSize: 13, color: "white", cursor: "pointer", fontFamily: "inherit",
                      }}>Analyze a home →</button>
                    </div>
                  </div>
                ) : (
                  deck.slice(-3).map((listing, i) => {
                    const stackIndex = Math.min(deck.length, 3) - 1 - i;
                    return (
                      <SwipeCard
                        key={listing.zpid ?? i}
                        listing={listing}
                        onSwipe={handleSwipe}
                        isTop={stackIndex === 0}
                        stackIndex={stackIndex}
                        appreciationPct={appreciation[listing.zip_code ?? ""] ?? null}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Right — widgets */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
              <div style={{
                background: "rgba(255,255,255,0.46)", backdropFilter: "blur(16px)",
                borderRadius: 18, padding: "20px 18px",
                boxShadow: "0 3px 16px rgba(42,74,66,0.07)", flexShrink: 0,
              }}>
                <div className={fadeIn ? "fade-up" : "fade-out"} key={surveyStep}>
                  {!surveyDone ? (
                    <>
                      <p style={{ fontSize: 10, color: "rgba(42,74,66,0.38)", letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>{surveyStep + 1} of {SURVEY.length}</p>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 400, lineHeight: 1.5, marginBottom: 14, color: "#2a4a42" }}>{SURVEY[surveyStep].q}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {SURVEY[surveyStep].options.map(opt => (
                          <button key={opt} className="opt-btn" onClick={() => handleAnswer(opt)} style={{
                            padding: "6px 13px", borderRadius: 20, fontFamily: "inherit",
                            background: selected === opt ? "rgba(42,74,66,0.14)" : "rgba(42,74,66,0.07)",
                            color: "#2a4a42", fontSize: 12, fontWeight: selected === opt ? 600 : 400,
                            border: selected === opt ? "1.5px solid rgba(42,74,66,0.28)" : "1.5px solid transparent",
                          }}>{opt}</button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <div style={{ fontSize: 20, marginBottom: 8, color: "#6db8a0" }}>✓</div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#2a4a42", lineHeight: 1.45 }}>All set — refining your matches.</p>
                    </div>
                  )}
                </div>
              </div>
              <InlineChat />
            </div>
          </div>
        )}

        {tab === "saved" && (
          <div style={{ flex: 1, padding: "20px 48px", overflowY: "auto" }}>
            {saved.length === 0 && liked.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2a4a42" }}>No saved homes yet</p>
                <p style={{ fontSize: 14, color: "rgba(42,74,66,0.45)" }}>Swipe right on homes you like to save them here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {saved.length > 0 ? saved.filter(item => item.liked === true).map(p => {
                  const image = p.photo_url ?? liked.find(l => l.zpid === p.zpid)?.image;
                  const appPct = appreciation[p.zip_code ?? ""];
                  return (
                    <div key={p.id} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(28,58,53,0.08)" }}>
                      {image ? (
                        <img src={image} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                      ) : (
                        <div style={{ height: 120, background: "linear-gradient(135deg, rgba(109,184,160,0.15), rgba(90,172,198,0.15))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 36 }}>🏠</span>
                        </div>
                      )}
                      <div style={{ padding: "12px 16px" }}>
                        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#2a4a42", marginBottom: 4 }}>{p.street_address}</h3>
                        <p style={{ fontSize: 12, color: "rgba(42,74,66,0.5)" }}>{p.city} · {p.beds}bd {p.baths}ba · {(p.sqft ?? 0).toLocaleString()} sqft</p>
                        {appPct != null && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px", borderRadius: 12, background: appPct >= 0 ? "rgba(109,184,160,0.12)" : "rgba(196,122,106,0.10)" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: appPct >= 0 ? "#3a9a7e" : "#c47a6a" }}>
                              {appPct >= 0 ? "▲" : "▼"} {Math.abs(appPct * 100).toFixed(1)}%
                            </span>
                            <span style={{ fontSize: 10, color: "rgba(42,74,66,0.45)" }}>12-mo forecast</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#2a4a42" }}>{fmtPrice(p.price ?? 0)}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleRemoveSaved(p.id)} style={{
                              background: "rgba(196,122,106,0.1)", border: "none", borderRadius: 10, padding: "6px 12px",
                              fontSize: 12, color: "#c47a6a", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                            }}>Remove</button>
                            <button onClick={() => navigate("/analyze", { state: { prefill: { zip: p.zip_code, current_price: p.price, offer_price: p.price } } })} style={{
                              background: "rgba(42,74,66,0.1)", border: "none", borderRadius: 10, padding: "6px 14px",
                              fontSize: 12, color: "#2a4a42", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                            }}>Analyze →</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : liked.map((p, i) => {
                  const appPct = appreciation[p.zip_code ?? ""];
                  return (
                    <div key={p.zpid ?? i} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(28,58,53,0.08)" }}>
                      <img src={p.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                      <div style={{ padding: "12px 16px" }}>
                        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#2a4a42", marginBottom: 4 }}>{p.street_address}</h3>
                        <p style={{ fontSize: 12, color: "rgba(42,74,66,0.5)" }}>{p.city} · {p.beds}bd {p.baths}ba · {(p.sqft ?? 0).toLocaleString()} sqft</p>
                        {appPct != null && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px", borderRadius: 12, background: appPct >= 0 ? "rgba(109,184,160,0.12)" : "rgba(196,122,106,0.10)" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: appPct >= 0 ? "#3a9a7e" : "#c47a6a" }}>
                              {appPct >= 0 ? "▲" : "▼"} {Math.abs(appPct * 100).toFixed(1)}%
                            </span>
                            <span style={{ fontSize: 10, color: "rgba(42,74,66,0.45)" }}>12-mo forecast</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#2a4a42" }}>{fmtPrice(p.price ?? 0)}</span>
                          <button onClick={() => navigate("/analyze", { state: { prefill: { zip: p.zip_code, current_price: p.price, offer_price: p.price } } })} style={{
                            background: "rgba(42,74,66,0.1)", border: "none", borderRadius: 10, padding: "6px 14px",
                            fontSize: 12, color: "#2a4a42", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                          }}>Analyze →</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}