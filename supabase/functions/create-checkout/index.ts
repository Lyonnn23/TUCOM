// Placeholder checkout function. La pasarela chilena (Flow / Khipu / Webpay /
// MercadoPago) se integrará en un paso posterior. Por ahora devuelve un
// mensaje informativo y, en entorno de desarrollo, permite que un admin
// active manualmente el plan Pro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) ?? "";

    // Pasarela aún no integrada. Devolvemos info para que el cliente muestre
    // un toast. Cuando integremos Flow/Khipu/Webpay/Mercado Pago, esta
    // función creará la preferencia y devolverá { checkout_url }.
    return new Response(
      JSON.stringify({
        checkout_url: null,
        provider: "pending",
        message:
          "El sistema de pagos está en preparación. Pronto podrás activar TÜcom Pro desde aquí. Escríbenos a hola@tucom.cl si quieres acceso anticipado.",
        user_id: userId,
        user_email: userEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
