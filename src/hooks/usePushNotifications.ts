import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

// `push_subscriptions` is added by migration 20260622130000. Until the generated
// Database types are regenerated against that schema, access the table through an
// untyped client view. (Regenerating types later keeps this working unchanged.)
const db = supabase as SupabaseClient;

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// VAPID public key is base64url; the Push API wants a Uint8Array.
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Web Push permission + subscription for the current user.
 * - `requestAndSubscribe()` asks for permission (user-gesture) then stores the
 *   subscription in `push_subscriptions`.
 * - On mount, if permission is already granted, it silently re-ensures the
 *   subscription (covers new devices / rotated endpoints).
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );

  const storeSubscription = useCallback(async () => {
    if (!supported || !user || !VAPID_PUBLIC_KEY) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    await db.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' },
    );
  }, [user]);

  const requestAndSubscribe = useCallback(async () => {
    if (!supported || !user) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') await storeSubscription();
  }, [user, storeSubscription]);

  // Re-ensure the subscription for users who already granted permission.
  useEffect(() => {
    if (supported && user && Notification.permission === 'granted') {
      void storeSubscription();
    }
  }, [user, storeSubscription]);

  return { supported, permission, requestAndSubscribe };
}
