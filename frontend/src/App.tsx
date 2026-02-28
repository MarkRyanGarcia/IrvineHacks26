import { BrowserRouter, Routes, Route } from "react-router-dom";
import SwipePage from "./pages/SwipePage";
import QuizPage from "./pages/QuizPage";
import AnalyzePage from "./pages/AnalyzePage";
import ReportPage from "./pages/ReportPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/swipe" element={<SwipePage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-tertiary/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-primary mb-2">HomeConfidence</h1>
        <p className="text-secondary max-w-sm mx-auto leading-relaxed">
          AI-powered clarity for first-time home buyers. We turn uncertainty into confidence with real market simulation.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href="/swipe"
          className="w-full py-3.5 rounded-xl bg-tertiary text-base font-semibold text-center hover:brightness-110 transition"
        >
          Get Started
        </a>
        <a
          href="/analyze"
          className="w-full py-3.5 rounded-xl border border-tertiary/40 text-tertiary font-medium text-center hover:bg-tertiary/10 transition"
        >
          Skip to Analysis
        </a>
      </div>

      <div className="mt-16 grid grid-cols-3 gap-6 max-w-md text-center">
        <StepPreview step="1" title="Swipe" desc="Discover your style" />
        <StepPreview step="2" title="Quiz" desc="Know your risk profile" />
        <StepPreview step="3" title="Report" desc="Get confident" />
      </div>
    </div>
  );
}

function StepPreview({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div>
      <div className="w-10 h-10 mx-auto rounded-full bg-base-2 border border-tertiary/30 flex items-center justify-center text-tertiary font-bold text-sm mb-2">
        {step}
      </div>
      <p className="text-primary text-sm font-medium">{title}</p>
      <p className="text-secondary/70 text-xs">{desc}</p>
    </div>
  );
}
