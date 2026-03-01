import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import ConfidenceGauge from "../components/ConfidenceGauge";
import { explainResults, sendChat } from "../api";
import type { AnalyzeResponse, ChatMessage } from "../types";

function money(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const LEO_ORANGE = "#FF6201";
const FRAG_COLOR: Record<string, string> = {
  Low: "#4ade80",
  Moderate: "#fbbf24",
  High: "#f97316",
  "Very High": "#dc2626",
};

function useWaveCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    const waves = [
      { amp: 32, freq: 0.007, speed: 0.001, y: 0.3, color: "rgba(255,98,1,0.18)" },
      { amp: 24, freq: 0.01, speed: 0.0007, y: 0.46, color: "rgba(255,140,50,0.14)" },
      { amp: 20, freq: 0.013, speed: 0.0012, y: 0.6, color: "rgba(255,180,100,0.12)" },
      { amp: 28, freq: 0.006, speed: 0.0005, y: 0.73, color: "rgba(255,120,30,0.16)" },
      { amp: 16, freq: 0.017, speed: 0.0015, y: 0.86, color: "rgba(255,98,1,0.10)" },
    ];
    let t = 0, raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      waves.forEach((w) => {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 2) ctx.lineTo(x, w.y * H + Math.sin(x * w.freq + t * w.speed * 60) * w.amp);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = w.color; ctx.fill();
      });
      t++; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return ref;
}

/* ── Inline Chat (report-scoped) ── */
function ReportChat({ context, userId }: { context: Record<string, unknown>; userId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Have questions about your report? Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const resp = await sendChat({ messages: updated.slice(-10), analysis_context: context, user_id: userId });
      setMessages(prev => [...prev, { role: "assistant", content: resp.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, context, userId]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
      borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxHeight: 360,
    }}>
      <div style={{
        padding: "12px 18px", borderBottom: "1px solid rgba(255,98,1,0.15)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: LEO_ORANGE, boxShadow: "0 0 6px rgba(255,98,1,0.5)" }} />
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>realease AI</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: 14,
              fontSize: 13, lineHeight: 1.55, fontFamily: "'DM Sans',sans-serif",
              ...(msg.role === "user"
                ? { background: "rgba(255,98,1,0.12)", color: "#1a1a1a", borderBottomRightRadius: 4 }
                : { background: "rgba(255,98,1,0.08)", color: "#1a1a1a", borderBottomLeftRadius: 4 }),
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,98,1,0.08)", fontSize: 13, color: "rgba(0,0,0,0.5)" }}>
              <span style={{ animation: "pulse 1.2s infinite" }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{
        padding: "10px 14px", borderTop: "1px solid rgba(255,98,1,0.15)",
        display: "flex", gap: 8, flexShrink: 0,
      }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your report..."
          style={{
            flex: 1, background: "rgba(255,98,1,0.06)", border: "1px solid rgba(255,98,1,0.2)",
            borderRadius: 10, padding: "9px 14px", fontSize: 13, outline: "none",
            fontFamily: "'DM Sans',sans-serif", color: "#1a1a1a",
          }}
        />
        <button type="submit" disabled={!input.trim() || loading} style={{
          width: 36, height: 36, borderRadius: 10, border: "none",
          background: input.trim() ? LEO_ORANGE : "rgba(255,98,1,0.2)",
          color: "white", cursor: input.trim() ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          transition: "background 0.2s",
        }}>→</button>
      </form>
    </div>
  );
}

/* ── MetricCard ── */
function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)",
      borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: color ?? "#1a1a1a", fontFamily: "'Playfair Display',serif" }}>{value}</span>
    </div>
  );
}

