

# Fix: Search — Use Portuguese Text Search Config

## Problem

The `update_market_search_vector` trigger uses `to_tsvector('english', ...)` but all content is in Portuguese. This means stemming and stop-word removal are wrong — searching "eleição" won't match "eleições", and Portuguese stop words like "de", "o", "da" pollute the index.

Additionally, the client-side code manually joins terms with `&` then passes `type: 'plain'` — but `plainto_tsquery` ignores explicit operators, so the `&` is treated as literal text and breaks matching.

## Fix

### Step 1 — Migration: Switch to Portuguese config + rebuild vectors

```sql
-- Update the trigger function to use 'portuguese'
CREATE OR REPLACE FUNCTION public.update_market_search_vector()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.question, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category::text, ''));
  RETURN NEW;
END;
$$;

-- Rebuild all existing vectors
UPDATE markets SET search_vector = to_tsvector('portuguese',
  coalesce(question, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(category::text, ''));
```

### Step 2 — Fix `useSearch.ts`

- Remove the manual `.split(/\s+/).join(' & ')` — let `plainto_tsquery` handle tokenization naturally.
- Pass `config: 'portuguese'` in the textSearch options so the query parser matches the index language.

```typescript
.textSearch('search_vector', query.trim(), {
  type: 'plain',
  config: 'portuguese',
})
```

### Impact

- Full-text search will correctly stem Portuguese words (eleição/eleições, vence/vencer, etc.)
- Multi-word queries will work as implicit AND via `plainto_tsquery`
- Fallback to `ilike` still works as a safety net for edge cases

