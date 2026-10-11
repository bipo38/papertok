/*
 * The steps' counter: a number inside a ring that fills toward its whole,
 * with a label and a line saying where the number comes from.
 */
export default function RingMeter({ value, total, label, sub, widestLabel = label, widestSub = sub }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const share = total ? Math.min(1, value / total) : 0;
  return (
    <div className="ob-meter-ring">
      <span className="ob-meter-ring-dial">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <circle cx="32" cy="32" r={r} className="ob-meter-ring-track" />
          <circle
            cx="32"
            cy="32"
            r={r}
            className="ob-meter-ring-fill"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
          />
        </svg>
        <span className="ob-meter-ring-n">{value}</span>
      </span>
      <span className="ob-meter-ring-copy">
        <span className="ob-meter-cell">
          <span className="onboarding-meter-l">{label}</span>
          <span className="onboarding-meter-l ob-meter-sizer" aria-hidden="true">{widestLabel}</span>
        </span>
        <span className="ob-meter-cell">
          <span className="ob-meter-sub">{sub}</span>
          <span className="ob-meter-sub ob-meter-sizer" aria-hidden="true">{widestSub}</span>
        </span>
      </span>
    </div>
  );
}
