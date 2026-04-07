

## Páginas Institucionais + Footer Funcional

### Resumo
Criar 4 páginas (Sobre, Termos, Privacidade, Contato) com conteúdo em PT-BR, atualizar o Footer para linkar corretamente, e registrar as rotas no App.tsx.

### Arquivos a criar
1. **`src/pages/About.tsx`** — Missão, visão, proposta de valor da FUTRA. Layout `max-w-3xl`, glass-card, SEO.
2. **`src/pages/Terms.tsx`** — Termos de uso: créditos virtuais (sem dinheiro real), conduta, propriedade intelectual.
3. **`src/pages/Privacy.tsx`** — Política de privacidade LGPD-compatível: dados coletados, cookies, direitos do titular, contato DPO em **team@futra.com.br**.
4. **`src/pages/Contact.tsx`** — Email **team@futra.com.br** em destaque + formulário visual com `mailto:team@futra.com.br` no submit.

### Arquivos a editar
5. **`src/App.tsx`** — Adicionar lazy imports e rotas `/about`, `/terms`, `/privacy`, `/contact` (públicas).
6. **`src/components/layout/Footer.tsx`** — Trocar `<a href="#">` por `<Link to="/about">`, `/terms`, `/privacy`, `/contact`.
7. **`public/sitemap.xml`** — Adicionar as 4 URLs.

### Padrão visual
- Todas usam `<Layout>` + `<SEO>` com título/descrição PT-BR
- Container `max-w-3xl mx-auto`, seções em `glass-card rounded-2xl p-6 sm:p-8`
- Headings `h1 text-2xl font-display font-bold`, `h2 text-lg font-semibold`
- Corpo `text-muted-foreground leading-relaxed`
- Email de contato sempre: **team@futra.com.br**

