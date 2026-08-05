import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder rows shown while the day's jobs are still loading.
 *
 * Without this, a technician on a cold launch sees "אין משימות מתוזמנות" — indistinguishable
 * from a genuinely empty day, and from a sync failure. Sized to match JobCard so the real
 * list doesn't shift the page when it arrives.
 */
export function JobListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className='space-y-3' aria-busy='true' aria-label='טוען משימות'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='bg-card rounded-lg shadow-card p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-5 w-16 rounded-full' />
          </div>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-4 w-48' />
          <Skeleton className='h-11 w-full rounded-md' />
        </div>
      ))}
    </div>
  );
}
