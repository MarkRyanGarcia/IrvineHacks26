interface Props {
  step: number;
  total: number;
  labels?: string[];
}

export default function ProgressBar({ step, total, labels }: Props) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full max-w-md mx-auto mb-6">
      {labels && (
        <div className="flex justify-between text-xs text-secondary mb-1.5">
          {labels.map((l, i) => (
            <span key={i} className={i <= step ? "text-tertiary font-medium" : ""}>
              {l}
            </span>
          ))}
        </div>
      )}
      <div className="h-1.5 bg-base-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-tertiary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
