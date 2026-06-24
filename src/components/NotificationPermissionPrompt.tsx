import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

const DISMISS_KEY = 'notif-prompt-dismissed';

/**
 * Pre-prompt that asks the user to enable push notifications. We show our own
 * banner first (explaining why) and only fire the native permission prompt on a
 * button tap — better acceptance than calling requestPermission() cold.
 */
export function NotificationPermissionPrompt() {
  const { supported, permission, requestAndSubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  // Only when notifications are supported and the user hasn't decided yet.
  if (!supported || permission !== 'default' || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      dir='rtl'
      className='bg-secondary/10 border-b border-secondary/20 px-4 py-2.5 text-sm'>
      <div className='flex items-center gap-2 max-w-3xl mx-auto'>
        <Bell className='w-4 h-4 text-secondary shrink-0' />
        <span className='flex-1 text-foreground'>
          הפעל התראות כדי לקבל עדכון על משימות חדשות ודיווחי טכנאים
        </span>
        <Button
          size='sm'
          className='h-8'
          onClick={() => void requestAndSubscribe()}>
          הפעל
        </Button>
        <button
          onClick={dismiss}
          aria-label='סגור'
          className='text-muted-foreground hover:text-foreground p-1 shrink-0'>
          <X className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}
