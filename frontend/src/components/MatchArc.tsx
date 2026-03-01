export function MatchArc({ pct }: { pct: number }) {
  const r = 16, stroke = 3, circ = 2 * Math.PI * r;
  const color = pct >= 88 ? "#FFE4B5" : pct >= 78 ? "#FFD4A3" : "#FFBF80";
  return (
    <svg width={38} height={38} viewBox="0 0 38 38">
      <circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "19px 19px" }} />
      <text x={19} y={23} textAnchor="middle" fill="white" fontSize={9} fontWeight={700} fontFamily="'Jost',sans-serif">{pct}%</text>
    </svg>
  );
}
