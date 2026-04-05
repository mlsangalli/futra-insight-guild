

# FUTRA — Social Forecasting Platform

## Visão Geral
Plataforma social de forecasting onde usuários fazem palpites simples (SIM/NÃO ou múltipla escolha), alocam Futra Credits, e constroem reputação baseada em acertos. Visual dark premium, inspirado na clareza do Polymarket mas com identidade própria.

## Design System
- Paleta dark premium conforme especificado (Night 950 #05070C, Neon Blue #2D7CFF, Emerald #19E6A7, etc.)
- Tipografia: Inter + Space Grotesk
- Componentes: MarketCard, VoteBar, LeaderboardRow, ProfileCard, CategoryBadge, StatCard, InfluenceBadge

## Páginas (15 telas)

### 1. Homepage
- Header com logo FUTRA, navegação (Browse, Trending, Popular, New, Ending Soon, Leaderboard), categorias, busca, Login/Sign up
- Hero section com headline forte + cards de mercado animados
- Seções: mercados em destaque, trending, popular this week, ending soon, top players, como funciona, rodapé

### 2. Browse Markets
- Grid de market cards com filtros por categoria e ordenação
- Cards mostram: pergunta, categoria, prazo, opções, líder atual, participantes, créditos alocados

### 3. Category Page
- Página filtrada por categoria (Política, Economia, Cripto, Futebol, Cultura, Tecnologia)

### 4. Market Detail Page
- Pergunta em destaque, opções de resposta, distribuição de votos, participantes, créditos totais
- Painel lateral de participação: escolher lado → alocar créditos → ver recompensa potencial → confirmar
- Regras de resolução, fonte oficial, data de encerramento
- Activity feed, comentários, mercados relacionados

### 5. Leaderboard
- Rankings: global, semanal, mensal, por categoria
- Destaque para top forecasters com Futra Score e taxa de acerto

### 6. Public Profile
- Avatar, username, bio, Futra Score, taxa de acerto, especialidade por categoria, badges, posição no ranking

### 7. User Dashboard
- Portfolio de palpites (abertos/resolvidos), Futra Credits, Futra Score, ranking, badges, watchlist, estatísticas

### 8. Login & Sign Up
- Formulários clean com branding FUTRA

### 9. Onboarding
- Flow de 4 steps explicando: escolha um lado → aloque créditos → ganhe se acertar → suba no ranking

### 10. How It Works
- Página explicativa do sistema de créditos, reputação e níveis de influência

### 11. Create Market (bloqueada para baixa reputação)
- Form para criar mercado com pergunta, opções, categoria, data de encerramento, fonte de resolução
- Gate de reputação mínima

### 12. Watchlist
- Mercados salvos pelo usuário

### 13. Search Results
- Resultados de busca com filtros

### 14. Notifications Panel
- Painel de notificações (resultados, créditos, ranking)

## Dados Mockados
- ~20 mercados realistas nas categorias especificadas (política BR, economia, cripto, futebol, cultura, tech)
- Usuários mock com scores, rankings e históricos
- Distribuições de votos realistas

## Sistema de Reputação (visual)
- 4 níveis: Low / Medium / High / Elite Influence
- Badges e indicadores visuais nos perfis e leaderboard

## Responsividade
- Desktop: grids elegantes, cards ricos
- Mobile: navegação fluida, votação simplificada, cards legíveis

## Stack
- React 18 + TypeScript + Vite + Tailwind CSS
- React Router para navegação
- Dados mockados em arquivos de dados
- Componentes reutilizáveis organizados por feature
- Dark mode nativo (tema principal)

