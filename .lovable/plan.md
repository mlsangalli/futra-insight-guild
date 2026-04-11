

# Limpeza de Mercados Incoerentes

## Diagnóstico

| Grupo | Quantidade | Ação |
|-------|-----------|------|
| Mercados seed com engajamento | 17 | Manter |
| Mercados auto-gerados sem participantes | 107 | Fechar |

Os 107 mercados auto-gerados são todos incoerentes: crimes locais, acidentes, obituários, clima, e notícias irrelevantes — a maioria categorizada incorretamente como "technology". Nenhum tem participantes.

## Plano

### 1. Migration: fechar todos os 107 mercados incoerentes

Uma única migration SQL que:
- Desabilita temporariamente o trigger `protect_market_fields_trigger` (necessário porque migrations rodam sem `auth.uid()`)
- Atualiza para `status = 'closed'` todos os mercados `open` com `total_participants = 0`
- Reabilita o trigger

Isso preserva intactos os 17 mercados seed que têm engajamento real.

### Critério de fechamento
```sql
WHERE status = 'open' 
  AND total_participants = 0
```

Simples e seguro: qualquer mercado aberto sem nenhum participante é fechado. Os 17 mercados bons todos têm participantes > 0.

## Arquivos

```text
Criar:
└── supabase/migrations/  — migration para fechar 107 mercados
```

## Resultado esperado

- 17 mercados abertos mantidos (todos com engajamento)
- 107 mercados incoerentes fechados
- Nenhum dado perdido — apenas status alterado para `closed`

