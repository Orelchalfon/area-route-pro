import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';

// Snooze (not permanent) so an accidental ✕ doesn't hide the install hint forever.
const DISMISS_UNTIL_KEY = 'install-banner-dismissed-until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isSnoozed() {
  const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY));
  return Number.isFinite(until) && until > Date.now();
}

/**
 * Slim banner inviting the user to install the PWA. Shown to logged-in users on
 * installable contexts (Android/desktop Chromium) or iOS (manual A2HS via Safari).
 * Hidden once installed; dismissing snoozes it rather than hiding it permanently.
 */
export function InstallAppBanner() {
  const { installed, isIos, isIosSafari, canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(isSnoozed);

  // Nothing to offer: already installed, snoozed, or no install path available.
  if (installed || dismissed) return null;
  if (!canInstall && !isIos) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setDismissed(true);
  };

  return (
    <div
      dir='rtl'
      className='bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-sm'>
      <div className='flex items-center gap-2 max-w-3xl mx-auto'>
        <Download className='w-4 h-4 text-primary shrink-0' />
        {canInstall ? (
          <>
            <span className='flex-1 text-foreground'>
              התקן את האפליקציה לגישה מהירה מהמסך הראשי
            </span>
            <Button size='sm' className='h-8' onClick={() => void promptInstall()}>
              התקן
            </Button>
          </>
        ) : isIos && !isIosSafari ? (
          <span className='flex-1 text-foreground'>
            להתקנת האפליקציה, פתחו את האתר בדפדפן Safari
          </span>
        ) : (
          <span className='flex-1 text-foreground'>
            להתקנה: הקש על
            <Share className='inline w-3.5 h-3.5 mx-1' />
            ואז "הוסף למסך הבית"
          </span>
        )}
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
