import { STATUS_CONFIG } from "@/types";

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const colorMap: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    secondary: "bg-secondary/15 text-secondary",
    success: "bg-success/15 text-success",
    accent: "bg-accent/15 text-accent-foreground",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[config?.color] || colorMap.muted}`}>
      {config?.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: "גבוהה", cls: "bg-destructive/15 text-destructive" },
    medium: { label: "בינונית", cls: "bg-warning/15 text-warning" },
    low: { label: "נמוכה", cls: "bg-info/15 text-info" },
  };
  const p = map[priority] || map.low;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${p.cls}`}>
      {p.label}
    </span>
  );
}
