import clsx from "clsx";

interface Props {
  label: string;
  value: string | number;
  color?: "default" | "green" | "red" | "amber" | "blue";
  subtitle?: string;
  badge?: string;
}

const valueColors = {
  default: "text-white",
  green: "text-emerald-400",
  red: "text-red-400",
  amber: "text-amber-400",
  blue: "text-blue-400",
};

const glowColors = {
  default: "",
  green: "glow-green",
  red: "glow-red",
  amber: "",
  blue: "glow-blue",
};

export function MetricCard({ label, value, color = "default", subtitle, badge }: Props) {
  return (
    <div className={clsx("metric-card group", glowColors[color])}>
      {badge && (
        <div className="absolute top-3 right-3">
          <span className={clsx(
            color === "green" ? "badge-green" :
            color === "red" ? "badge-red" :
            color === "amber" ? "badge-amber" : "badge-blue"
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
