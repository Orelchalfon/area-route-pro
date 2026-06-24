import { AlertTriangle, RefreshCw, Wifi } from "lucide-react";

function formatLastSyncedAt(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LiveSyncStatus({
  status,
  lastSyncedAt,
  error,
}: {
  status: "loading" | "live" | "syncing" | "error";
  lastSyncedAt?: string;
  error?: string;
}) {
  const time = formatLastSyncedAt(lastSyncedAt);

  if (status === "error") {
    return (
      <span
        className='flex items-center gap-1.5 text-destructive'
        title={error}>
        <AlertTriangle className='w-3.5 h-3.5' />
        שגיאת סנכרון
      </span>
    );
  }

  if (status === "loading" || status === "syncing") {
    return (
      <span className='flex items-center gap-1.5 text-muted-foreground'>
        <RefreshCw className='w-3.5 h-3.5 animate-spin' />
        מסנכרן...
      </span>
    );
  }

  return (
    <span className='flex items-center gap-1.5 text-success'>
      <Wifi className='w-3.5 h-3.5' />
      מחובר לעדכונים חיים{time ? ` · עודכן לאחרונה ${time}` : ""}
    </span>
  );
}
