import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  TrendingDown,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useEffect } from "react";
import ConfidenceGauge from "../components/ConfidenceGauge";
import ChatWidget from "../components/ChatWidget";
import { explainResults } from "../api";
import type { AnalyzeResponse } from "../types";

function money(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${Math.round(n).toLocaleString()}`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const FRAGILITY_COLOR: Record<string, string> = {
  Low: "text-green-400",
  Moderate: "text-yellow-400",
  High: "text-orange-400",
  "Very High": "text-red-400",
};

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
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
      return explainResults({
        ...result,
        offer_price: offerPrice,
        risk_tolerance: riskTolerance,
      });
    },
  });

  useEffect(() => {
    if (result && !explain.data && !explain.isPending) {
      explain.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-secondary">No analysis data found.</p>
        <button
          onClick={() => navigate("/analyze")}
          className="mt-4 text-tertiary underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-8 pb-16">
      <button
        onClick={() => navigate(-1)}
        className="self-start flex items-center gap-1 text-secondary hover:text-primary transition mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-3xl font-bold text-primary mb-6">Your Report</h1>

      {/* Confidence Gauge */}
      <ConfidenceGauge score={result.confidence_score} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
        <MetricCard
          icon={<TrendingDown size={18} className="text-red-400" />}
          label="Downside Risk"
          value={pct(result.prob_downside)}
        />
        <MetricCard
          icon={<Shield size={18} className="text-tertiary" />}
          label="Fragility"
          value={result.fragility_index}
          valueClass={FRAGILITY_COLOR[result.fragility_index]}
        />
        <MetricCard
          icon={<TrendingUp size={18} className="text-green-400" />}
          label="Upside (P90)"
          value={money(result.p90)}
        />
        <MetricCard
          icon={<TrendingDown size={18} className="text-yellow-400" />}
          label="Downside (P10)"
          value={money(result.p10)}
        />
      </div>

      {/* Projection Band */}
      <div className="w-full max-w-md mt-8 bg-base-2 rounded-2xl p-5">
        <h3 className="text-primary font-semibold mb-3">Projected Value Range</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-red-400">{money(result.p10)}</span>
          <span className="text-primary font-bold text-lg">{money(result.p50)}</span>
          <span className="text-green-400">{money(result.p90)}</span>
        </div>
        <div className="relative h-3 bg-base rounded-full mt-2 overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full"
            style={{ left: "10%", right: "10%" }}
          />
        </div>
        <div className="flex justify-between text-xs text-secondary/60 mt-1">
          <span>Pessimistic</span>
          <span>Median</span>
          <span>Optimistic</span>
        </div>
      </div>

      {/* Fair Value */}
      <div className="w-full max-w-md mt-4 bg-base-2 rounded-2xl p-5">
        <h3 className="text-primary font-semibold mb-2">Fair Value Band (ZIP Median)</h3>
        <p className="text-secondary text-sm">
          {money(result.fair_value_low)} — {money(result.fair_value_high)}
        </p>
        {offerPrice > 0 && (
          <p className="text-xs mt-1 text-secondary/70">
            Your offer: {money(offerPrice)}{" "}
            {offerPrice > result.fair_value_high ? (
              <span className="text-yellow-400">(above fair value range)</span>
            ) : offerPrice < result.fair_value_low ? (
              <span className="text-green-400">(below fair value range)</span>
            ) : (
              <span className="text-tertiary">(within range)</span>
            )}
          </p>
        )}
      </div>

      {/* LLM Explanation */}
      <div className="w-full max-w-md mt-6 bg-base-2 rounded-2xl p-5">
        <h3 className="text-primary font-semibold mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-tertiary" /> AI Insight
        </h3>
        {explain.isPending ? (
          <div className="flex items-center gap-2 text-secondary text-sm">
            <Loader2 size={16} className="animate-spin" /> Generating explanation...
          </div>
        ) : explain.isError ? (
          <p className="text-red-400 text-sm">
            Could not generate explanation. Check your OpenAI API key.
          </p>
        ) : explain.data ? (
          <div className="text-secondary text-sm leading-relaxed whitespace-pre-line">
            {explain.data.explanation}
          </div>
        ) : null}
      </div>

      {/* Start over */}
      <button
        onClick={() => navigate("/")}
        className="mt-8 px-6 py-3 rounded-xl border border-tertiary/40 text-tertiary hover:bg-tertiary/10 transition"
      >
        Start Over
      </button>

      <ChatWidget analysisContext={{ ...result, offer_price: offerPrice }} />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  valueClass = "text-primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-base-2 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-secondary text-xs">
        {icon} {label}
      </div>
      <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
