import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { analyzeHome } from "../api";
import type { AnalyzeRequest, QuizAnswers, SwipeProfile } from "../types";

export default function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    swipeProfile?: SwipeProfile;
    quizAnswers?: QuizAnswers;
  } | null;
  const quizAnswers = state?.quizAnswers;

  const [form, setForm] = useState({
    zip: "",
    current_price: "",
    offer_price: "",
    down_payment_pct: "20",
    income: "",
    horizon_years: String(quizAnswers?.timeline_years ?? 5),
  });

  const mutation = useMutation({
    mutationFn: (req: AnalyzeRequest) => analyzeHome(req),
    onSuccess: (data) => {
      navigate("/report", {
        state: {
          result: data,
          form: {
            ...form,
            risk_tolerance: quizAnswers?.risk_tolerance ?? 0.5,
          },
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

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { prefix?: string; suffix?: string; type?: string; placeholder?: string }
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-secondary text-sm">{label}</span>
      <div className="flex items-center bg-base-2 rounded-xl border border-base-2 focus-within:border-tertiary/50 transition">
        {opts?.prefix && (
          <span className="pl-4 text-secondary/60 text-sm">{opts.prefix}</span>
        )}
        <input
          type={opts?.type ?? "text"}
          inputMode="numeric"
          placeholder={opts?.placeholder}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full bg-transparent px-4 py-3 text-primary outline-none placeholder:text-secondary/30"
          required
        />
        {opts?.suffix && (
          <span className="pr-4 text-secondary/60 text-sm">{opts.suffix}</span>
        )}
      </div>
    </label>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-8 pb-12">
      <h1 className="text-3xl font-bold text-primary mb-1">Analyze a home</h1>
      <p className="text-secondary text-sm mb-8">
        Enter the details and we'll run 1,000 market simulations
      </p>

      <form onSubmit={submit} className="w-full max-w-md flex flex-col gap-4">
        {field("ZIP Code", "zip", { placeholder: "e.g. 92602" })}

        <div className="grid grid-cols-2 gap-4">
          {field("Current Market Value", "current_price", {
            prefix: "$",
            placeholder: "750000",
          })}
          {field("Your Offer Price", "offer_price", {
            prefix: "$",
            placeholder: "770000",
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field("Down Payment", "down_payment_pct", {
            suffix: "%",
            placeholder: "20",
          })}
          {field("Annual Income", "income", {
            prefix: "$",
            placeholder: "120000",
          })}
        </div>

        {field("Investment Horizon", "horizon_years", {
          suffix: "years",
          placeholder: "5",
        })}

        {mutation.isError && (
          <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2">
            {(mutation.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-4 w-full py-3.5 rounded-xl bg-tertiary text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 transition"
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Running simulations...
            </>
          ) : (
            <>
              <Search size={18} /> Analyze
            </>
          )}
        </button>
      </form>
    </div>
  );
}
