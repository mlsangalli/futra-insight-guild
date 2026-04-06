

# Resolução de Mercados — Plano de Implementação

## Resumo

Adicionar um botão "Resolver" nos mercados com status `open` ou `closed` no painel admin. Ao clicar, um dialog mostra as opções do mercado para o admin selecionar o vencedor. A resolução é processada atomicamente no edge function `admin-actions`, que:
1. Atualiza o mercado (status → `resolved`, `resolved_option` definido)
2. Marca predictions vencedoras como `won` e perdedoras como `lost`
3. Distribui recompensas proporcionais aos vencedores
4. Atualiza perfis (créditos, resolved_predictions, accuracy_rate)

## Mudanças

### 1. Edge Function `admin-actions/index.ts`
Adicionar case `resolve_market` que recebe `market_id` e `winning_option` (o id da opção vencedora):

- Busca o mercado e valida que não está já resolvido
- Busca todas as predictions do mercado
- Calcula o pool total de créditos
- Calcula a soma dos créditos dos vencedores (quem escolheu `winning_option`)
- Para cada vencedor: `reward = Math.floor((user_credits / total_winning_credits) * total_pool)`
- Atualiza cada prediction: `status = 'won'` + `reward` para vencedores, `status = 'lost'` para perdedores
- Atualiza perfis dos participantes: incrementa `resolved_predictions`, adiciona `reward` aos `futra_credits`, recalcula `accuracy_rate`
- Atualiza o mercado: `status = 'resolved'`, `resolved_option = winning_option`
- Se não houver vencedores, devolve créditos a todos os participantes

### 2. Frontend `AdminMarkets.tsx`
- Adicionar state `resolvingMarket` e um dialog `ResolveMarketDialog`
- Botão com ícone `CheckCircle` na coluna de ações (visível apenas para mercados não resolvidos)
- O dialog lista as opções do mercado (extraídas do campo `options` jsonb) com votos e créditos de cada uma
- Admin seleciona a opção vencedora e confirma
- Mutation chama `invokeAdmin({ action: 'resolve_market', market_id, winning_option })`
- Toast de sucesso/erro

### 3. Sem migration necessária
As tabelas `predictions` (com campo `reward` e `status`) e `markets` (com `resolved_option` e `status`) já possuem todos os campos necessários. A edge function usa `service_role` key, portanto contorna RLS.

## Detalhes Técnicos

**Fórmula de recompensa:**
```
reward_i = floor((credits_i / sum_winning_credits) * total_pool)
```
Se ninguém acertou, créditos são devolvidos integralmente a cada participante.

**Accuracy rate recalculada:**
```
accuracy_rate = (wins / resolved_predictions) * 100
```

**Arquivos modificados:**
- `supabase/functions/admin-actions/index.ts` — novo case `resolve_market`
- `src/pages/admin/AdminMarkets.tsx` — botão resolver + dialog de seleção

