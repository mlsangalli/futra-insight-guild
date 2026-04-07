

# Fechamento e Resolução Automática de Mercados via IA

## Visão Geral

Expandir a Edge Function `close-locked-markets` existente (ou criar uma nova `close-and-resolve-markets`) para:
1. **Fechar** mercados cujo `lock_date` ou `end_date` passou
2. **Resolver automaticamente** mercados fechados usando Lovable AI (Gemini) para determinar o resultado correto
3. **Agendar via cron** a cada minuto

## Arquitetura

```text
pg_cron (1 min) → Edge Function close-and-resolve-markets
                    │
                    ├─ FASE 1: Fechar mercados open com lock_date <= NOW()
                    │           (lógica atual do close-locked-markets)
                    │
                    └─ FASE 2: Resolver mercados closed com end_date <= NOW()
                               │
                               ├─ Para cada mercado: chamar Lovable AI
                               │   com question + options + resolution_source
                               │   → IA retorna winning_option_id
                               │
                               ├─ Chamar RPC resolve_market_and_score()
                               │   (transação atômica já existente)
                               │
                               └─ Registrar em admin_logs
```

## Etapas de Implementação

### 1. Nova Edge Function `close-and-resolve-markets`
Substituirá `close-locked-markets`. Duas fases:

**Fase 1 — Lock (já existe)**
- Selecionar `markets` com `status='open'` e `lock_date <= NOW()`
- Atualizar para `status='closed'`
- Registrar em `admin_logs`

**Fase 2 — Resolve via IA**
- Selecionar `markets` com `status='closed'` e `end_date <= NOW()`
- Buscar `market_options` de cada mercado
- Chamar Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling:
  - System prompt: "Dado um mercado de previsão, determine qual opção é a correta com base em fatos verificáveis. Se não for possível determinar com certeza, retorne `null`."
  - User prompt: pergunta + opções + fonte de resolução
  - Tool: `resolve_market` com schema `{ winning_option_id: string | null, confidence: string, reasoning: string }`
- Se IA retornar `winning_option_id` válido com confidence "high":
  - Chamar `adminClient.rpc('resolve_market_and_score', { p_market_id, p_winning_option })` (RPC atômica existente que distribui prêmios, notificações e rankings)
- Se IA retornar `null` ou confidence baixa:
  - Pular resolução, registrar em `admin_logs` como `auto_resolve_skipped`
- Limitar a 5 mercados por execução para evitar timeout

**Fallback**: Se a IA falhar (erro 429/500), o mercado permanece `closed` e será tentado na próxima execução.

### 2. Deletar `close-locked-markets`
Removida pois a nova função absorve essa responsabilidade.

### 3. Configurar Cron Job
Usar `pg_cron` + `pg_net` para chamar a função a cada minuto:
- Habilitar extensões `pg_cron` e `pg_net` (migration)
- Inserir job via SQL insert tool (não migration, pois contém dados sensíveis)

## Detalhes Técnicos

- **Sem novas tabelas**: usa `markets`, `market_options`, `admin_logs` existentes
- **Sem alteração na resolução manual**: admin continua resolvendo via `admin-actions` → `resolve_market`
- **RPC `resolve_market_and_score`**: já implementa transação atômica (distribuição de créditos, notificações, achievements, ranking)
- **Segurança**: função usa `SUPABASE_SERVICE_ROLE_KEY` (sem auth de usuário)
- **Rate limit**: 1 chamada por minuto via `checkRateLimit`
- **Logging**: registra em `admin_logs` com `SYSTEM_USER_ID`

