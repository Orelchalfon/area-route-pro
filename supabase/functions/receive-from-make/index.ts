// Receives webhook POSTs from Make.com when a row in Google Sheets changes.
// Make should POST a JSON payload like:
// {
//   "type": "malfunction" | "installation",
//   "action": "upsert" | "delete",
//   "sheet_row_id": "row-123",   // unique stable ID per Sheet row
//   "data": { customer_name, phone, city, address, region, status, priority, notes, description?, malfunction_date?, product_type?, installation_date?, installation_time? }
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("[receive-from-make] payload:", JSON.stringify(body));

    const { type, action = "upsert", sheet_row_id, data = {} } = body ?? {};

    if (!type || !["malfunction", "installation"].includes(type)) {
      return json({ error: "Invalid 'type'. Must be 'malfunction' or 'installation'." }, 400);
    }
    if (!sheet_row_id) {
      return json({ error: "Missing 'sheet_row_id'." }, 400);
    }

    const table = type === "malfunction" ? "malfunctions" : "installations";

    if (action === "delete") {
      const { error } = await supabase.from(table).delete().eq("sheet_row_id", String(sheet_row_id));
      if (error) throw error;
      return json({ ok: true, deleted: sheet_row_id });
    }

    // Upsert by sheet_row_id. Mark source='sheet' so the trigger doesn't echo back.
    const row = {
      ...data,
      sheet_row_id: String(sheet_row_id),
      source: "sheet",
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(table)
      .upsert(row, { onConflict: "sheet_row_id" })
      .select()
      .single();

    if (error) throw error;
    return json({ ok: true, row: result });
  } catch (err) {
    console.error("[receive-from-make] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
