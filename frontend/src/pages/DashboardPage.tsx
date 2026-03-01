import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { MOCK_PROPERTIES } from "../data/properties";
import type { PropertyCard } from "../types";
import { sendChat } from "../api";
import type { ChatMessage } from "../types";

/* ── helpers ── */
function fmtPrice(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toLocaleString()}k`;
}
function matchScore(p: PropertyCard) {
  const schoolW = Math.min(p.school_score / 10, 1) * 30;
  const commuteW = Math.max(0, 1 - p.commute_minutes / 50) * 20;
  const priceW = Math.max(0, 1 - p.price / 2_000_000) * 30;
  const sizeW = Math.min(p.sqft / 3000, 1) * 20;
  return Math.round(Math.min(98, Math.max(55, schoolW + commuteW + priceW + sizeW + 20)));
}
function tags(p: PropertyCard) {
  const t: { label: string; color: string }[] = [];
  if (p.school_score >= 8) t.push({ label: "Great Schools", color: "#6db8a0" });
  if (p.school_score <= 6) t.push({ label: "Avg. Schools", color: "#c4a882" });
  if (p.commute_minutes <= 15) t.push({ label: "Short Commute", color: "#7ab3c8" });
  if (p.price < 600000) t.push({ label: "Under Budget", color: "#6db8a0" });
  if (p.price > 1000000) t.push({ label: "Premium", color: "#c4a882" });
  if (p.property_type === "Condo") t.push({ label: "Condo", color: "#9eb8d4" });
  if (p.sqft >= 2000) t.push({ label: "Spacious", color: "#7ab3c8" });
  return t.slice(0, 3);
}

const SURVEY = [
  { q: "How many bedrooms are you looking for?", options: ["1–2", "3", "4", "5+"] },
  { q: "What's your ideal location type?", options: ["Urban", "Suburban", "Coastal", "Rural"] },
  { q: "What's your budget range?", options: ["Under $500k", "$500–750k", "$750k–1M", "$1M+"] },
  { q: "How important are schools nearby?", options: ["Very", "Somewhat", "Not really", "No kids"] },
];

/* ── MatchArc ── */
function MatchArc({ pct }: { pct: number }) {
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
function useWaveCanvas(paused: boolean) {
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

/* ── SwipeCard ── */
interface SwipeCardProps { listing: PropertyCard; onSwipe: (action: "like" | "dislike") => void; isTop: boolean; stackIndex: number; }

function SwipeCard({ listing, onSwipe, isTop, stackIndex }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const nopeRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const match = matchScore(listing);
  const matchColor = match >= 88 ? "#6db8a0" : match >= 78 ? "#7ab3c8" : "#c4a882";

  const yOff = isTop ? 0 : stackIndex === 1 ? 10 : 19;
  const scale = isTop ? 1 : stackIndex === 1 ? 0.96 : 0.92;

  const applyTransform = useCallback((dx: number, dy: number, dragging: boolean) => {
    const el = cardRef.current;
    if (!el) return;
    const rot = dx * 0.04;
    const ty = dy * 0.22;
    el.style.transform = `translateX(${dx}px) translateY(${ty + yOff}px) rotate(${rot}deg) scale(${scale})`;
    el.style.transition = dragging ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)";
    el.style.cursor = dragging ? "grabbing" : "grab";
    if (likeRef.current) likeRef.current.style.opacity = String(Math.min(1, Math.max(0, dx / 70)));
    if (nopeRef.current) nopeRef.current.style.opacity = String(Math.min(1, Math.max(0, -dx / 70)));
  }, [yOff, scale]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };
  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTop) return;
    const p = getPos(e);
    dragState.current = { dragging: true, startX: p.x, startY: p.y, dx: 0, dy: 0 };
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    const p = getPos(e);
    ds.dx = p.x - ds.startX;
    ds.dy = p.y - ds.startY;
    applyTransform(ds.dx, ds.dy, true);
  };
  const onEnd = () => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    ds.dragging = false;
    if (Math.abs(ds.dx) > 80) {
      const dir = ds.dx > 0 ? "right" as const : "left" as const;
      setExiting(dir);
      setTimeout(() => onSwipe(dir === "right" ? "like" : "dislike"), 340);
    } else {
      applyTransform(0, 0, false);
    }
  };
  const trigger = (dir: "left" | "right") => { setExiting(dir); setTimeout(() => onSwipe(dir === "right" ? "like" : "dislike"), 340); };

  const cardTags = tags(listing);

  return (
    <div
      ref={cardRef}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      style={{
        position: "absolute", inset: 0,
        transform: exiting
          ? `translateX(${exiting === "right" ? 900 : -900}px) translateY(${-50 + yOff}px) rotate(${exiting === "right" ? 24 : -24}deg) scale(${scale})`
          : `translateY(${yOff}px) scale(${scale})`,
        transition: exiting ? "transform 0.34s cubic-bezier(0.25,0.46,0.45,0.94)" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: isTop ? "grab" : "default",
        zIndex: isTop ? 10 : stackIndex === 1 ? 9 : 8,
        userSelect: "none",
        willChange: isTop ? "transform" : "auto",
      }}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: 20, overflow: "hidden",
        background: "rgba(255,255,255,0.45)",
        boxShadow: isTop ? "0 16px 48px rgba(28,58,53,0.14)" : "0 5px 18px rgba(28,58,53,0.07)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", background: "rgba(28,58,53,0.06)" }}>
          <img src={listing.image} alt="" draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "62%", background: "linear-gradient(to top, rgba(15,35,30,0.72), transparent)" }} />

          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(20,45,40,0.5)",
            borderRadius: 14, padding: "4px 10px 4px 6px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <MatchArc pct={match} />
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.52)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>AI Match</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: matchColor }}>{match}% fit</div>
            </div>
          </div>

          <div ref={likeRef} style={{ position: "absolute", top: 18, left: 16, border: "2px solid #6db8a0", borderRadius: 6, padding: "2px 9px", transform: "rotate(-18deg)", opacity: 0, pointerEvents: "none" }}>
            <span style={{ color: "#6db8a0", fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>LIKE</span>
          </div>
          <div ref={nopeRef} style={{ position: "absolute", top: 18, right: 16, border: "2px solid #c4a882", borderRadius: 6, padding: "2px 9px", transform: "rotate(18deg)", opacity: 0, pointerEvents: "none" }}>
            <span style={{ color: "#c4a882", fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>NOPE</span>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 7 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 500, color: "white", lineHeight: 1.2 }}>{listing.address}</h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 3 }}>{listing.city} · {listing.beds}bd {listing.baths}ba · {listing.sqft.toLocaleString()}</p>
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500, color: "white", whiteSpace: "nowrap", paddingLeft: 10 }}>{fmtPrice(listing.price)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
              {cardTags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                  background: "rgba(20,45,40,0.55)", color: tag.color,
                  border: `1px solid ${tag.color}55`,
                }}>{tag.label}</span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.52)", lineHeight: 1.45, fontStyle: "italic" }}>
              {listing.school_score >= 8 ? "Top-rated schools in this area." : ""}
              {listing.commute_minutes <= 15 ? " Quick commute." : ""}
              {listing.price < 700000 ? " Within a typical first-time budget." : ""}
            </p>
          </div>
        </div>

        {isTop && (
          <div style={{ display: "flex", justifyContent: "center", gap: 22, padding: "9px 0", background: "rgba(240,248,245,0.55)", flexShrink: 0 }}>
            <button onClick={() => trigger("left")} style={{
              width: 38, height: 38, borderRadius: "50%", border: "none",
              background: "rgba(196,168,130,0.15)", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#c4a882",
            }}>✕</button>
            <button onClick={() => trigger("right")} style={{
              width: 38, height: 38, borderRadius: "50%", border: "none",
              background: "rgba(109,184,160,0.15)", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#6db8a0",
            }}>♥</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Inline Chat Widget — idle / inline / fullscreen ── */
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
      {/* Header */}
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

      {/* Messages */}
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

      {/* Input */}
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

  /* ── Fullscreen overlay ── */
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

  /* ── Idle CTA state ── */
  if (mode === "idle") {
    return (
      <div style={{
        background: "rgba(38,72,64,0.76)", backdropFilter: "blur(20px)",
        borderRadius: 18, padding: 0, display: "flex", flexDirection: "column", flex: 1,
        boxShadow: "0 6px 28px rgba(42,74,66,0.13)", minHeight: 0, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 18px 0", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 20, marginBottom: 10 }}>🧠</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: "rgba(220,240,235,0.95)", lineHeight: 1.25, marginBottom: 8 }}>
            How can<br />I help?
          </div>
          <p style={{ fontSize: 12, color: "rgba(200,230,222,0.45)", lineHeight: 1.6, marginBottom: "auto" }}>
            Ask anything about a home, the process, or finances.
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

  /* ── Inline active chat ── */
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
  const [deck, setDeck] = useState(() => [...MOCK_PROPERTIES].reverse());
  const [liked, setLiked] = useState<PropertyCard[]>([]);
  const [surveyStep, setSurveyStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [tab, setTab] = useState<"explore" | "saved" | "journey">("explore");
  const canvasRef = useWaveCanvas(tab === "explore");
  const surveyDone = surveyStep >= SURVEY.length;

  const handleSwipe = (action: "like" | "dislike") => {
    setDeck(d => {
      const top = d[d.length - 1];
      if (action === "like" && top) setLiked(l => [...l, top]);
      return d.slice(0, -1);
    });
  };

  const handleAnswer = (opt: string) => {
    setSelected(opt);
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
            {(["explore", "saved", "journey"] as const).map((n) => (
              <span key={n} onClick={() => setTab(n)} style={{
                fontSize: 14, cursor: "pointer", textTransform: "capitalize",
                color: tab === n ? "#2a4a42" : "rgba(42,74,66,0.38)",
                fontWeight: tab === n ? 600 : 400,
                borderBottom: tab === n ? "1.5px solid #2a4a42" : "none", paddingBottom: 2,
              }}>{n}</span>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {liked.length > 0 && (
              <span style={{ fontSize: 12, color: "rgba(42,74,66,0.6)", background: "rgba(255,255,255,0.5)", borderRadius: 20, padding: "4px 12px", backdropFilter: "blur(8px)" }}>♥ {liked.length} saved</span>
            )}
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
                {deck.length === 0 ? (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.38)", backdropFilter: "blur(14px)", borderRadius: 20,
                  }}>
                    <div style={{ fontSize: 34, marginBottom: 12 }}>🌊</div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#2a4a42", marginBottom: 8 }}>All caught up</p>
                    <p style={{ fontSize: 14, color: "rgba(42,74,66,0.45)", marginBottom: 20 }}>You've reviewed all your matches.</p>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => { setDeck([...MOCK_PROPERTIES].reverse()); setLiked([]); }} style={{
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
                    return <SwipeCard key={listing.id} listing={listing} onSwipe={handleSwipe} isTop={stackIndex === 0} stackIndex={stackIndex} />;
                  })
                )}
              </div>
            </div>

            {/* Right — widgets */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
              {/* Survey */}
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

              {/* Inline Chat */}
              <InlineChat />
            </div>
          </div>
        )}

        {tab === "saved" && (
          <div style={{ flex: 1, padding: "20px 48px", overflowY: "auto" }}>
            {liked.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2a4a42" }}>No saved homes yet</p>
                <p style={{ fontSize: 14, color: "rgba(42,74,66,0.45)" }}>Swipe right on homes you like to save them here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {liked.map(p => (
                  <div key={p.id} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(14px)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(28,58,53,0.08)" }}>
                    <img src={p.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    <div style={{ padding: "12px 16px" }}>
                      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#2a4a42", marginBottom: 4 }}>{p.address}</h3>
                      <p style={{ fontSize: 12, color: "rgba(42,74,66,0.5)" }}>{p.city} · {p.beds}bd {p.baths}ba · {p.sqft.toLocaleString()} sqft</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#2a4a42" }}>{fmtPrice(p.price)}</span>
                        <button onClick={() => navigate("/analyze", { state: { prefill: { zip: p.zip, current_price: p.price, offer_price: p.price } } })} style={{
                          background: "rgba(42,74,66,0.1)", border: "none", borderRadius: 10, padding: "6px 14px",
                          fontSize: 12, color: "#2a4a42", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                        }}>Analyze →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "journey" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#2a4a42" }}>Your Journey</p>
            <p style={{ fontSize: 14, color: "rgba(42,74,66,0.5)", maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
              Run a deep analysis on any home to understand your confidence level, projected value, and risk.
            </p>
            <button onClick={() => navigate("/analyze")} style={{
              background: "rgba(42,74,66,0.8)", border: "none", borderRadius: 20, padding: "10px 28px",
              fontSize: 14, color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, marginTop: 8,
            }}>Analyze a Home →</button>
          </div>
        )}
      </div>

    </div>
  );
}
