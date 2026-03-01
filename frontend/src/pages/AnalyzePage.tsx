import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { analyzeHome } from "../api";
import type { AnalyzeRequest, QuizAnswers, SwipeProfile } from "../types";

const LEO_ORANGE = "#FF6201";

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

export default function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useWaveCanvas();

  const state = location.state as {
    swipeProfile?: SwipeProfile;
    quizAnswers?: QuizAnswers;
    prefill?: { zip?: string; current_price?: number; offer_price?: number };
  } | null;
  const quizAnswers = state?.quizAnswers;
  const prefill = state?.prefill;

  const [form, setForm] = useState({
    zip: prefill?.zip ?? "",
    current_price: prefill?.current_price ? String(prefill.current_price) : "",
    offer_price: prefill?.offer_price ? String(prefill.offer_price) : "",
    down_payment_pct: "20",
    income: "",
    horizon_years: String(quizAnswers?.timeline_years ?? 5),
  });

  const [focused, setFocused] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (req: AnalyzeRequest) => analyzeHome(req),
    onSuccess: (data) => {
      navigate("/report", {
        state: {
          result: data,
          form: { ...form, risk_tolerance: quizAnswers?.risk_tolerance ?? 0.5 },
          swipeProfile: state?.swipeProfile,
          quizAnswers,
        },
      });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      zip: form.zip,
      current_price: Number(form.current_price),
      offer_price: Number(form.offer_price),
      down_payment_pct: Number(form.down_payment_pct) / 100,
      income: Number(form.income),
      horizon_years: Number(form.horizon_years),
      risk_tolerance: quizAnswers?.risk_tolerance ?? 0.5,
    });
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const inputStyle = (_key: string): React.CSSProperties => ({
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "12px 16px",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#1a1a1a",
  });

  const fieldWrap = (key: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    border: focused === key ? "1.5px solid rgba(255,98,1,0.5)" : "1.5px solid rgba(255,98,1,0.2)",
    transition: "border 0.2s, box-shadow 0.2s",
    boxShadow: focused === key ? "0 0 0 3px rgba(255,98,1,0.12)" : "none",
    overflow: "hidden",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(0,0,0,0.5)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const prefixStyle: React.CSSProperties = {
    paddingLeft: 14,
    fontSize: 14,
    color: "rgba(0,0,0,0.4)",
    fontFamily: "'DM Sans', sans-serif",
    userSelect: "none",
  };

  const suffixStyle: React.CSSProperties = {
    paddingRight: 14,
    fontSize: 12,
    color: "rgba(0,0,0,0.4)",
    fontFamily: "'DM Sans', sans-serif",
    userSelect: "none",
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        ::placeholder { color: rgba(0,0,0,0.3); }`}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: LEO_ORANGE }} />
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 520, padding: "0 24px" }}>
        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: 28, marginBottom: 12,
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: 10, padding: "6px 16px",
            fontSize: 13, color: LEO_ORANGE, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, color: "white", marginBottom: 8, textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
            Analyze a home
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>
            Enter the details and we'll run 1,000 market simulations
          </p>
        </div>

        {/* Card */}
        <form onSubmit={submit} style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          borderRadius: 22,
          padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
          display: "flex", flexDirection: "column", gap: 20,
          marginBottom: 48,
        }}>
          {/* ZIP */}
          <div>
            <div style={labelStyle}>ZIP Code</div>
            <div style={fieldWrap("zip")}>
              <input
                placeholder="e.g. 92602"
                value={form.zip}
                onChange={set("zip")}
                onFocus={() => setFocused("zip")}
                onBlur={() => setFocused(null)}
                style={inputStyle("zip")}
                required
              />
            </div>
          </div>

          {/* Price row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={labelStyle}>Market Value</div>
              <div style={fieldWrap("current_price")}>
                <span style={prefixStyle}>$</span>
                <input
                  placeholder="750,000"
                  value={form.current_price}
                  onChange={set("current_price")}
                  onFocus={() => setFocused("current_price")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("current_price")}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Offer Price</div>
              <div style={fieldWrap("offer_price")}>
                <span style={prefixStyle}>$</span>
                <input
                  placeholder="770,000"
                  value={form.offer_price}
                  onChange={set("offer_price")}
                  onFocus={() => setFocused("offer_price")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("offer_price")}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
          </div>

          {/* Down payment + income */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={labelStyle}>Down Payment</div>
              <div style={fieldWrap("down_payment_pct")}>
                <input
                  placeholder="20"
                  value={form.down_payment_pct}
                  onChange={set("down_payment_pct")}
                  onFocus={() => setFocused("down_payment_pct")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("down_payment_pct")}
                  inputMode="numeric"
                  required
                />
                <span style={suffixStyle}>%</span>
              </div>
            </div>
            <div>
              <div style={labelStyle}>Annual Income</div>
              <div style={fieldWrap("income")}>
                <span style={prefixStyle}>$</span>
                <input
                  placeholder="120,000"
                  value={form.income}
                  onChange={set("income")}
                  onFocus={() => setFocused("income")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("income")}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
          </div>

          {/* Horizon */}
          <div>
            <div style={labelStyle}>Investment Horizon</div>
            <div style={fieldWrap("horizon_years")}>
              <input
                placeholder="5"
                value={form.horizon_years}
                onChange={set("horizon_years")}
                onFocus={() => setFocused("horizon_years")}
                onBlur={() => setFocused(null)}
                style={inputStyle("horizon_years")}
                inputMode="numeric"
                required
              />
              <span style={suffixStyle}>years</span>
            </div>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div style={{
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 12, padding: "10px 16px",
              fontSize: 13, color: "#b91c1c", lineHeight: 1.5,
            }}>
              {(mutation.error as Error).message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: mutation.isPending ? "rgba(255,98,1,0.5)" : LEO_ORANGE,
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: mutation.isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: "0 4px 16px rgba(255,98,1,0.25)",
            }}
          >
            {mutation.isPending ? (
              <>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Running simulations...
              </>
            ) : (
              <>Analyze</>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}
