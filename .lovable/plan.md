

## Promover FUTRA Flow no Hero

Trocar o botão principal "Explorar mercados" do hero pelo CTA do FUTRA Flow, dando muito mais visibilidade ao modo principal. "Explorar mercados" continua acessível, mas como botão secundário.

### Mudanças

**`src/pages/Index.tsx` — ambos os heros (com mercado em destaque e fallback):**

1. **Botão primário (gradient destacado)** passa a ser **"Jogar FUTRA Flow"** com ícone `Zap` → leva para `/flow` (ou `/login?redirect=/flow` se deslogado).
2. **Botão secundário (outline)** vira **"Explorar mercados"** → leva para `/browse`.
3. No hero de fallback (sem mercado), o terceiro botão "Criar conta grátis" só aparece para deslogados; logados veem só Flow + Explorar.

**Banner superior do FUTRA Flow (linhas 82-128):**
- Remover o banner duplicado da home — como o Flow agora ocupa o CTA primário do hero, o banner extra polui. Mantém a hierarquia limpa que o branding exige.

### Resultado visual

```text
Hero (logado):
┌──────────────────────────────────────────┐
│ Preveja o futuro.                        │
│ Construa sua reputação.                  │
│                                          │
│ A plataforma social de previsões...      │
│                                          │
│ [⚡ Jogar FUTRA Flow →] [Explorar mercados]│
│  ↑ gradiente neon         ↑ outline      │
└──────────────────────────────────────────┘
```

### Considerações

- Reaproveita os botões existentes do hero, sem componentes novos.
- Mantém `/browse` acessível em 1 clique no secundário + nos cards de seções (Trending, Popular, etc).
- Preserva o branding dark fintech: ícone `Zap` já usado no BottomNav e no banner — coerência total.
- Sem mudanças de backend, rotas ou tipos.

