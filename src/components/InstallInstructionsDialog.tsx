import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InstallPlatform } from '@/hooks/useInstallPrompt';
import { Share } from 'lucide-react';
import type { ReactNode } from 'react';

function stepsFor(platform: InstallPlatform): ReactNode[] {
  switch (platform) {
    // iOS has no install API — Add to Home Screen is manual, from Safari's share sheet.
    // Safari's newer compact bottom bar hides the share icon inside the ••• menu, so the
    // wording has to cover both toolbar layouts.
    case 'ios-safari':
      return [
        <>
          הקש על <span className='font-semibold'>•••</span> או על סמל השיתוף{' '}
          <Share className='inline w-3.5 h-3.5 mx-0.5 align-[-0.15em]' /> בסרגל התחתון
        </>,
        <>
          גלול ברשימה ובחר <span className='font-semibold'>"הוסף למסך הבית"</span>
        </>,
        <>
          הקש <span className='font-semibold'>"הוסף"</span> בפינה העליונה
        </>,
        <>פתח את האפליקציה מהאייקון החדש במסך הבית</>,
      ];
    case 'ios-other':
      return [
        <>
          העתק את כתובת האתר ופתח אותה בדפדפן{' '}
          <span className='font-semibold'>Safari</span>
        </>,
        <>
          ב‑Safari: הקש על <span className='font-semibold'>•••</span> או על סמל השיתוף{' '}
          <Share className='inline w-3.5 h-3.5 mx-0.5 align-[-0.15em]' />
        </>,
        <>
          בחר <span className='font-semibold'>"הוסף למסך הבית"</span> והקש{' '}
          <span className='font-semibold'>"הוסף"</span>
        </>,
      ];
    // Chrome/Edge on Android (and desktop) when we have no captured install event —
    // the browser menu still offers it.
    case 'chromium':
      return [
        <>
          הקש על <span className='font-semibold'>⋮</span> בפינת הדפדפן
        </>,
        <>
          בחר <span className='font-semibold'>"התקנה"</span> (או{' '}
          <span className='font-semibold'>"הוספה למסך הבית"</span>)
        </>,
        <>
          אשר בהקשה על <span className='font-semibold'>"התקנה"</span>
        </>,
        <>פתח את האפליקציה מהאייקון החדש במסך הבית</>,
      ];
  }
}

/**
 * Step-by-step "add to home screen" instructions, for platforms where we can't trigger
 * the install programmatically (all of iOS, and Chromium when the `beforeinstallprompt`
 * event isn't available to us).
 */
export function InstallInstructionsDialog({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
}) {
  const steps = stepsFor(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir='rtl' className='max-w-sm'>
        <DialogHeader className='text-start sm:text-start'>
          <DialogTitle className='text-start'>התקנת האפליקציה</DialogTitle>
          <DialogDescription className='text-start'>
            {platform === 'ios-other'
              ? 'הוספה למסך הבית אפשרית רק מדפדפן Safari.'
              : 'הוספת האפליקציה למסך הבית לגישה מהירה, בלי דפדפן.'}
          </DialogDescription>
        </DialogHeader>

        <ol className='space-y-3 text-sm text-foreground'>
          {steps.map((step, i) => (
            <li key={i} className='flex items-start gap-2.5'>
              <span className='shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center'>
                {i + 1}
              </span>
              <span className='text-start pt-0.5'>{step}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
