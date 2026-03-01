interface Props {
  score: number; // 0–1
  label?: string;
}

export default function ConfidenceGauge({ score, label = "Confidence" }: Props) {
  const pct = Math.round(score * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);

  const color = pct >= 70 ? "#6db8a0" : pct >= 45 ? "#c4a882" : "#c47a6a";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={90} cy={90} r={radius} fill="none" stroke="rgba(42,74,66,0.1)" strokeWidth={12} />
        <circle
          cx={90} cy={90} r={radius} fill="none"
          stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x={90} y={80} textAnchor="middle" fill="#2a4a42"
          style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
          {pct}%
        </text>
        <text x={90} y={108} textAnchor="middle" fill="rgba(42,74,66,0.45)"
          style={{ fontSize: "0.8rem", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", letterSpacing: 1.2, textTransform: "uppercase" }}>
          {label}
        </text>
      </svg>
    </div>
  );
}
