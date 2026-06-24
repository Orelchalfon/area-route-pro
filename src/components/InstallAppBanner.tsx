import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';

const DISMISS_KEY = 'install-banner-dismissed';

/**
 * Slim banner inviting the user to install the PWA. Shown to logged-in users on
 * installable contexts (Android/desktop Chromium) or iOS Safari (manual A2HS).
 * Hidden once installed or dismissed.
 */
export function InstallAppBanner() {
  const { installed, isIos, canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  // Nothing to offer: already installed, dismissed, or no install path available.
  if (installed || dismissed) return null;
  if (!canInstall && !isIos) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
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
