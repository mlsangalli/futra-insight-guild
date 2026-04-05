

# Aplicar Moodboard Visual ao FUTRA

## Análise do Moodboard
A imagem mostra um visual **sci-fi/futurista** com: fundo escuro com partículas/estrelas brilhantes, cards com glassmorphism mais pronunciado e bordas sutis com glow, percentuais grandes e destacados em verde/azul neon, efeitos de brilho e profundidade, globo de rede neural no hero.

## Mudanças Planejadas

### 1. Background com partículas animadas (CSS)
- Adicionar um campo de estrelas/partículas animadas no `body` via CSS puro (pseudo-elements com radial gradients e animação)
- Adicionar um sutil grid pattern de fundo nas sections

### 2. Hero Section redesenhada (`Index.tsx`)
- Adicionar efeito de glow radial atrás do título (gradiente circular neon blue/emerald)
- Percentual grande em destaque no hero (ex: "78% Yes" estilo moodboard) usando o mercado featured principal
- Layout mais dramático com o mercado principal em destaque grande à esquerda

### 3. MarketCard com visual glass aprimorado
- Bordas com gradiente sutil (border-image ou pseudo-element)
- Hover com glow mais intenso
- Percentual do líder em tamanho grande e cor neon (estilo "62% Yes" do moodboard)
- Background com gradiente sutil interno

### 4. VoteBar mais visual
- Barras mais grossas com glow effect
- Labels com percentuais maiores e mais bold
- Adicionar animação de pulse sutil na barra líder

### 5. CSS utilities e efeitos globais (`index.css`)
- Nova classe `.glass-card` com backdrop-blur mais forte, borda com gradiente, sombra neon
- Classe `.glow-text` para texto com text-shadow neon
- Classe `.particle-bg` com pseudo-elements para efeito de partículas
- Animação `@keyframes float` e `@keyframes twinkle` para elementos decorativos
- Glow mais intenso no `.glow-blue` e `.glow-emerald`

### 6. StatCard com efeito de brilho
- Borda com gradiente sutil
- Valor com glow text
- Ícone com cor neon

### 7. Header com glass mais pronunciado
- Aumentar blur do backdrop-filter
- Adicionar borda inferior com gradiente sutil

### 8. Tailwind config — novas animações
- `float`, `twinkle`, `glow-pulse` keyframes

## Arquivos a modificar
1. `src/index.css` — novas utilities CSS (glass-card, glow-text, particle effects, star field)
2. `tailwind.config.ts` — novas animações (float, twinkle)
3. `src/components/futra/MarketCard.tsx` — glass-card, percentual grande em destaque
4. `src/components/futra/VoteBar.tsx` — barras com glow, percentuais maiores
5. `src/components/futra/StatCard.tsx` — borda gradiente, glow text
6. `src/components/layout/Header.tsx` — glass mais forte
7. `src/pages/Index.tsx` — hero redesenhado com glow radial, mercado destaque grande, efeito de partículas no background

## Abordagem
Todas as mudanças são puramente visuais (CSS + Tailwind classes). Sem alterações em lógica, dados ou backend.

