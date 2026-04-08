1: # FUTRA — Checklist de Produção

## Segurança
- [ ] `.env` removido do histórico git (usar BFG Repo-Cleaner)
- [ ] Chaves Supabase rotacionadas após exposição
- [x] Todas as RLS policies testadas e ativas
- [x] Rotas admin protegidas por AdminRoute
- [x] Edge Functions validam Authorization headers
- [x] CORS configurado com whitelist de domínios
- [x] Criação de mercados restrita a admins (RLS policy)
- [x] Previsões privadas em mercados abertos (anti front-running)
- [ ] Ativar proteção contra senhas vazadas (HIBP) no painel de autenticação

## Performance
- [x] Build Vite passa sem erros
- [x] Bundle otimizado com chunk splitting (vendor-react, vendor-supabase, vendor-ui, vendor-charts)
- [x] Todas as páginas com lazy loading (React.lazy)
- [x] Prefetch das rotas mais acessadas após 2s
- [ ] Imagens otimizadas (WebP, lazy loading)
- [x] Índices Supabase para queries comuns (category, featured, trending, score, predictions)
- [x] Paginação cursor-based implementada (Browse, Category)

## Funcionalidade
- [ ] Fluxo Sign up → Onboarding → Dashboard funciona
- [ ] Fluxo de previsão: explorar → votar → confirmar → ver resultado
- [x] Resolução de mercado → cálculo de score → distribuição de créditos (resolve_market_and_score)
- [ ] Claim de bônus diário funciona
- [ ] Busca retorna resultados relevantes
- [ ] Notificações chegam em tempo real
- [ ] Cards de compartilhamento social renderizam corretamente
- [ ] Perfil mostra estatísticas precisas
- [x] Função `recalculate_global_ranks` existe e funciona
- [x] Rate limiting client-side em mutations críticas

## SEO & Social
- [x] Toda página tem title e meta description únicos (SEO component)
- [x] Imagens OG geram via edge function por mercado
- [x] manifest.json válido para PWA (PT-BR)
- [x] Favicon e ícones presentes
- [x] sitemap.xml criado com rotas públicas
- [x] robots.txt configurado para produção
- [x] og-default.svg existe em /public
- [x] index.html traduzido para PT-BR com structured data

## Monitoramento
- [x] Sentry integrado nas Edge Functions via HTTP API (_shared/sentry.ts)
- [x] Dashboard admin mostra métricas em tempo real
- [x] Health check endpoint funcional (/health)
- [x] Logger registra erros de query e mutation (parseSupabaseError)
- [x] Tabela analytics_events para tracking de uso
- [x] Health monitor automático a cada 15 min (Edge Function health-monitor)
- [x] Alertas via webhook (Slack/Discord) para anomalias
- [x] Métricas de operação (market_auto_closed, market_auto_resolved, maintenance_completed)

## Manutenção
- [x] Limpeza automática diária às 03:00 UTC (Edge Function maintenance)
- [x] Arquivo de notificações lidas >90 dias
- [x] Limpeza de admin_logs >180 dias
- [x] Poda de scheduled_markets antigos >30 dias
- [x] Limpeza de push_subscriptions órfãs >90 dias
- [x] RUNBOOK.md com procedimentos de recuperação

## Qualidade de Código
- [x] Tipos duplicados marcados como @deprecated (User, MarketCardData)
- [x] parseMarketRow tipado sem `any`
- [x] ErrorBoundary com logger e recovery em PT-BR
- [x] AuthContext com retry exponencial e useRequiredAuth
- [x] Hook genérico useOptimisticMutation criado
- [x] Testes unitários: api-error, rate-limiter, VoteBar, MarketCard, ErrorBoundary
