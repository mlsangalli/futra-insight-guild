---
name: FUTRA Flow
description: Modo principal de descoberta — feed vertical de cards swipeable em /flow, RPC get_flow_feed prioriza mercados não vistos por urgência+novidade+afinidade, swipe right=SIM, left=NÃO, up=skip (tabela flow_skips reaparece após 7d), conviction opcional via prediction_conviction, sessions tracked em flow_sessions, BottomNav central destacado.
type: feature
---

# FUTRA Flow

**Carro-chefe da plataforma**: feed vertical de cards full-screen onde o usuário responde mercados em sequência (Tinder/TikTok-style).

## Backend
- **Tabelas**: `flow_skips` (PK user_id+market_id, RLS própria), `flow_sessions` (telemetria por sessão), `prediction_conviction` (low/medium/high opcional, FK predictions).
- **RPCs SECURITY DEFINER**:
  - `get_flow_feed(p_limit)` — exclui markets já previstos pelo usuário e skips < 7 dias. Score: atividade recente *8 + participantes *2 + ln(credits)*10 + urgência (35/18/8) + novidade (30/15/5) + featured 20 + trending 15 + match com `profiles.specialties` +12.
  - `record_flow_skip(market_id)` — upsert (reseta timer se re-skip).
  - `record_prediction_conviction(prediction_id, level)` — só dono da prediction, ON CONFLICT DO NOTHING.
  - `get_flow_stats(user_id?)` — total sessions/answered/skipped/avg + best_category.

## Frontend
- **Rota**: `/flow` (lazy + ProtectedRoute) em `src/pages/Flow.tsx`.
- **Componentes** em `src/components/flow/`: `FlowCard` (framer-motion drag, overlays SIM/NÃO/PULAR), `FlowProgress`, `FlowSummary`.
- **Hook** `src/hooks/useFlow.ts`: `useFlowFeed`, `useFlowStats`, `useRecordSkip`, `useRecordConviction`, `useFlowSession {start,update,end}`.
- **Gestos**: drag right >140px ou velocity >600 = SIM; left = NÃO; up >120 = skip. Tap = navigate to `/market/:id`.
- **Convicção implícita**: chips de créditos rápidos (50/100/250/500 FC) — quanto mais aposta, maior convicção. Convicção explícita pode ser adicionada depois via `record_prediction_conviction`.
- **Reuso**: `useCreatePrediction` (place_prediction RPC) já existente — não duplica lógica nem missions tracking.

## Navegação
- BottomNav: ícone `Zap` central destacado (`/flow` substituiu Bracket no slot highlight).
- Home: CTA premium logo abaixo do DailyBonusBanner (variante diferente para autenticado vs anônimo→`/login?redirect=/flow`).

## Telemetria
- `flow_sessions` registra cada sessão (started_at, ended_at, cards_viewed/answered/skipped/shared, total_credits_invested, device_type).
- `trackEvent` dispara `page_view {mode:'flow'}` e `prediction_placed {mode:'flow'}`.

## Restrições
- Sem dinheiro real (regra do produto).
- Sem fricção entre cards: previsão otimista, próximo card desliza por baixo automaticamente.
- Mobile-first, container max-w-md também imersivo no desktop.
