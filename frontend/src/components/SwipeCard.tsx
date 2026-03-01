import { useRef, useState, useCallback } from "react";
import type { PropertyCard } from "../types";
import { fmtPrice, matchScore, tags } from "../data/dashboardData";
import { MatchArc } from "../pages/DashboardPage";

/* ── SwipeCard ── */
export interface SwipeCardProps { listing: PropertyCard; onSwipe: (action: "like" | "dislike") => void; isTop: boolean; stackIndex: number; appreciationPct?: number | null; }

export default function SwipeCard({ listing, onSwipe, isTop, stackIndex, appreciationPct }: SwipeCardProps) {
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
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 500, color: "white", lineHeight: 1.2 }}>
                  {listing.street_address}
                </h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 3 }}>
                  {listing.city} · {listing.beds}bd {listing.baths}ba · {(listing.sqft ?? 0).toLocaleString()}
                </p>
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500, color: "white", whiteSpace: "nowrap", paddingLeft: 10 }}>
                {fmtPrice(listing.price ?? 0)}
              </span>
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
            {appreciationPct != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: appreciationPct >= 0 ? "#6db8a0" : "#c47a6a" }}>
                  {appreciationPct >= 0 ? "▲" : "▼"} {Math.abs(appreciationPct * 100).toFixed(1)}%
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.42)" }}>predicted 12-mo value change</span>
              </div>
            )}
          </div>
        </div>

        {isTop && (
          <div style={{ display: "flex", justifyContent: "center", gap: 22, padding: "9px 0", background: "rgb(240,248,244)", flexShrink: 0 }}>
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