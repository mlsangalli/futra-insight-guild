

# Fix: Parser muito rígido

## Problemas identificados

1. **Categorias sem tolerância a typos** — "footbal", "politcs", "economya" etc. são rejeitados
2. **Campos não reconhecidos viram continuação** — "Imagem do mercado:", "Texto alternativo (alt):", "Fonte da imagem:" não estão nos patterns, então suas linhas são anexadas ao campo anterior (neste caso, "Data limite"), corrompendo o valor
3. **Campos de valor único (data, categoria) aceitam múltiplas linhas** — deveriam usar apenas a primeira linha

## Correções

### 1. Fuzzy category matching
Adicionar Levenshtein distance simples (threshold <= 2) para aceitar typos como "footbal", "ecnomy", "tecnolgia", "cripoto", etc. Se a distância for pequena o suficiente, aceitar e mapear.

### 2. Adicionar field patterns faltantes
```
"Imagem do mercado" → thumbnail
"Texto alternativo" / "Alt" → thumbnail_alt
"Fonte da imagem" → thumbnail_source  
```
Mesmo que esses campos não sejam usados no draft, reconhecê-los evita que contaminem outros campos.

### 3. Campos single-value: usar apenas primeira linha
Para `end_date`, `category`, `slug` — ao salvar o campo, usar apenas a primeira linha não-vazia ao invés de concatenar tudo.

### 4. Linhas não-reconhecidas com ":" devem parar a continuação
Se uma linha tem formato "Algo:" mas não é reconhecida, ela deve encerrar o campo atual (não ser anexada como continuação). O valor é descartado silenciosamente ou adicionado como warning.

## Arquivo modificado

```
src/lib/market-text-parser.ts
```

## Resultado
- "footbal" → football (aceito)
- "Data limite: 11/06/2026 00:00" → parseia apenas a data, ignora linhas seguintes que são campos não mapeados
- Campos extras como "Imagem do mercado" são reconhecidos ou pelo menos não corrompem outros campos