/* ── Main ReportPage ── */
export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useWaveCanvas();
  const { user } = useUser();

  const state = location.state as {
    result: AnalyzeResponse;
    form: { risk_tolerance: number; offer_price: string };
  } | null;

  const result = state?.result;
  const riskTolerance = state?.form?.risk_tolerance ?? 0.5;
  const offerPrice = Number(state?.form?.offer_price ?? 0);

  const explain = useMutation({
    mutationFn: () => {
      if (!result) throw new Error("No result");
      return explainResults({ ...result, offer_price: offerPrice, risk_tolerance: riskTolerance });
    },
  });

  useEffect(() => {
    if (result && !explain.data && !explain.isPending) explain.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)",
    borderRadius: 18, padding: "24px 22px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  };

  if (!result) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, background: LEO_ORANGE }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginBottom: 16 }}>No analysis data found.</p>
          <button onClick={() => navigate("/analyze")} style={{
            background: "rgba(255,255,255,0.9)", border: "none",
            borderRadius: 12, padding: "10px 24px", fontSize: 14, color: LEO_ORANGE,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          }}>Go to Analyze</button>
        </div>
      </div>
    );
  }

  const p50Pct = result.p10 !== result.p90
    ? ((result.p50 - result.p10) / (result.p90 - result.p10)) * 100
    : 50;

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#1a1a1a" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        @keyframes pulse { 0%,100% { opacity:0.3; } 50% { opacity:1; } }`}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: LEO_ORANGE }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          marginTop: 28, marginBottom: 8,
          background: "rgba(255,255,255,0.9)", border: "none",
          borderRadius: 10, padding: "6px 16px", fontSize: 13, color: LEO_ORANGE,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>← Back</button>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 500, color: "white", marginBottom: 4, textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>Your Report</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>Based on 1,000 Monte Carlo simulations</p>
        </div>

        {/* Gauge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ ...card, padding: "28px 40px", textAlign: "center" }}>
            <ConfidenceGauge score={result.confidence_score} />
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <MetricCard label="Downside Risk" value={pct(result.prob_downside)} color="#dc2626" />
          <MetricCard label="Fragility" value={result.fragility_index} color={FRAG_COLOR[result.fragility_index] ?? "#1a1a1a"} />
          <MetricCard label="Upside (P90)" value={money(result.p90)} color="#16a34a" />
          <MetricCard label="Downside (P10)" value={money(result.p10)} color="#ea580c" />
        </div>

        {/* Projection bar */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 500, marginBottom: 14, color: "#1a1a1a" }}>Projected Value Range</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "#dc2626", fontWeight: 600 }}>{money(result.p10)}</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{money(result.p50)}</span>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{money(result.p90)}</span>
          </div>
          <div style={{ position: "relative", height: 10, background: "rgba(255,98,1,0.15)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              position: "absolute", inset: 0, height: "100%", borderRadius: 6,
              background: "linear-gradient(to right, #dc2626, #ea580c, #16a34a)",
            }} />
            <div style={{
              position: "absolute", top: -2, width: 4, height: 14, borderRadius: 2,
              background: LEO_ORANGE, left: `${p50Pct}%`, transform: "translateX(-50%)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(0,0,0,0.4)", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
            <span>Pessimistic</span>
            <span>Median</span>
            <span>Optimistic</span>
          </div>
        </div>

        {/* Fair value */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 500, marginBottom: 8, color: "#1a1a1a" }}>Fair Value Band</h3>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.65)" }}>
            {money(result.fair_value_low)} — {money(result.fair_value_high)}
          </p>
          {offerPrice > 0 && (
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 6 }}>
              Your offer: {money(offerPrice)}{" "}
              {offerPrice > result.fair_value_high ? (
                <span style={{ color: "#ea580c", fontWeight: 600 }}>(above fair value)</span>
              ) : offerPrice < result.fair_value_low ? (
                <span style={{ color: "#16a34a", fontWeight: 600 }}>(below fair value)</span>
              ) : (
                <span style={{ color: "#16a34a", fontWeight: 600 }}>(within range)</span>
              )}
            </p>
          )}
        </div>

        {/* Chat */}
        <div style={{ marginBottom: 20 }}>
          <ReportChat context={{ ...result, offer_price: offerPrice } as unknown as Record<string, unknown>} userId={user?.id} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, paddingBottom: 48 }}>
          <button onClick={() => navigate("/analyze")} style={{
            background: "rgba(255,255,255,0.9)", border: "none",
            borderRadius: 12, padding: "10px 24px", fontSize: 13, color: LEO_ORANGE,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          }}>New Analysis</button>
          <button onClick={() => navigate("/dashboard")} style={{
            background: "white", border: "2px solid white",
            borderRadius: 12, padding: "10px 24px", fontSize: 13, color: LEO_ORANGE,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          }}>Back to Home</button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
