import clsx from "clsx";

interface Props {
  label: string;
  value: string | number;
  color?: "default" | "green" | "red" | "amber" | "active";
  subtitle?: string;
  badge?: string;
}

const valueColors = {
  default: "text-[var(--ivory)]",
  green: "text-[var(--signal-pass)]",
  red: "text-[var(--signal-fail)]",
  amber: "text-[var(--signal-warn)]",
  active: "text-[var(--signal-active-strong)]",
};

const glowColors = {
  default: "",
  green: "glow-green",
  red: "glow-red",
  amber: "",
  active: "glow-active",
};

export function MetricCard({ label, value, color = "default", subtitle, badge }: Props) {
  return (
    <div className={clsx("metric-card group", glowColors[color])}>
      {badge && (
        <div className="absolute top-3 right-3">
          <span className={clsx(
            color === "green" ? "badge-green" :
            color === "red" ? "badge-red" :
            color === "amber" ? "badge-amber" : "badge-active"
          )}>{badge}</span>
        </div>
      )}
      <div className={clsx("metric-value", valueColors[color])}>
        {value}
      </div>
      <div className="metric-label">{label}</div>
      {subtitle && <div className="metric-sub">{subtitle}</div>}
    </div>
  );
}
