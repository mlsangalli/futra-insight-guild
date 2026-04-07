

# Fix: Align `calculate_user_scores` with Documented Formula

## Problem

The `calculate_user_scores` DB function computes `futra_score` as:

```sql
v_score := ROUND(v_resolved * v_accuracy);
-- e.g. 50 resolved × 80% accuracy = 4000
```

But the documented formula is:

```
accuracy_rate × log(resolved_predictions + 1) × 100
-- e.g. 0.80 × log(51) × 100 ≈ 136
```

The current formula is **linear** in resolved predictions, meaning users who spam predictions get disproportionately rewarded. The logarithmic formula rewards accuracy more heavily.

The influence level thresholds (500/2000/5000) were designed for the logarithmic scale — with the linear formula, any user with 50+ resolved predictions and decent accuracy would instantly hit "elite" status.

Everything else is correct: the profile page displays all fields from `profiles`, and `calculate_user_scores` is called correctly from `resolve_market_and_score`.

## Plan

### Step 1 — Migration: Fix the score formula

Update `calculate_user_scores` to use the logarithmic formula:

```sql
v_score := ROUND((v_accuracy / 100.0) * ln(v_resolved + 1) * 100);
```

Note: PostgreSQL uses `ln()` for natural log. Using `log()` would give log base 10 — either works but the thresholds should match. With `ln()`:
- 10 resolved, 80% accuracy → `0.8 × ln(11) × 100 ≈ 192`
- 50 resolved, 90% accuracy → `0.9 × ln(51) × 100 ≈ 353`
- 200 resolved, 85% accuracy → `0.85 × ln(201) × 100 ≈ 451`

This aligns with the documented influence thresholds where "elite" (5000) is genuinely hard to reach.

### Step 2 — No client-side changes needed

The profile page already reads `futra_score` directly from the DB. The `StatCard`, `InfluenceBadge`, and leaderboard components all use the stored values.

## Files Changed

- **1 migration file** — update `calculate_user_scores` function

## Impact

- Correct scoring formula applied on next market resolution
- No existing data affected (no users have predictions yet)
- Influence level thresholds will work as designed

