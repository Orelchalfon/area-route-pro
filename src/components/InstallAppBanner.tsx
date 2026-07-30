import { InstallInstructionsDialog } from '@/components/InstallInstructionsDialog';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

// Snooze (not permanent) so an accidental ✕ doesn't hide the install hint forever.
const DISMISS_UNTIL_KEY = 'install-banner-dismissed-until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isSnoozed() {
  const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY));
  return Number.isFinite(until) && until > Date.now();
}

/**
 * Slim banner inviting the user to install the PWA. Shown to logged-in users wherever an
 * install path exists: the native prompt on Chromium, manual instructions on iOS or on
 * Chromium when no install event was captured. Hidden once installed; dismissing snoozes
 * it (and the drawer entry in AppLayout stays available regardless).
 */
export function InstallAppBanner() {
  const { installed, canInstall, canOfferInstall, platform, promptInstall } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(isSnoozed);
  const [showInstructions, setShowInstructions] = useState(false);

  // Nothing to offer: already installed, snoozed, or no install path on this browser.
  if (installed || dismissed || !canOfferInstall) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setDismissed(true);
  };

  return (
    <>
      <div
        dir='rtl'
        className='bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-sm'>
        <div className='flex items-center gap-2 max-w-3xl mx-auto'>
          <Download className='w-4 h-4 text-primary shrink-0' />
          <span className='flex-1 text-foreground text-start'>
            התקן את האפליקציה לגישה מהירה מהמסך הראשי
          </span>
          {/* Chromium with a captured event installs in one tap; everywhere else we open
              step-by-step instructions, since the install can't be triggered in code. */}
          {canInstall ? (
            <Button size='sm' className='h-8 shrink-0' onClick={() => void promptInstall()}>
              התקן
            </Button>
          ) : (
            <Button
              size='sm'
              variant='outline'
              className='h-8 shrink-0'
              onClick={() => setShowInstructions(true)}>
              איך מתקינים?
            </Button>
          )}
          <button
            onClick={dismiss}
            aria-label='סגור'
            className='text-muted-foreground hover:text-foreground p-1 shrink-0'>
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      <InstallInstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
        platform={platform}
      />
    </>
  );
}
