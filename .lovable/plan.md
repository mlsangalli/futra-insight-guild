

# OG Cards Compartilháveis — Análise e Plano

## Estado Atual

Tudo já está implementado:

1. **Edge Function `og-image`** — já gera 3 tipos de cards SVG (1200×630):
   - **Market (Odds)**: pergunta, opções com barras, percentuais, participantes
   - **Win (Resultado)**: selo ACERTOU/ERROU, recompensa FC, score delta, perfil do previsor
   - **Profile**: avatar, nome, rank, score, precisão, streak, conquistas

2. **Meta tags OG** — já integradas via `<SEO>` component:
   - `MarketDetail.tsx`: usa `og-image?id={marketId}` como `ogImage`
   - `Profile.tsx`: usa `og-image?type=profile&username={username}` como `ogImage`

3. **ShareButton** — já presente em:
   - `MarketCard.tsx` (cards na listagem)
   - `MarketDetail.tsx` (página do mercado)
   - `Profile.tsx` (perfil do usuário)
   - `RecentResultsCard.tsx` (resultados de previsões ganhas)

4. **Cache** — já configurado com `Cache-Control: public, max-age=3600`

5. **Estilo visual** — consistente com identidade Futra (fundo #060B18, acentos neon, gradientes)

## Conclusão

**Não há nada a implementar.** O sistema de OG Cards compartilháveis já está completo e funcional com os 3 tipos de cards solicitados, integração com ShareButton, meta tags OG nas páginas relevantes, e cache de performance.

A única melhoria possível seria converter os SVGs para PNG (para compatibilidade universal com todas as plataformas sociais, já que algumas não renderizam SVG em previews), mas isso requer uma dependência de renderização como `@resvg/resvg-wasm` no Edge Function.

