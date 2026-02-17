import { ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ServiceTrackBadgeProps {
  track: ServiceTrack;
  className?: string;
}

export function ServiceTrackBadge({ track, className }: ServiceTrackBadgeProps) {
  const config = SERVICE_TRACK_CONFIG[track];
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-semibold border px-2 py-0.5',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
