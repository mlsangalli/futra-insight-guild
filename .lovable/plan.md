

# Fix: Daily Bonus Claim — Credits Never Applied

## Problem

The `protect_profile_fields` trigger silently reverts `futra_credits` and `streak` on **every** profile update, including service_role updates from the `claim-daily-bonus` edge function. Result: the bonus appears claimed (`last_daily_bonus` is set) but credits and streak are never actually applied.

This same bug affects **all server-side credit operations**: `resolve_market_and_score`, `apply-referral`, and the initial allocation — any edge function that updates `futra_credits` via a direct profile update.

The `place_prediction` and `resolve_market_and_score` DB functions work correctly because they use `UPDATE profiles SET futra_credits = futra_credits + X` directly in PL/pgSQL as SECURITY DEFINER, which runs as the function owner — but the trigger still fires. Let me re-check: actually the trigger fires for those too. This means `resolve_market_and_score` is also broken for credit distribution.

## Root Cause

```sql
-- protect_profile_fields() — runs on EVERY update unconditionally
NEW.futra_credits := OLD.futra_credits;  -- blocks ALL credit changes
NEW.streak := OLD.streak;                -- blocks ALL streak changes
-- ... plus futra_score, accuracy_rate, global_rank, etc.
```

The trigger was designed to prevent **users** from self-modifying these fields via RLS, but it blocks server-side operations too.

## Fix

**Step 1 — Update `protect_profile_fields` trigger function** (migration)

Only protect fields when the caller is a regular authenticated user (not service_role or a SECURITY DEFINER function):

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service-role and DB function callers to modify all fields
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claim.role', true) IS NULL THEN
    RETURN NEW;
  END IF;

  -- For regular users: preserve server-managed fields
  NEW.futra_credits := OLD.futra_credits;
  NEW.futra_score := OLD.futra_score;
  NEW.accuracy_rate := OLD.accuracy_rate;
  NEW.global_rank := OLD.global_rank;
  NEW.influence_level := OLD.influence_level;
  NEW.total_predictions := OLD.total_predictions;
  NEW.resolved_predictions := OLD.resolved_predictions;
  NEW.streak := OLD.streak;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;
```

**Step 2 — Fix the edge function's `as any` cast**

Remove the `as any` type assertion in the edge function update call (line 72). This was hiding the fact that the update was being silently ignored.

**Step 3 — Repair existing data**

Run a one-time query to credit the admin user the 55 FC that was lost:

```sql
UPDATE profiles SET futra_credits = 1055, streak = 1 WHERE user_id = 'cd400de6-50a9-46c9-81fa-131c8b697195';
```

(This will also be blocked by the current trigger, so it must run after the migration.)

## Impact

This single migration fixes credit application for:
- Daily bonus claims
- Market resolution rewards (`resolve_market_and_score`)  
- Referral bonuses (`apply-referral`)
- Rank recalculation (`recalculate_global_ranks`)
- Score calculation (`calculate_user_scores`)

No client-side code changes needed beyond removing the `as any`.

