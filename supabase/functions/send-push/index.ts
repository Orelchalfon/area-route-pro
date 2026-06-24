// Sends Web Push notifications. Called by the notify_push_on_change DB trigger
// (via pg_net), authenticated with a shared secret header (x-push-secret) since
// there is no end-user JWT in that context.
//
// Body: { target: { technician_id: string } | { role: "admin" }, title, body, url? }
// Resolves target -> profiles -> push_subscriptions (service role), then signs and
// sends each with VAPID. Prunes subscriptions that return 404/410 (expired).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type PushSub = { id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SECRET = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (!SECRET || req.headers.get("x-push-secret") !== SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@talhermon.app";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "Server not configured (VAPID / service role missing)" }, 500);
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let payload: {
    target?: { technician_id?: string; role?: string };
    title?: string;
    body?: string;
    url?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { target, title, body, url } = payload;

  // Resolve target -> user ids.
  let userIds: string[] = [];
  if (target?.technician_id) {
    const { data } = await admin.from("profiles").select("id").eq("technician_id", target.technician_id);
    userIds = (data ?? []).map((p) => p.id as string);
  } else if (target?.role) {
    const { data } = await admin.from("profiles").select("id").eq("role", target.role);
    userIds = (data ?? []).map((p) => p.id as string);
  }
  if (userIds.length === 0) return json({ sent: 0, reason: "no recipients" });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const message = JSON.stringify({ title: title ?? "טל חרמון", body: body ?? "", url: url ?? "/" });

  let sent = 0;
  await Promise.all(
    ((subs ?? []) as PushSub[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[send-push] send error:", code, (err as Error).message);
        }
      }
    }),
  );

  return json({ sent, recipients: userIds.length });
});
