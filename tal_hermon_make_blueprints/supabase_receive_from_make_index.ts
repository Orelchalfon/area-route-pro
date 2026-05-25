import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizePhone = (value: unknown) =>
  normalizeText(value).replace(/[\s\-*]/g, "") || null;

const shouldSkipName = (name: string) => {
  const n = name.trim();
  const lower = n.toLowerCase();
  return !n || n === "שם" || ["null", "undefined"].includes(lower);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("MAKE_WEBHOOK_SECRET");
  const actualSecret = req.headers.get("x-make-secret");

  if (expectedSecret && actualSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json();

  if (!["installation", "malfunction"].includes(body.type) || body.action !== "upsert") {
    return Response.json({ error: "Invalid type/action" }, { status: 400, headers: corsHeaders });
  }

  const raw = body.data ?? {};
  const table = body.type === "installation" ? "installations" : "malfunctions";
  const sheetRowId = normalizeText(body.sheet_row_id);

  if (!sheetRowId) {
    return Response.json({ error: "sheet_row_id is required" }, { status: 400, headers: corsHeaders });
  }

  const customerName = normalizeText(raw.customer_name);
  if (shouldSkipName(customerName)) {
    return Response.json({ skipped: true, reason: "empty/header customer_name", sheet_row_id: sheetRowId }, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const baseRow = {
    sheet_row_id: sheetRowId,
    customer_name: customerName,
    phone: normalizePhone(raw.phone),
    address: normalizeText(raw.address) || null,
    city: normalizeText(raw.city) || null,
    notes: normalizeText(raw.notes) || null,
    status: normalizeText(raw.status) || (body.type === "installation" ? "pending" : "draft"),
    source: "sheets",
    updated_at: new Date().toISOString(),
  };

  const row = body.type === "installation"
    ? {
        ...baseRow,
        product_type: normalizeText(raw.product_type || raw.product) || null,
        region: normalizeText(raw.region) || normalizeText(body.sheet?.region) || null,
      }
    : {
        ...baseRow,
        priority: normalizeText(raw.priority) || "high",
        region: normalizeText(raw.region) || normalizeText(body.sheet?.region) || null,
      };

  const { data, error } = await supabase
    .from(table)
    .upsert(row, { onConflict: "sheet_row_id" })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message, table, sheet_row_id: sheetRowId }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ success: true, table, row: data }, { headers: corsHeaders });
});
