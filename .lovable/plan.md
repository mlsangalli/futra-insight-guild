

# Pipeline Unificado de Candidatos a Mercado

## Diagnóstico Atual

| Entrada | Onde persiste | Status pipeline |
|---------|--------------|-----------------|
| Admin manual (AdminMarkets form) | Insere direto em `markets` | Sem revisão — vai direto para `open` |
| Auto-geração (create-markets-from-trends) | Insere direto em `markets` + log em `scheduled_markets` | Sem revisão — vai direto para `open` |
| CreateMarket (moderador) | **Não persiste** — só mostra toast | Formulário sem backend |

**Problemas**: não há fila de candidatos; `scheduled_markets` é apenas log de deduplicação; CreateMarket não grava nada.

## Decisão de Design

**Ampliar `scheduled_markets`** para ser a fila de candidatos. Motivo:
- Já tem `source`, `source_topic`, `category`, `topic_hash`, `status`, `market_id`
- Adicionar colunas faltantes é mais simples que criar tabela nova
- Mantém deduplicação existente intacta

## Plano de Implementação

### 1. Migration: expandir `scheduled_markets`

Adicionar colunas:
- `generated_question TEXT`
- `generated_description TEXT`
- `generated_options JSONB DEFAULT '[]'`
- `resolution_source TEXT`
- `confidence_score NUMERIC DEFAULT 0`
- `reviewed_by UUID` (admin que revisou)
- `reviewed_at TIMESTAMPTZ`

Expandir `status` de (`created`, `skipped`, `failed`) para incluir: `new`, `reviewed`, `approved`, `rejected`, `published`.

Migrar dados existentes: `created` → `published`, `skipped`/`failed` ficam como estão.

### 2. Ajustar Edge Function `create-markets-from-trends`

Mudança principal: **não inserir direto em `markets`**. Ao invés disso:
- Inserir candidato em `scheduled_markets` com status `new` e os campos gerados pela IA (`generated_question`, `generated_options`, etc.)
- Remover o INSERT direto em `markets`
- Manter deduplicação via `topic_hash`

### 3. Ajustar `CreateMarket` page

- Remover gate de admin (qualquer usuário autenticado pode sugerir)
- No submit, inserir em `scheduled_markets` com `source: 'user_suggestion'`, status `new`
- Hash gerado a partir da pergunta para deduplicação
- Toast de confirmação + feedback visual

### 4. Nova action em `admin-actions`: `approve_candidate` e `reject_candidate`

**`approve_candidate`**:
- Recebe `candidate_id` + edições opcionais (question, description, options, category, end_date)
- Insere em `markets` usando os dados do candidato (ou editados)
- Atualiza `scheduled_markets` com `status: 'published'`, `market_id`, `reviewed_by`, `reviewed_at`
- Log em `admin_logs`

**`reject_candidate`**:
- Atualiza status para `rejected` + `reviewed_by` + `reviewed_at`

### 5. Painel de candidatos no AdminMarkets

Substituir a seção "Mercados Automáticos" atual por uma seção "Fila de Candidatos" com:
- Filtro por status (`new`, `reviewed`, `approved`, `rejected`, `published`)
- Cada candidato mostra: source, topic, pergunta gerada, categoria, confidence
- Botões: Aprovar (abre dialog com campos editáveis), Rejeitar, Preview
- Dialog de aprovação pré-preenche com dados gerados, permite editar antes de publicar

### 6. Deduplicação

- `topic_hash` (já existe) previne duplicatas entre candidatos
- Na aprovação, verificar se já existe market com pergunta similar (ILIKE simples)

## Arquivos a criar/modificar

```text
Modificar:
├── supabase/migrations/           — expandir scheduled_markets
├── supabase/functions/create-markets-from-trends/index.ts  — inserir como candidato
├── supabase/functions/admin-actions/index.ts               — add approve/reject
├── src/pages/CreateMarket.tsx                              — persistir sugestão
├── src/pages/admin/AdminMarkets.tsx                        — painel de candidatos
```

## Fluxo Final

```text
                    ┌─────────────────┐
  Auto-geração ───→ │                 │
  Sugestão user ──→ │ scheduled_markets│ status: new
  Admin manual ───→ │  (candidatos)   │
                    └────────┬────────┘
                             │
                      Admin revisa
                             │
                    ┌────────┴────────┐
                    │   approved?     │
                    ├── Sim ──────────┤
                    │  INSERT markets │ status: published
                    │  market_id set  │
                    ├── Não ──────────┤
                    │  status:rejected│
                    └─────────────────┘
```

## Detalhes Técnicos

**Migration SQL**:
```sql
ALTER TABLE scheduled_markets
  ADD COLUMN IF NOT EXISTS generated_question TEXT,
  ADD COLUMN IF NOT EXISTS generated_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS generated_options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS resolution_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Update existing 'created' entries to 'published' since they already have market_id
UPDATE scheduled_markets SET status = 'published' WHERE status = 'created' AND market_id IS NOT NULL;
```

**RLS**: scheduled_markets já tem policies para admin SELECT/INSERT/DELETE. Adicionar UPDATE policy para admins + INSERT policy para authenticated users (sugestões).

**CreateMarket**: remover `isAdmin` gate, manter validação Zod, INSERT em `scheduled_markets` com `source: 'user_suggestion'`.

