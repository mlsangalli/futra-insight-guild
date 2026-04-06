

# Implementacao Completa — Diagnostico FUTRA

## Resumo

Implementar todas as correcoes criticas identificadas no diagnostico, organizadas por prioridade: seguranca (P0), core loop de reputacao (P1), UX do MarketDetail (P2) e padronizacao PT-BR (P2).

---

## 1. Seguranca P0 — Remover predictions do Realtime

**Problema:** A tabela `predictions` esta no `supabase_realtime`, expondo apostas privadas de outros usuarios.

**Migration SQL:**
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.predictions;
```

---

## 2. Seguranca P0 — Fluxo de Reset de Senha

**Problema:** Nao existe pagina de recuperacao de senha.

**Arquivos novos:**
- `src/pages/ForgotPassword.tsx` — formulario com email, chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- `src/pages/ResetPassword.tsx` — detecta `type=recovery` no hash da URL, mostra formulario de nova senha, chama `supabase.auth.updateUser({ password })`

**Modificacoes:**
- `src/App.tsx` — adicionar rotas `/forgot-password` e `/reset-password`
- `src/pages/Login.tsx` — adicionar link "Esqueceu a senha?" apontando para `/forgot-password`

---

## 3. Core Loop P1 — Reputacao na Resolucao

**Problema:** `futra_score`, `global_rank`, `influence_level` e `streak` nunca sao atualizados.

**Modificacao em `supabase/functions/admin-actions/index.ts` (case `resolve_market`):**

Apos atualizar `resolved_predictions` e `accuracy_rate` de cada participante, adicionar:

- **futra_score:** `resolved_predictions * accuracy_rate` (formula simples, pode ser ajustada)
- **streak:** Para vencedores, buscar as ultimas N predictions resolvidas do usuario; se todas forem `won`, incrementar streak. Para perdedores, resetar streak para 0.
- **influence_level:** Baseado no futra_score:
  - `< 500` → `low`
  - `500-2000` → `medium`
  - `2000-5000` → `high`
  - `>= 5000` → `elite`
- **global_rank:** Apos processar todos os participantes do mercado, executar query para recalcular ranks:
  ```sql
  UPDATE profiles SET global_rank = sub.rank
  FROM (SELECT user_id, ROW_NUMBER() OVER (ORDER BY futra_score DESC) as rank FROM profiles) sub
  WHERE profiles.user_id = sub.user_id;
  ```

Tudo isso adicionado dentro do loop de winners/losers existente, usando o `adminClient`.

---

## 4. UX P2 — MarketDetail estados condicionais

**Problema:** O painel de apostas aparece mesmo quando o mercado esta `resolved`, `closed` ou travado (`lock_date` ultrapassado).

**Modificacao em `src/pages/MarketDetail.tsx`:**

- Adicionar `lock_date` e `resolved_option` ao tipo `DbMarket` em `useMarkets.ts`
- Calcular `isLocked = market.lock_date && new Date(market.lock_date) <= new Date()`
- Condicionar o painel lateral:
  - **resolved:** Mostrar resultado (opcao vencedora destacada com icone de check), esconder formulario de aposta
  - **closed / locked:** Mostrar mensagem "Mercado fechado para novas apostas", esconder formulario
  - **open (nao travado):** Manter formulario atual
- Mostrar badge de status no topo ("Resolvido", "Fechado", "Travado")

---

## 5. UX P2 — Padronizacao PT-BR

**Problema:** Interface mistura portugues e ingles.

**Arquivos afetados:**
- `src/pages/Login.tsx` — "Welcome back" → "Bem-vindo de volta", "Log in" → "Entrar", "Don't have an account?" → "Nao tem conta?", "Sign in with Google" → "Entrar com Google"
- `src/pages/Signup.tsx` — "Create your account" → "Crie sua conta", "Sign up" → "Cadastrar", "Already have an account?" → "Ja tem conta?", "Sign up with Google" → "Cadastrar com Google"
- `src/pages/MarketDetail.tsx` — "Make your pick" → "Faca sua previsao", "Current distribution" → "Distribuicao atual", "Resolution rules" → "Regras de resolucao", "Confirm prediction" → "Confirmar previsao", "participants" → "participantes", "credits" → "creditos", "days left" → "dias restantes", etc.
- `src/pages/Dashboard.tsx` — "Dashboard" → "Painel", "Welcome back" → "Bem-vindo de volta", "Open" → "Abertas", "Resolved" → "Resolvidas", "Won" → "Ganhou", "Lost" → "Perdeu", "risked" → "apostados"

---

## 6. Seguranca P1 — Restringir INSERT de markets

**Problema:** Qualquer usuario autenticado pode criar mercados com `featured: true` ou `total_credits` manipulado. O trigger `protect_market_fields` so protege UPDATE.

**Migration SQL — Criar trigger de INSERT para markets:**
```sql
CREATE OR REPLACE FUNCTION public.sanitize_market_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.featured := false;
    NEW.trending := false;
    NEW.total_credits := 0;
    NEW.total_participants := 0;
    NEW.status := 'open';
    NEW.resolved_option := NULL;
  END IF;
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_market_insert
BEFORE INSERT ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.sanitize_market_insert();
```

---

## Arquivos Modificados (resumo)

| Arquivo | Acao |
|---|---|
| `src/pages/ForgotPassword.tsx` | Criar |
| `src/pages/ResetPassword.tsx` | Criar |
| `src/App.tsx` | Adicionar 2 rotas |
| `src/pages/Login.tsx` | Link "Esqueceu a senha?" + PT-BR |
| `src/pages/Signup.tsx` | PT-BR |
| `src/pages/MarketDetail.tsx` | Estados condicionais + PT-BR |
| `src/pages/Dashboard.tsx` | PT-BR |
| `src/hooks/useMarkets.ts` | Adicionar lock_date e resolved_option ao DbMarket |
| `supabase/functions/admin-actions/index.ts` | Reputacao (score, rank, streak, influence) |
| Migration | DROP predictions do realtime + trigger sanitize_market_insert |

