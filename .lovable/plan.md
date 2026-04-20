

## Permitir rolagem do card e mostrar todas as opções

A imagem mostra um mercado multi-opção (eleição 2026) com várias opções, mas só 4 aparecem porque há `slice(0, 4)`, o card tem altura fixa e `overflow-hidden`, e um `flex-1` cria um espaço vazio que empurra a aposta para baixo.

### Mudanças

**1. `src/components/flow/FlowCard.tsx`**

- Remover o `<div className="flex-1" />` (linha 155) que cria o gap vazio entre a pergunta e a área de aposta — assim os textos sobem naturalmente para logo após a imagem.
- Tornar o **corpo do card rolável** envolvendo a área principal num container `overflow-y-auto` com `overscroll-contain`. A imagem header continua fixa no topo do card; o restante (pergunta, consenso, picker de créditos, opções) rola dentro do card.
- Remover o `slice(0, 4)` para mercados não-binários — exibir **todas** as opções. Como agora o card rola, qualquer quantidade cabe.
- Importante: como `framer-motion` usa `drag`, precisamos garantir que o scroll interno não conflite. Solução: aplicar `drag` apenas no wrapper externo (já é assim) e o scroll interno via `touch-action: pan-y` no container rolável só impacta o gesto vertical de pular. Vou alternar: o swipe **vertical para pular** continua funcionando porque o scroll interno só ativa quando o conteúdo realmente excede o card; quando não excede (binários SIM/NÃO), o gesto vertical do framer-motion continua livre.
- Para evitar conflito, o gesto de "pular ao arrastar para cima" passa a funcionar **apenas via botão "Pular este"** quando o conteúdo é rolável (multi-opção longo). Em binários (sem rolagem necessária), o swipe ↑ continua. O texto de ajuda no rodapé da página já menciona "↑ para PULAR · Toque no card para detalhes" — atualizo para "Em listas longas, use o botão Pular".

**2. `src/pages/Flow.tsx`**

- Aumentar levemente a altura do palco: `height: 'min(82vh, 720px)'` (era 78vh/640px) para dar mais respiro ao card e reduzir necessidade de scroll em casos médios.
- Pequeno ajuste no texto de dica do rodapé: "Arraste → SIM · ← NÃO · Toque para detalhes · Use o botão para pular em listas longas".

### Resultado visual

```text
Antes (multi-opção):              Depois:
┌──────────────────┐              ┌──────────────────┐
│ [imagem]         │              │ [imagem]         │
├──────────────────┤              ├──────────────────┤
│ Pergunta...      │              │ Pergunta...      │
│ Consenso ▓▓▓     │              │ Consenso ▓▓▓     │
│                  │              │ [50][100][250]   │
│  (gap vazio)     │              │ ┌──────────────┐ │
│                  │              │ │ Opção 1   0% │ │
│ [50][100][250]   │              │ │ Opção 2   0% │ │
│ ┌──────────┐     │              │ │ Opção 3   0% │ │
│ │ Opção 1  │     │              │ │ Opção 4   0% │ │ ↕ rola
│ │ Opção 2  │     │              │ │ Opção 5   0% │ │
│ │ Opção 3  │     │              │ │ Opção 6   0% │ │
│ │ Opção 4  │     │              │ └──────────────┘ │
│ (5,6 cortadas)   │              │ Pular este       │
└──────────────────┘              └──────────────────┘
```

### Considerações

- Sem mudanças em backend, RPCs ou tipos.
- Mantém gestos de swipe horizontal (SIM/NÃO em binários) e tap para detalhes.
- Em mercados com muitas opções, o usuário rola dentro do card e usa o botão "Pular este" quando quiser avançar.
- Preserva a estética dark fintech e a hierarquia visual.

