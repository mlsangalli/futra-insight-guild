import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { referral_code } = await req.json();
    if (!referral_code) {
      return new Response(JSON.stringify({ error: "Missing referral_code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id, referral_code")
      .eq("referral_code", referral_code)
      .single();

    if (!referrer || referrer.user_id === user.id) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already referred
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("user_id", user.id)
      .single();

    if (myProfile?.referred_by) {
      return new Response(JSON.stringify({ error: "Already used a referral" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check referral limit (50 max)
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", referrer.user_id);

    if ((count || 0) >= 50) {
      return new Response(JSON.stringify({ error: "Referrer has reached the maximum referrals" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Apply referral
    await supabase.from("profiles").update({ referred_by: referrer.user_id } as any).eq("user_id", user.id);

    // Give bonus to referred (100)
    await supabase.rpc("", {} as never).catch(() => {}); // noop
    await supabase.from("profiles").update({ futra_credits: (myProfile as any).futra_credits + 100 } as any).eq("user_id", user.id);
    await supabase.from("credit_transactions").insert({ user_id: user.id, amount: 100, type: "referral_bonus", description: "Referral bonus for signing up" });

    // Give bonus to referrer (200)
    const { data: referrerProfile } = await supabase.from("profiles").select("futra_credits").eq("user_id", referrer.user_id).single();
    await supabase.from("profiles").update({ futra_credits: (referrerProfile?.futra_credits || 0) + 200 } as any).eq("user_id", referrer.user_id);
    await supabase.from("credit_transactions").insert({ user_id: referrer.user_id, amount: 200, type: "referral_bonus", description: "Referral bonus for inviting a friend" });

    // Notify referrer
    await supabase.from("notifications").insert({
      user_id: referrer.user_id,
      type: "system",
      title: "New referral! +200 credits",
      body: "Someone joined FUTRA using your referral link.",
      data: { referred_user_id: user.id },
    });

    return new Response(JSON.stringify({ success: true, bonus: 100 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
