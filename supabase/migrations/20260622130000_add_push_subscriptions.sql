-- Web Push subscriptions: one row per browser/device push endpoint, owned by a user.
-- Written by the client after the user grants notification permission; read by the
-- send-push edge function (service role) to deliver notifications.

CREATE TABLE public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user manages only their own subscriptions. (The edge function uses the
-- service-role key and bypasses RLS to read all subscriptions + prune dead ones.)
CREATE POLICY "push_subscriptions manage own" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins may read all (useful for debugging delivery).
CREATE POLICY "push_subscriptions admin read" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_admin());
