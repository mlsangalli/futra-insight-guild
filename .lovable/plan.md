

# FUTRA Bracket — Copa do Mundo 2026

## Visão geral

Produto independente dentro da FUTRA: uma página interativa onde o usuário prevê o caminho completo da Copa do Mundo 2026 — da fase de grupos até o campeão — em um bracket visual premium com persistência no banco de dados.

## Fase 1 — Fundação (esta implementação)

### 1. Migração SQL — 7 tabelas novas

```text
tournaments
├── id, name, slug, status, deadline, scoring_rules (jsonb), created_at

tournament_groups
├── id, tournament_id, group_letter

tournament_group_teams
├── id, group_id, team_name, team_code (ISO), flag_emoji, seed_position

bracket_matches
├── id, tournament_id, round (R32/R16/QF/SF/F), match_order, bracket_side (L/R)
├── home_source, away_source (ex: "1A", "2B", "3rd_X")
├── official_winner (preenchido pelo admin após resultado real)

bracket_entries
├── id, user_id, tournament_id, status (draft/submitted/scored)
├── progress_percent, champion_pick, total_score, created_at, updated_at

bracket_entry_group_picks
├── id, entry_id, group_id, team_id, predicted_position (1-4)
├── UNIQUE(entry_id, group_id, predicted_position)

bracket_entry_knockout_picks
├── id, entry_id, match_id, chosen_team_name
```

RLS: leitura pública para tournaments/groups/teams/matches. Entries e picks restritos ao próprio user_id.

### 2. Seed Data — Copa do Mundo 2026

Inserir via migração:
- 1 tournament (Copa do Mundo 2026, 48 times)
- 12 grupos (A-L) com 4 times cada
- 32 bracket_matches (R32→R16→QF→SF→Final) com source_dependency configurado

A Copa 2026 tem 48 times em 12 grupos. Os 2 primeiros de cada grupo (24) + 8 melhores terceiros = 32 classificados → Round of 32.

### 3. Páginas e componentes

```text
src/pages/bracket/
├── BracketPage.tsx          — página principal com stepper
├── GroupStage.tsx            — drag-to-reorder dos times por grupo
├── ThirdPlacePicker.tsx      — selecionar 8 melhores terceiros
├── KnockoutBracket.tsx       — bracket visual com conectores SVG
├── BracketSummary.tsx        — resumo + submit

src/components/bracket/
├── GroupCard.tsx              — card de um grupo com 4 times ordenáveis
├── TeamBadge.tsx             — flag + nome do time
├── MatchNode.tsx             — nó de um confronto no bracket
├── BracketConnectors.tsx     — linhas SVG conectando fases
├── BracketProgress.tsx       — barra de progresso global
```

### 4. Hook principal — `useBracketEntry`

- Carrega entry do usuário (ou cria draft)
- Gerencia state local dos picks (grupos + knockout)
- Auto-save via debounce (1.5s)
- Recálculo cascata: alterar pick de grupo → limpa knockout picks dependentes
- Calcula progress_percent
- Submit final quando 100%

### 5. Lógica de cascata

```text
Grupo alterado → recalcular terceiros disponíveis
Terceiros alterados → recalcular R32 matchups
R32 alterado → limpar R16 picks dependentes
... até a final
```

Cada match tem `home_source` e `away_source` (ex: "W_M1", "W_M2") que permitem resolver qual time deve aparecer com base nos picks anteriores.

### 6. Rotas

- `/bracket` — lista de torneios ativos (inicialmente só Copa 2026)
- `/bracket/:slug` — página do bracket interativo
- `/bracket/:slug/leaderboard` — ranking do bracket

### 7. Admin

Nova seção no admin existente:
- `/admin/tournaments` — CRUD de torneios
- Configurar deadline, scoring, status (open/locked/scored)
- Registrar resultados oficiais (oficial_winner em cada match)

### 8. Scoring (preparado, não ativo até resultados reais)

```json
{
  "group_correct_position": 2,
  "group_qualified": 1,
  "third_place_correct": 2,
  "R32": 2,
  "R16": 4,
  "QF": 6,
  "SF": 10,
  "final": 15,
  "champion": 25
}
```

### 9. UX

- Desktop: bracket horizontal com scroll, grupos em grid 4x3
- Mobile: stepper vertical, grupos empilhados, bracket com scroll horizontal
- Animação sutil (framer-motion) ao avançar time
- Estados visuais: pendente (outline), definido (preenchido), bloqueado (lock icon), concluído (check)
- Campeão com destaque dourado no centro

### 10. Navegação

- Adicionar "Bracket" no Header NAV_ITEMS e no BottomNav
- Card promocional na Home page

## Arquivos criados/modificados

**Novos** (~15 arquivos):
- 1 migração SQL (tabelas + seed data + RLS)
- 4 páginas (BracketPage, Leaderboard, Admin)
- 6 componentes bracket
- 2 hooks (useBracketEntry, useTournament)
- 1 tipo (bracket types)

**Modificados** (~4 arquivos):
- App.tsx (rotas)
- Header.tsx (nav item)
- BottomNav.tsx (nav item)
- AdminSidebar.tsx (link admin)

## Fora do escopo inicial

- Múltiplas entries por usuário
- Card compartilhável (imagem gerada)
- Duplicar entry
- Scoring automático (requer resultados reais)

