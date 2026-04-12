

# Esconder mercados "closed" das páginas públicas

## Problema
- A função `get_browse_sorted` (usada na página Browse) retorna **todos** os mercados, incluindo `closed`
- A função `fetchAllMarkets` (usada na página Category) também não filtra por status
- A função `get_home_feeds` já filtra por `status = 'open'`, mas não mostra `resolved`
- Resultado: mercados fechados aparecem para o público, e mercados resolvidos não aparecem na home

## Mudanças necessárias

### 1. Migração SQL — Atualizar `get_browse_sorted`
Adicionar filtro `WHERE m.status IN ('open', 'resolved')` na query principal e no COUNT, excluindo `closed`.

### 2. Migração SQL — Atualizar `get_home_feeds`
Manter as seções trending/popular/featured com `status = 'open'` (faz sentido — são mercados ativos). Opcionalmente adicionar uma seção de "Resolvidos recentes" se desejado, mas o principal é garantir que `closed` nunca apareça.

### 3. `src/lib/market-queries.ts` — Filtrar em `fetchAllMarkets` e `fetchMarkets`
Adicionar `.in('status', ['open', 'resolved'])` nas queries que não recebem filtro de status explícito. Isso afeta as páginas Category, Search e Watchlist.

### 4. Páginas que usam dados diretos
- **Category** (`useMarkets`→`fetchAllMarkets`): filtrado pela mudança acima
- **SearchResults** (`useSearchMarkets`): verificar e adicionar filtro
- **Browse** (`useBrowseSorted`→RPC): filtrado pela migração SQL
- **Watchlist**: manter todos (o usuário escolheu seguir)

## Arquivos modificados
- **Migração SQL**: `ALTER FUNCTION get_browse_sorted` — adicionar `AND m.status != 'closed'`
- **`src/lib/market-queries.ts`**: adicionar filtro `.neq('status', 'closed')` em `fetchAllMarkets` e `fetchMarkets` quando nenhum status é especificado
- **`src/hooks/useSearch.ts`**: adicionar filtro para excluir closed

## Detalhes técnicos
- Mercados `closed` continuam acessíveis no admin
- Se alguém acessar diretamente `/market/:id` de um mercado closed, ele ainda aparece (isso é ok, é acesso direto)
- Watchlist mantém todos os mercados que o usuário salvou, independente do status

