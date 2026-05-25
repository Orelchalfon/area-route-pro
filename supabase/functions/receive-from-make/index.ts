import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildReceiveFromMakeRow } from "../_shared/makePayload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-make-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  try {
    const body = await req.json();

    if (body?.action === "delete") {
      const type = body?.type;
      const sheetRowId = typeof body?.sheet_row_id === "string" ? body.sheet_row_id.trim() : "";
      if (!["installation", "malfunction"].includes(type) || !sheetRowId) {
        return Response.json({ error: "Invalid delete payload" }, { status: 400, headers: corsHeaders });
      }

      const table = type === "installation" ? "installations" : "malfunctions";
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error } = await supabase.from(table).delete().eq("sheet_row_id", sheetRowId);
      if (error) {
        return Response.json({ error: error.message, table, sheet_row_id: sheetRowId }, { status: 500, headers: corsHeaders });
      }

      return Response.json({ success: true, table, deleted: sheetRowId }, { headers: corsHeaders });
    }

    const result = buildReceiveFromMakeRow(body);
    if (!result.ok) {
      if (result.skipped) {
        return Response.json(
          { skipped: true, reason: result.error, sheet_row_id: result.sheetRowId },
          { headers: corsHeaders },
        );
      }

      return Response.json({ error: result.error }, { status: result.status, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from(result.table)
      .upsert(result.row, { onConflict: "sheet_row_id" })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: error.message, table: result.table, sheet_row_id: result.sheetRowId },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json({ success: true, table: result.table, row: data }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
