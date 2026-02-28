import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import ProgressBar from "../components/ProgressBar";
import type { QuizAnswers, SwipeProfile } from "../types";

interface Question {
  id: string;
  text: string;
  options: { label: string; value: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: "risk_comfort",
    text: "How would you feel if your home's value dropped 10% next year?",
    options: [
      { label: "I'd lose sleep over it", value: 0.1 },
      { label: "Uncomfortable but I'd manage", value: 0.4 },
      { label: "Part of the game", value: 0.7 },
      { label: "Doesn't bother me at all", value: 1.0 },
    ],
  },
  {
    id: "timeline",
    text: "How long do you plan to stay in this home?",
    options: [
      { label: "2–3 years", value: 3 },
      { label: "4–6 years", value: 5 },
      { label: "7–10 years", value: 8 },
      { label: "10+ years", value: 12 },
    ],
  },
  {
    id: "priority_schools",
    text: "How important are school ratings to you?",
    options: [
      { label: "Not important", value: 0.1 },
      { label: "Nice to have", value: 0.4 },
      { label: "Important", value: 0.7 },
      { label: "Top priority", value: 1.0 },
    ],
  },
  {
    id: "priority_stability",
    text: "How much do you value neighborhood stability vs. growth potential?",
    options: [
      { label: "Give me high growth", value: 0.2 },
      { label: "Lean toward growth", value: 0.4 },
      { label: "Balanced", value: 0.6 },
      { label: "Stability first", value: 1.0 },
    ],
  },
  {
    id: "priority_space",
    text: "Would you sacrifice location for more space?",
    options: [
      { label: "Never — location is everything", value: 0.1 },
      { label: "Probably not", value: 0.3 },
      { label: "Maybe", value: 0.6 },
      { label: "Absolutely — I need space", value: 1.0 },
    ],
  },
  {
    id: "stretch_budget",
    text: "Would you stretch your budget for the perfect home?",
    options: [
      { label: "No, I stay within budget", value: 0.1 },
      { label: "A little stretch is okay", value: 0.4 },
      { label: "I'd stretch for the right one", value: 0.7 },
      { label: "Budget is a guideline", value: 1.0 },
    ],
  },
];

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const swipeProfile = (location.state as { swipeProfile?: SwipeProfile })?.swipeProfile;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const current = QUESTIONS[step];
  const selected = answers[current.id];

  function select(value: number) {
    setAnswers({ ...answers, [current.id]: value });
  }

  function next() {
    if (selected === undefined) return;
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const quiz: QuizAnswers = {
        risk_tolerance: answers.risk_comfort ?? 0.5,
        timeline_years: answers.timeline ?? 5,
        priority_weights: {
          schools: answers.priority_schools ?? 0.5,
          stability: answers.priority_stability ?? 0.5,
          growth: 1 - (answers.priority_stability ?? 0.5),
          space: answers.priority_space ?? 0.5,
        },
      };
      navigate("/analyze", { state: { swipeProfile, quizAnswers: quiz } });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-8 pb-12">
      <h1 className="text-3xl font-bold text-primary mb-1">Know yourself</h1>
      <p className="text-secondary text-sm mb-6">
        Quick questions to calibrate your risk profile
      </p>

      <ProgressBar
        step={step}
        total={QUESTIONS.length}
        labels={QUESTIONS.map((_, i) => `${i + 1}`)}
      />

      <div className="w-full max-w-md mt-4">
        <p className="text-primary text-lg font-medium mb-5">{current.text}</p>

        <div className="flex flex-col gap-3">
          {current.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => select(opt.value)}
              className={`w-full text-left px-5 py-3.5 rounded-xl border transition
                ${
                  selected === opt.value
                    ? "border-tertiary bg-tertiary/10 text-primary"
                    : "border-base-2 bg-base-2 text-secondary hover:border-secondary/40"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={next}
          disabled={selected === undefined}
          className="mt-8 w-full py-3.5 rounded-xl bg-tertiary text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          {step < QUESTIONS.length - 1 ? "Next" : "Continue"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
