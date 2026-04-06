

# Agendamento de Resolucao de Mercado

## Resumo

Adicionar uma coluna `lock_date` na tabela `markets` que define quando o mercado sera travado (sem mais apostas). O admin podera agendar essa data via um dialog no painel. Quando `lock_date` e atingido, o mercado muda automaticamente para `closed` e novas predicoes sao bloqueadas.

## Mudancas

### 1. Migration SQL

Adicionar coluna `lock_date` (timestamp with time zone, nullable) na tabela `markets`. Essa data representa quando o mercado trava — apos esse momento, nenhuma aposta pode ser feita.

```sql
ALTER TABLE public.markets ADD COLUMN lock_date timestamptz DEFAULT NULL;
```

### 2. Bloquear apostas apos lock_date

Atualizar a funcao `place_prediction` para verificar se `lock_date` ja passou:

```sql
-- Dentro de place_prediction, apos verificar status = 'open':
IF v_lock_date IS NOT NULL AND v_lock_date <= NOW() THEN
  RAISE EXCEPTION 'Market is locked for predictions';
END IF;
```

### 3. Edge Function — nova acao `schedule_lock`

Adicionar case `schedule_lock` no `admin-actions/index.ts`:
- Recebe `market_id` e `lock_date` (ISO string)
- Valida que a data e futura
- Atualiza `markets.lock_date` via adminClient

### 4. Frontend — Dialog de Agendamento

**Novo dialog `ScheduleLockDialog` em `AdminMarkets.tsx`:**
- Botao com icone `Clock` na coluna de acoes (visivel para mercados `open` sem lock ou para editar lock existente)
- Dialog com DatePicker (calendario) + seletor de horario
- Mostra data atual de lock se ja existir
- Botao para remover agendamento (seta lock_date para null)
- Mutation via `invokeAdmin({ action: 'schedule_lock', ... })`

**Indicacao visual na tabela:**
- Nova coluna "Travamento" mostrando a data/hora agendada ou "—"
- Badge amarelo "Travado" quando `lock_date` ja passou mas mercado ainda nao foi resolvido

### 5. Cron Job — Fechar mercados automaticamente

Criar um edge function `close-locked-markets` que:
- Busca mercados com `status = 'open'` e `lock_date <= NOW()`
- Atualiza status para `closed`
- Registra log em `admin_logs`

Agendar via `pg_cron` para rodar a cada minuto.

## Estrutura de Arquivos

```text
Modificados:
  supabase/functions/admin-actions/index.ts   (novo case schedule_lock)
  src/pages/admin/AdminMarkets.tsx             (dialog + coluna + botao)

Criados:
  supabase/functions/close-locked-markets/index.ts

Migration:
  ADD COLUMN lock_date + UPDATE place_prediction
```

## Detalhes Tecnicos

- `lock_date` e separado de `end_date` — `end_date` e a data limite informativa do evento, `lock_date` e quando apostas travam
- O DatePicker usa o componente Calendar do shadcn com `pointer-events-auto` dentro de Popover
- O cron roda a cada minuto verificando mercados que passaram do `lock_date`
- A validacao principal acontece no banco (funcao `place_prediction`), garantindo seguranca server-side

