

# Criação de Mercados em Massa via Texto

## Resumo
Adicionar suporte para colar múltiplos mercados em um único bloco de texto, separados por `---`. O sistema interpreta todos, mostra um resumo/preview, e cria todos de uma vez.

## Alterações

### 1. Parser: nova função `parseMultipleMarkets`
**Arquivo:** `src/lib/market-text-parser.ts`

- Adicionar função que divide o texto por separadores (`---`, `===`, ou `***`)
- Cada bloco é passado ao `parseMarketText` existente
- Retorna array de `ParseResult` com índice do mercado para identificação de erros

```typescript
export interface BulkParseResult {
  results: { index: number; draft: MarketDraft; errors: string[]; warnings: string[] }[];
  totalValid: number;
  totalInvalid: number;
}

export function parseMultipleMarkets(text: string): BulkParseResult
```

### 2. UI: Novo botão "Criar em massa" no AdminMarkets
**Arquivo:** `src/pages/admin/AdminMarkets.tsx`

- Adicionar botão "Criar em massa" ao lado do "Novo Mercado" na toolbar principal
- Abre um `Dialog` dedicado (não o form individual) com:
  - Textarea grande para colar múltiplos mercados
  - Botão "Interpretar todos"
  - Lista de preview mostrando cada mercado com status (válido/inválido)
  - Erros específicos por mercado (ex: "Mercado #3: Categoria inválida")
  - Botão "Criar X mercados" que submete apenas os válidos
  - Progress indicator durante criação
- Cada mercado é criado sequencialmente usando o mesmo fluxo do `saveMutation` (insert na tabela `markets`)
- Ao final, mostra resumo: "5 criados, 1 com erro"

### 3. Fluxo do usuário
1. Clica "Criar em massa"
2. Cola texto com múltiplos mercados separados por `---`
3. Clica "Interpretar todos"
4. Vê lista com preview de cada mercado (verde = válido, vermelho = erro)
5. Pode remover mercados individuais da lista antes de criar
6. Clica "Criar N mercados"
7. Mercados são criados sequencialmente
8. Feedback final com contagem de sucesso/erro

## Arquivos

```text
Editar:
├── src/lib/market-text-parser.ts   — nova função parseMultipleMarkets
└── src/pages/admin/AdminMarkets.tsx — novo dialog de criação em massa
```

