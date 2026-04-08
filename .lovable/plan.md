

# Rotinas de Manutenção e Monitoramento

## O que já existe
- Health check page (`/health`) com diagnóstico de DB, Auth, Realtime, Edge Functions, Storage
- Logger estruturado (`src/lib/logger.ts`) preparado para serviço externo
- Error handling com `ApiError` e `parseSupabaseError`
- Tabela `analytics_events` para tracking
- Admin dashboard com métricas
- CI pipeline (GitHub Actions) com tsc, eslint, vitest, build
- Cron job existente para `close-and-resolve-markets` (pg_cron)

## Plano de Implementação

### 1. Edge Function `maintenance` (limpeza automática)
Uma única Edge Function que executa 3 rotinas de limpeza, chamada via pg_cron diariamente às 03:00 UTC:

- **Arquivar notificações antigas**: DELETE de `notifications` lidas com mais de 90 dias
- **Limpar admin_logs antigos**: DELETE de `admin_logs` com mais de 180 dias
- **Podar scheduled_markets**: DELETE de `scheduled_markets` com status `created` e `created_at` > 30 dias
- **Limpar push_subscriptions órfãs**: DELETE de subscriptions sem update há 90 dias

Agendar via `cron.schedule` (INSERT na cron.job via supabase insert tool, não migration).

### 2. Edge Function `health-monitor` (alertas)
Edge Function chamada via pg_cron a cada 15 minutos que:
- Verifica se há mercados "stuck" (closed > 48h sem resolução)
- Verifica se cron de resolução executou nas últimas 2h (checando `admin_logs`)
- Conta erros recentes em `admin_logs` (últimas 2h)
- Se detectar problema, envia alerta via webhook (Slack/Discord/Email configurável via secret `ALERT_WEBHOOK_URL`)

### 3. Integração Sentry nas Edge Functions
- Criar `supabase/functions/_shared/sentry.ts` com helper `captureException` que envia para Sentry via HTTP API (sem SDK pesado)
- Requer secret `SENTRY_DSN`
- Integrar nos catch blocks das Edge Functions existentes (`close-and-resolve-markets`, `send-push-notification`)

### 4. Métricas de operação via analytics_events
- Na Edge Function `close-and-resolve-markets`, inserir eventos `market_auto_closed` e `market_auto_resolved` na tabela `analytics_events` após cada execução
- Na Edge Function `maintenance`, inserir evento `maintenance_completed` com contagem de registros limpos

### 5. Documento de Procedimentos (RUNBOOK.md)
- Como reprocessar mercados pendentes (retry via admin panel ou POST direto)
- Como verificar saúde do sistema (`/health`)
- Como consultar logs de manutenção
- Procedimento de recuperação para cada cenário de falha

### 6. Testes automatizados para Edge Functions
- Criar `supabase/functions/maintenance/index_test.ts` com testes Deno
- Criar `supabase/functions/health-monitor/index_test.ts`
- Adicionar testes frontend para `useAdminMetrics` e `useMissions`

## Detalhes Técnicos

**Edge Function `maintenance`**: usa `SUPABASE_SERVICE_ROLE_KEY` para deletar registros. Retorna JSON com contagens de registros removidos.

**Edge Function `health-monitor`**: envia POST para `ALERT_WEBHOOK_URL` (formato compatível com Slack webhooks) quando detecta anomalias.

**Sentry helper**: usa a API de envelopes do Sentry (`POST https://sentry.io/api/{project}/envelope/`) com DSN parseado, sem dependência de SDK.

**Cron schedules** (via supabase insert tool):
- `maintenance`: `0 3 * * *` (03:00 UTC diariamente)
- `health-monitor`: `*/15 * * * *` (a cada 15 minutos)

**Secrets necessários**:
- `SENTRY_DSN` — DSN do projeto Sentry
- `ALERT_WEBHOOK_URL` — URL de webhook para alertas (Slack/Discord)

## Arquivos a criar/modificar

```text
Criar:
├── supabase/functions/maintenance/index.ts
├── supabase/functions/health-monitor/index.ts
├── supabase/functions/_shared/sentry.ts
├── RUNBOOK.md
├── supabase/functions/maintenance/index_test.ts
├── supabase/functions/health-monitor/index_test.ts

Modificar:
├── supabase/functions/close-and-resolve-markets/index.ts  (add sentry + analytics)
├── supabase/functions/send-push-notification/index.ts     (add sentry)
├── PRODUCTION_CHECKLIST.md                                 (mark monitoring items)
```

