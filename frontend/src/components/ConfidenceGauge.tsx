interface Props {
  score: number; // 0–1
  label?: string;
}

export default function ConfidenceGauge({ score, label = "Confidence" }: Props) {
  const pct = Math.round(score * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);

  const color =
    pct >= 70 ? "#4ade80" : pct >= 45 ? "#facc15" : "#f87171";

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke="#2E2E45"
          strokeWidth={12}
        />
        <circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          className="transition-all duration-1000 ease-out"
        />
        <text
          x={90}
          y={82}
          textAnchor="middle"
          className="fill-primary text-4xl font-bold"
          style={{ fontSize: "2.2rem" }}
        >
          {pct}%
        </text>
        <text
          x={90}
          y={108}
          textAnchor="middle"
          className="fill-secondary text-sm"
          style={{ fontSize: "0.85rem" }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
