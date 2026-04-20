

## Corrigir sobreposição visual no FUTRA Flow

A imagem mostra o card do topo deixando vazar o texto do próximo card por trás (pergunta duplicada, "Consenso:" duplicado, barra de progresso fantasma). Causa raiz: o card do fundo é renderizado no mesmo stack, totalmente sobreposto ao card do topo, mas com `opacity: 0.7` e o card do topo não tem fundo 100% opaco em todas as áreas.

### Mudanças

**1. `src/components/flow/FlowCard.tsx` — fundo do card 100% opaco**

- Trocar `bg-gradient-to-b from-surface-800 to-surface-900` (que pode renderizar com alpha em algumas configs do Tailwind) por uma cor sólida `bg-card` + camada de gradient decorativa por cima, garantindo que **nada** atrás vaze.
- Adicionar `bg-background` explicitamente como cor base no wrapper `<motion.div>` interno, para que mesmo em transições, o card oculte completamente o que está atrás.

**2. `src/pages/Flow.tsx` — não renderizar o próximo card visualmente**

Hoje o "next" card é renderizado escalonado atrás (estilo Tinder deck), mas isso só funciona se ele for **menor** que o card do topo. Como ambos usam `absolute inset-0`, o do fundo fica do mesmo tamanho e vaza. Duas opções (escolho a 1 por simplicidade e visual mais limpo):

- **Opção escolhida**: remover completamente o card de fundo visual. Manter apenas **prefetch invisível** (renderizar o `next` com `opacity-0 pointer-events-none` apenas para warm-up de imagem/dados) ou simplesmente não renderizar e confiar no React Query para já ter os dados em cache.
- Resultado: stage limpo, só 1 card visível por vez, transições suaves via `AnimatePresence`.

**3. Prefetch da imagem do próximo card (bônus de fluidez)**

- Em `Flow.tsx`, quando há `next?.image_url`, criar um `<link rel="preload" as="image" href={next.image_url} />` ou um `new Image().src = next.image_url` em `useEffect` para garantir que a imagem do próximo já esteja em cache quando virar o card do topo. Zero overhead visual.

### Resultado

```text
Antes:                          Depois:
┌──────────────────┐            ┌──────────────────┐
│ Quem será...     │            │ Quem será eleito │
│ Quem será o...   │ ← vaza     │ o melhor jogador │
│ Consenso: Messi  │            │ (Bola de Ouro)?  │
│ Consenso: Mes... │ ← vaza     │                  │
│ ▓▓▓▓             │            │ Consenso: Messi  │
│ ▓▓ (fantasma)    │            │ ▓▓▓▓▓▓░░░░       │
└──────────────────┘            └──────────────────┘
```

### Considerações

- Não muda lógica de gestos, contadores, streak ou créditos.
- Mantém `AnimatePresence` para transição entrar/sair do card.
- Não altera backend, RPCs ou tipos.
- Prefetch de imagem é silencioso e melhora a sensação de "instantâneo" entre cards.

