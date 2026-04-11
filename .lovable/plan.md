

# Edição de Perguntas e Opções de Mercados pelo Admin

## Problema
O `MarketFormDialog` atual permite editar pergunta, descrição, categoria, data e regras — mas **não permite editar as opções (respostas)** dos mercados. Além disso, a edição usa chamada direta ao Supabase, que é bloqueada pelo trigger `protect_market_fields` para o campo `options`.

## Plano

### 1. Nova action `edit_market` na Edge Function `admin-actions`
Adicionar uma action que usa `service_role` para atualizar:
- `question`, `description`, `category`, `end_date`, `resolution_rules`, `resolution_source`
- Labels das opções na tabela `market_options` (que automaticamente sincroniza o JSONB via trigger `sync_options_jsonb`)

### 2. Atualizar `MarketFormDialog` para incluir edição de opções
- Quando editando um mercado existente, carregar as opções atuais do `market.options`
- Exibir campos editáveis para cada label de opção
- Adicionar campo de `resolution_source`
- Enviar tudo via a nova action `edit_market`

### 3. Atualizar `saveMutation` 
- Para mercados existentes: usar `invokeAdmin({ action: 'edit_market', ... })` ao invés de chamada direta
- Para novos mercados: manter o fluxo atual

## Arquivos modificados

```text
Editar:
├── supabase/functions/admin-actions/index.ts  — nova action edit_market
└── src/pages/admin/AdminMarkets.tsx           — opções editáveis no form
```

