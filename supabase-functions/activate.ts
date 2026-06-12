import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { code, device_id } = await req.json();

  if (!code || !device_id) {
    return new Response(JSON.stringify({ error: "missing_params" }), {
      status: 400, headers: corsHeaders
    });
  }

  const { data: license, error } = await supabase
    .from("licenses")
    .select("status, device_id, session_token, is_activated")
    .eq("code", code)
    .single();

  if (error || !license) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 404, headers: corsHeaders
    });
  }

  if (license.status === "revoked") {
    return new Response(JSON.stringify({ error: "revoked" }), {
      status: 403, headers: corsHeaders
    });
  }

  // Mismo dispositivo — devuelve el token existente (reactivación/reinstalación)
  if (license.is_activated && license.device_id === device_id) {
    await supabase.from("licenses")
      .update({ last_opened: new Date().toISOString() })
      .eq("code", code);

    return new Response(JSON.stringify({
      session_token: license.session_token
    }), { headers: corsHeaders });
  }

  // Ya activado en OTRO dispositivo — rechazar
  if (license.is_activated && license.device_id !== device_id) {
    return new Response(JSON.stringify({ error: "device_mismatch" }), {
      status: 409, headers: corsHeaders
    });
  }

  // Primera activación
  const session_token = crypto.randomUUID();

  await supabase.from("licenses").update({
    device_id,
    session_token,
    is_activated: true,
    activated_at: new Date().toISOString(),
    last_opened: new Date().toISOString(),
  }).eq("code", code);

  return new Response(JSON.stringify({ session_token }), {
    headers: corsHeaders
  });
});
