
# Fix: Tooltip na pergunta + Form pré-preenchido ao editar

## Problemas
1. **Pergunta truncada** — a coluna mostra `max-w-[250px] truncate` sem tooltip, impossível ler a pergunta inteira
2. **Form não pré-preenche ao editar** — `reset()` é chamado no `onOpenChange` do Dialog, mas nesse momento a closure do `market` prop pode estar desatualizada (race condition entre state updates)

## Correções

### 1. Tooltip na pergunta da tabela
Na linha da tabela de mercados, envolver o texto da pergunta com o componente `Tooltip` (já existe em `@/components/ui/tooltip`), mostrando a pergunta completa ao passar o mouse.

### 2. useEffect para pré-preencher o form
No `MarketFormDialog`, substituir a chamada `reset()` no `onOpenChange` por um `useEffect` que dispara quando `open` ou `market` mudam. Isso garante que quando o dialog abre com um mercado selecionado, os campos são preenchidos corretamente.

## Arquivo modificado

```
src/pages/admin/AdminMarkets.tsx
```

### Mudanças específicas:
- **Linha 518**: Adicionar `Tooltip` com `title` mostrando `m.question` completa
- **Linha 1039**: Remover `reset()` do `onOpenChange`, adicionar `useEffect(() => { if (open) reset(); }, [open, market])` dentro do componente
