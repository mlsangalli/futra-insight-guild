

# Sistema de Dados Sintéticos — FUTRA

## Arquitetura

```text
┌─────────────────────────────────────────────┐
│                ADMIN PANEL                   │
│  Toggle seed mode │ Config por mercado       │
│  Reset all │ View mode (real/synth/both)     │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│         synthetic_market_data (DB)           │
│  market_id │ seed │ config │ snapshot_data   │
│  Tabela separada, nunca toca markets/options │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│     src/lib/synthetic-engine.ts (client)     │
│  PRNG determinístico (seed) → gera:          │
│  - histórico de preços (chart points)        │
│  - probabilidades, volume, participantes     │
│  - oscilações dinâmicas baseadas em tempo    │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│     src/hooks/useSyntheticMarket.ts          │
│  Overlay layer: se synth ativo p/ mercado,   │
│  sobrescreve campos visuais no Market obj    │
│  Dados reais nunca são alterados no DB       │
└─────────────────────────────────────────────┘
```

## Componentes do plano

### 1. Tabela `synthetic_market_data` (migração)
- `id`, `market_id` (unique), `enabled` (bool), `seed` (int), `config` (jsonb), `snapshot` (jsonb), `created_at`, `updated_at`
- Config JSONB: `{ initial_probability, volatility, volume_base, growth_rate, priority_level, mode: "static"|"dynamic" }`
- Snapshot JSONB: dados pré-computados (chart history, current values)
- RLS: somente admins (CRUD)

### 2. Motor sintético determinístico (`src/lib/synthetic-engine.ts`)
- PRNG com seed (mulberry32) — mesma seed = mesmos dados sempre
- Funções: `generatePriceHistory(seed, config, points)`, `generateCurrentStats(seed, config, elapsed)`, `generateParticipants(seed, config)`
- Perfis de mercado: estável, volátil, baixo volume, alto engajamento — controlados por `volatility` e `priority_level`
- Modo dinâmico: usa `Date.now()` discretizado (ex: a cada 5min) como offset do seed para micro-variações
- Gráficos com curva suave (Brownian motion com drift), sem saltos absurdos

### 3. Hook `useSyntheticMarket.ts`
- Busca `synthetic_market_data` para o mercado (ou todos ativos)
- Se `enabled`, gera dados via engine e retorna Market com campos sobrepostos (percentage, votes, total_participants, total_credits, chart points)
- Expõe flag `isSynthetic` para UI

### 4. Hook `useSyntheticOverlay.ts`
- Wrapper que recebe um `Market[]` e aplica overlay sintético onde ativo
- Usado em `useHomeFeeds`, `useBrowseSorted`, `useMarket` — intercepta retorno e aplica dados sintéticos
- Admin pode alternar view mode via localStorage: `real` | `synthetic` | `both`

### 5. Painel Admin — aba "Simulação" em AdminMarkets
- Toggle global de seed mode (banner amarelo permanente quando ativo)
- Lista de mercados com toggle individual de simulação
- Form de configuração por mercado: seed, probabilidade inicial, volatilidade, volume, prioridade, modo (estático/dinâmico)
- Botões: "Redefinir seed", "Apagar dados sintéticos", "Reset completo"
- Seletor de visualização: Dados Reais / Dados Sintéticos / Comparação
- Badge visual `🧪 SIMULAÇÃO` no header admin quando qualquer mercado tem synth ativo

### 6. Indicadores visuais (admin only)
- Badge `🧪` nos cards de mercado no admin quando synth está ativo
- Banner amarelo no topo do admin: "Modo simulação ativo em N mercados"
- MarketCard no admin mostra overlay sutil quando exibindo dados sintéticos

## Proteções
- Dados sintéticos vivem **exclusivamente** na tabela `synthetic_market_data` — nunca alteram `markets`, `market_options` ou `predictions`
- O overlay é aplicado **apenas no frontend**, na camada de hooks
- Toggle de visualização é admin-only (localStorage flag + verificação de role)
- Usuários comuns nunca veem indicadores de simulação
- Reset apaga apenas `synthetic_market_data`, dados reais intactos

## Arquivos

```text
Criar:
├── src/lib/synthetic-engine.ts          — motor PRNG + geração de dados
├── src/hooks/useSyntheticMarket.ts      — hook de dados sintéticos por mercado
├── src/hooks/useSyntheticOverlay.ts     — overlay em listas de mercados
├── src/components/admin/SyntheticPanel.tsx — painel de controle no admin

Editar:
├── src/pages/admin/AdminMarkets.tsx     — adicionar aba/seção "Simulação"
├── src/components/admin/AdminLayout.tsx — banner de modo sintético
├── src/hooks/useMarkets.ts             — integrar overlay sintético
├── src/components/futra/MarketCard.tsx  — suportar chart points do synthetic
├── src/components/futra/PriceChart.tsx  — aceitar points externos

Migração:
└── CREATE TABLE synthetic_market_data (...)
```

## Fluxo de uso
1. Admin vai em Mercados → aba "Simulação"
2. Ativa simulação para mercados selecionados, configura seed e parâmetros
3. Sistema gera dados determinísticos instantaneamente no client
4. Gráficos, probabilidades, volume e participantes aparecem preenchidos
5. Admin alterna entre visualização real/sintética para comparar
6. Reset limpa tudo e volta aos dados reais

