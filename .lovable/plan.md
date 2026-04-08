

# Consolidação do Fluxo de Resolução de Mercados

## Diagnóstico

Existem **dois caminhos de resolução completamente diferentes** que produzem resultados inconsistentes:

### Caminho 1: `close-and-resolve-markets` (automático/IA)
- Usa a RPC `resolve_market_and_score` (atômica, em PL/pgSQL)
- Calcula scores corretamente via `calculate_user_scores()`
- Gera notificações tipadas (`credits_won`, `credits_lost`)
- Faz refund quando ninguém acerta
- Rastreia missões (`win` missions)
- Verifica achievements
- Recalcula ranking global

### Caminho 2: `admin-actions` → `resolve_market` (manual)
- **NÃO usa a RPC** — reimplementa toda a lógica em TypeScript na Edge Function
- Calcula score com fórmula **diferente** (`resolved * accuracy` vs `accuracy * ln(resolved+1) * 100`)
- Calcula streak de forma diferente
- Gera notificações com tipo `result` (vs `credits_won`/`credits_lost`)
- **NÃO rastreia missões**
- **NÃO verifica achievements**
- **NÃO calcula `score_delta`**
- No refund, marca todos como `lost` ao invés de devolver créditos corretamente
- Faz UPDATE direto na profiles sem trigger de proteção

### Problemas concretos
1. **Score divergente**: fórmula JS ≠ fórmula PL/pgSQL
2. **Sem idempotência**: `admin-actions` não verifica se predictions já foram pagas
3. **Notificações inconsistentes**: tipos diferentes dependendo do caminho
4. **Missões/achievements ignorados** na resolução manual
5. **Refund quebrado**: admin-actions marca como `lost` ao invés de refundar

## Plano de Implementação

### 1. Unificar `admin-actions` → `resolve_market` para usar a RPC

Alterar o case `resolve_market` em `admin-actions/index.ts` (linhas 164-257) para:
- Validar market e winning_option
- Chamar `resolve_market_and_score` via RPC (mesma chamada do cron)
- Remover toda a lógica duplicada de distribuição de prêmios, score, notificações

O bloco passará de ~90 linhas para ~20 linhas.

### 2. Adicionar guarda de idempotência na RPC

Alterar `resolve_market_and_score` via migration para:
- Verificar `status != 'resolved'` (já existe)
- Adicionar check: se predictions já estão em status `won`/`lost`, abortar sem erro (idempotente)

### 3. Separar action types no admin-actions

Renomear internamente para clareza:
- `update_market_status` → só muda status (open↔closed), **nunca** para `resolved`
- `resolve_market` → único ponto de resolução via RPC

### 4. Melhorar logging no admin-actions

Após a RPC, inserir log com `action_type: "admin_resolve"` (vs `auto_resolve_ai` do cron) para distinguir origem.

### 5. Bloquear resolução via `update_market_status`

O case `update_market_status` aceita `status: "resolved"` — isso é um bypass perigoso que ignora toda a lógica de distribuição. Remover `"resolved"` dos status permitidos.

## Arquivos a modificar

```text
supabase/functions/admin-actions/index.ts  — refatorar resolve_market para usar RPC
supabase/migrations/                       — migration para tornar RPC idempotente
```

## Detalhes Técnicos

### admin-actions `resolve_market` (novo)
```typescript
case "resolve_market": {
  // Validação + chamada à RPC resolve_market_and_score
  // ~20 linhas ao invés de ~90
  // Mesma lógica atômica do cron
}
```

### Migration: RPC idempotente
```sql
-- No início da função, após verificar market exists:
IF EXISTS (SELECT 1 FROM predictions WHERE market_id = p_market_id AND status IN ('won','lost')) THEN
  RETURN jsonb_build_object('success', true, 'already_resolved', true);
END IF;
```

### update_market_status: bloquear "resolved"
```typescript
if (!status || !["open", "closed"].includes(status))
  return errResponse("Valid status required (open, closed)", 400);
```

## Resultado esperado

- **1 caminho canônico** para resolver mercados: a RPC `resolve_market_and_score`
- Tanto admin manual quanto cron/IA chamam a mesma RPC
- Score, streak, accuracy, rewards, notificações, missões e achievements sempre consistentes
- Idempotência garantida — chamar duas vezes não duplica pagamentos
- `update_market_status` não pode mais bypassar a resolução

