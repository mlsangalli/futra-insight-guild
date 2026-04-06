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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, last_daily_bonus, streak, futra_credits")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check eligibility
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    if (profile.last_daily_bonus) {
      const lastBonus = new Date(profile.last_daily_bonus);
      if (lastBonus >= todayStart) {
        const tomorrow = new Date(todayStart);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        return new Response(JSON.stringify({ 
          eligible: false, 
          nextBonusAt: tomorrow.toISOString() 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Calculate streak
    let newStreak = 1;
    if (profile.last_daily_bonus) {
      const lastBonus = new Date(profile.last_daily_bonus);
      const yesterday = new Date(todayStart);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      if (lastBonus >= yesterday) {
        newStreak = (profile.streak || 0) + 1;
      }
    }

    // Bonus amount: 50 base + (streak * 5), cap 100
    const amount = Math.min(50 + (newStreak * 5), 100);

    // Update profile
    await supabase.from("profiles").update({
      futra_credits: profile.futra_credits + amount,
      last_daily_bonus: now.toISOString(),
      streak: newStreak,
    } as any).eq("user_id", user.id);

    // Insert credit transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount,
      type: "daily_bonus",
      description: `Daily bonus (${newStreak}-day streak)`,
    });

    // Streak milestone notifications
    if ([7, 30, 100].includes(newStreak)) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "streak_milestone",
        title: `${newStreak}-day streak! 🔥`,
        body: `You've claimed your daily bonus for ${newStreak} days in a row!`,
        data: { streak: newStreak },
      });
    }

    return new Response(JSON.stringify({ 
      eligible: true, 
      amount, 
      streak: newStreak,
      newBalance: profile.futra_credits + amount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
