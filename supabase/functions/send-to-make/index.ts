// Triggered by a database webhook (or called manually) whenever a row in
// `malfunctions` or `installations` changes.
// Forwards the change to Make.com so it updates the Google Sheet.
//
// Expected payload (Supabase DB Webhook format):
// { type: "INSERT" | "UPDATE" | "DELETE", table: "malfunctions"|"installations", record: {...}, old_record: {...} }
//
// We re-shape it for Make to keep the contract simple.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!MAKE_WEBHOOK_URL) throw new Error("MAKE_WEBHOOK_URL is not configured");

    const payload = await req.json();
    console.log("[send-to-make] incoming:", JSON.stringify(payload));

    const { type, table, record, old_record } = payload ?? {};
    const row = record ?? old_record ?? {};

    // Don't echo back changes that originated from the sheet.
    if (row?.source === "sheets" && type !== "DELETE") {
      console.log("[send-to-make] skipping - source=sheets (avoid loop)");
      return json({ skipped: true, reason: "source=sheets" });
    }

    const entity = table === "malfunctions" ? "malfunction" : "installation";
    const action = type === "DELETE" ? "delete" : "upsert";

    const outbound = {
      type: entity,
      action,
      sheet_row_id: row?.sheet_row_id ?? row?.id ?? null,
      db_id: row?.id ?? null,
      data: row,
    };

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outbound),
    });

    const text = await res.text();
    console.log("[send-to-make] make response:", res.status, text);

    if (!res.ok) {
      return json({ error: `Make returned ${res.status}`, body: text }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[send-to-make] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
