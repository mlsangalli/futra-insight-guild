

# Imagens por Mercado — Plano de Implementação

## Resumo

Adicionar suporte a imagens (thumbnail) nos market cards, com upload via admin, fallback por categoria, e exibição responsiva estilo Polymarket.

## 1. Migration: adicionar colunas de imagem na tabela `markets`

```sql
ALTER TABLE public.markets
  ADD COLUMN image_url text DEFAULT '',
  ADD COLUMN image_alt text DEFAULT '',
  ADD COLUMN image_source text DEFAULT '';
```

Campos simples — sem storage bucket por enquanto. O admin insere uma URL externa (ou futuramente URL de um bucket). Isso mantém a implementação simples e funcional.

## 2. Storage Bucket para uploads de imagem

Criar bucket público `market-images` para permitir upload direto de imagens pelo admin:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('market-images', 'market-images', true);

CREATE POLICY "Admins can upload market images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view market images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'market-images');

CREATE POLICY "Admins can delete market images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));
```

## 3. Edge Function `edit_market` — suporte ao campo `image_url`

Adicionar `image_url`, `image_alt`, `image_source` ao `updatePayload` no case `edit_market` do `admin-actions/index.ts`.

## 4. Componente `MarketThumbnail`

Novo componente em `src/components/futra/MarketThumbnail.tsx`:
- Recebe `imageUrl`, `category`, `alt`
- Se `imageUrl` existe: exibe imagem com `object-cover`, cantos arredondados, lazy loading, fade-in on load
- Se não: exibe fallback visual por categoria (ícone + gradiente sutil baseado na categoria)
- Aspect ratio 16:9 compacto via CSS
- Estado de erro: fallback automático para ícone de categoria

## 5. Atualizar `MarketCard`

Inserir `MarketThumbnail` no topo do card, antes dos badges. Layout:

```text
┌──────────────────────────┐
│  [Imagem / Fallback]     │  ← 16:9, rounded-t-xl
├──────────────────────────┤
│ 🏛️ Política  · Aberto   │
│ Pergunta do mercado?     │
│         72%  SIM         │
│ ████████░░ VoteBar       │
│ 👥 1.2K  💰 5K  ⏱ 3d    │
└──────────────────────────┘
```

- Adicionar `imageUrl` ao tipo `MarketCardData`
- Quando não há imagem, o card continua visualmente limpo com fallback por categoria

## 6. Atualizar `MarketFormDialog` no Admin

Adicionar seção de imagem no formulário de edição/criação:
- Campo de URL de imagem (input text)
- Botão de upload de arquivo (usa bucket `market-images`)
- Preview da imagem atual
- Campos de alt text e fonte da imagem

## 7. Atualizar todos os `dbToCard` mappers

Adicionar `imageUrl: m.image_url || ''` nos 5 arquivos que possuem `dbToCard`:
- `Index.tsx`, `Browse.tsx`, `Category.tsx`, `Watchlist.tsx`, `SearchResults.tsx`

## 8. Atualizar `MarketDetail` page

Exibir imagem maior no topo da página de detalhe do mercado, quando disponível.

## Fallbacks por Categoria

| Categoria | Cor de fundo | Ícone |
|-----------|-------------|-------|
| politics | indigo | 🏛️ |
| economy | emerald | 📊 |
| crypto | amber | ₿ |
| football | green | ⚽ |
| culture | purple | 🎬 |
| technology | cyan | 🤖 |

## Arquivos

```text
Criar:
├── supabase/migrations/  — colunas image_url, image_alt, image_source + bucket
├── src/components/futra/MarketThumbnail.tsx

Editar:
├── supabase/functions/admin-actions/index.ts  — campos de imagem no edit_market
├── src/types/index.ts                         — imageUrl no MarketCardData
├── src/components/futra/MarketCard.tsx         — usar MarketThumbnail
├── src/pages/admin/AdminMarkets.tsx            — upload/URL no form
├── src/pages/MarketDetail.tsx                  — imagem no detalhe
├── src/pages/Index.tsx                         — dbToCard com imageUrl
├── src/pages/Browse.tsx                        — dbToCard com imageUrl
├── src/pages/Category.tsx                      — dbToCard com imageUrl
├── src/pages/Watchlist.tsx                     — dbToCard com imageUrl
├── src/pages/SearchResults.tsx                 — dbToCard com imageUrl
```

## Performance

- Lazy loading nativo (`loading="lazy"`)
- `decoding="async"` em todas as imagens
- Aspect ratio CSS fixo para evitar layout shift
- Fade-in com transition CSS on load

