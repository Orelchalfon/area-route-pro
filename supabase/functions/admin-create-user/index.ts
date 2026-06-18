// Admin-only user management.
// - The caller must be an authenticated user AND have the 'admin' role in
//   public.profiles. Employees cannot create or list users.
// - Actual user creation/listing uses the service-role key, which never leaves
//   the server. This is why it lives in an edge function and not the client.
//
// Body: { action: "create", email, password, role?, technicianId? }
//   or:  { action: "list" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  // Verify the caller is a logged-in user (not just the anon key).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing authorization" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Only admins may manage users.
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") {
    return json({ error: "Forbidden: admin role required" }, 403);
  }

  let body: { action?: string; email?: string; password?: string; role?: string; technicianId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.action === "list") {
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) return json({ error: error.message }, 400);

    const { data: profiles } = await admin.from("profiles").select("id, role, technician_id, full_name");
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = data.users.map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: profile?.role ?? null,
        technician_id: profile?.technician_id ?? null,
        full_name: profile?.full_name ?? null,
      };
    });
    return json({ users });
  }

  if (body.action === "create") {
    const email = body.email?.trim();
    const password = body.password ?? "";
    if (!email || password.length < 6) {
      return json({ error: "Email required and password must be at least 6 characters" }, 400);
    }
    const role = body.role === "admin" ? "admin" : "employee";
    const technicianId = role === "employee" ? (body.technicianId?.trim() || null) : null;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no confirmation email; user can log in immediately
    });
    if (error) return json({ error: error.message }, 400);

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      role,
      technician_id: technicianId,
    });
    if (profileError) {
      // Roll back the auth user so we never leave an account without a profile.
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: `Failed to create profile: ${profileError.message}` }, 400);
    }

    return json({ user: { id: data.user.id, email: data.user.email, role, technician_id: technicianId } }, 201);
  }

  return json({ error: "Unknown action" }, 400);
});
