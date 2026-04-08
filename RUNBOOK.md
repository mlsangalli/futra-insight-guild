# FUTRA — Runbook de Operações

## Visão Geral

Este documento descreve procedimentos de manutenção, monitoramento e recuperação da plataforma FUTRA.

---

## 1. Verificação de Saúde do Sistema

### Health Check Page
- Acesse `/health` no navegador para diagnósticos em tempo real de DB, Auth, Realtime, Edge Functions e Storage.

### Health Monitor (automático)
- A Edge Function `health-monitor` roda a cada 15 minutos via pg_cron.
- Verifica: mercados "stuck", execução do cron de resolução, erros recentes.
- Envia alertas via webhook (Slack/Discord) quando detecta anomalias.

---

## 2. Manutenção Automática

A Edge Function `maintenance` roda diariamente às 03:00 UTC:

| Rotina | Critério | Tabela |
|--------|----------|--------|
| Limpar notificações lidas | >90 dias | `notifications` |
| Limpar admin_logs antigos | >180 dias | `admin_logs` |
| Podar scheduled_markets | status "created" >30 dias | `scheduled_markets` |
| Limpar push_subscriptions | sem update >90 dias | `push_subscriptions` |

### Execução Manual
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/maintenance \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"
```

---

## 3. Resolução de Mercados

### Fluxo Automático
1. `close-and-resolve-markets` roda a cada minuto via pg_cron.
2. **Fase 1**: Fecha mercados abertos cujo `lock_date` passou.
3. **Fase 2**: Resolve mercados fechados cujo `end_date` passou usando IA (Gemini 3 Flash).
4. Apenas resoluções com confiança "alta" são aceitas automaticamente.

### Reprocessar Mercado Pendente (Admin)
Se um mercado ficou "stuck" (fechado mas não resolvido):
1. No painel admin, clique em "Resolver" no mercado específico.
2. Ou faça POST direto:
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/close-and-resolve-markets \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"market_id": "<UUID>"}'
```
- No modo retry, confiança "média" também é aceita.

### Resolução Manual via RPC
Em último caso, resolva diretamente via banco:
```sql
SELECT resolve_market_and_score('<market_id>', '<winning_option_id>');
```

---

## 4. Monitoramento de Erros

### Sentry
- Erros críticos das Edge Functions são enviados ao Sentry via HTTP API.
- Configurado via secret `SENTRY_DSN`.
- Sem SDK pesado — usa endpoint de envelopes.

### Admin Logs
- Todas as ações automatizadas registram em `admin_logs`.
- Consulte no painel admin em `/admin/logs`.
- Tipos de action_type relevantes:
  - `auto_close_locked` — mercado fechado automaticamente
  - `auto_resolve_ai` — mercado resolvido por IA
  - `auto_resolve_skipped` — IA não teve confiança suficiente
  - `auto_resolve_error` — erro na resolução

### Analytics Events
- Eventos de operação registrados em `analytics_events`:
  - `maintenance_completed` — resultado da limpeza diária
  - `market_auto_closed` — mercados fechados automaticamente
  - `market_auto_resolved` — mercados resolvidos automaticamente

---

## 5. Alertas

### Configuração
- Secret `ALERT_WEBHOOK_URL`: URL de webhook compatível com Slack/Discord.
- Formato: POST com `{"text": "mensagem"}`.

### Cenários de Alerta
| Cenário | Severidade | Ação |
|---------|------------|------|
| Mercado stuck >48h | 🚨 Alta | Verificar logs, reprocessar manualmente |
| Cron não executou em 2h | ⚠️ Média | Verificar pg_cron, reiniciar se necessário |
| 5+ erros em 2h | 🔥 Alta | Investigar admin_logs e Sentry |

---

## 6. Recuperação de Falhas

### Banco de dados inacessível
1. Verificar status em `/health`.
2. Aguardar restauração automática do provedor.
3. Após restauro, verificar se há mercados que precisam de re-resolução.

### Edge Function falhando
1. Verificar logs da função no painel.
2. Verificar se secrets estão configurados.
3. Re-deploy da função se necessário.

### Mercados com créditos incorretos
1. Identificar o mercado e as previsões afetadas.
2. Usar `calculate_user_scores(user_id)` para recalcular scores individuais.
3. Usar `recalculate_global_ranks()` para reordenar o ranking global.

---

## 7. Contatos

| Responsável | Canal |
|-------------|-------|
| Alertas automáticos | Webhook configurado em `ALERT_WEBHOOK_URL` |
| Erros críticos | Sentry (configurado via `SENTRY_DSN`) |
