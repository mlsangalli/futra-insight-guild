

# Implementacao dos Itens Pendentes — FUTRA

## Resumo

5 itens pendentes: (1) RLS explícito para user_roles, (2) componente ProtectedRoute, (3) redirect pós-signup para verificação de email, (4) edição de perfil, (5) SEO básico.

---

## 1. RLS user_roles — Policies INSERT/DELETE para admins

**Estado atual:** RLS está habilitado e bloqueia INSERT/UPDATE/DELETE por padrão (sem policies permissivas). Porém, admins também não conseguem gerenciar roles via cliente — precisam de policies explícitas.

**Migration SQL:**
```sql
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
```

---

## 2. ProtectedRoute — Guard reutilizável

**Criar `src/components/ProtectedRoute.tsx`:**
- Usa `useAuth()` para checar `user` e `loading`
- Se `loading`: mostra spinner
- Se `!user`: redireciona para `/login`
- Se autenticado: renderiza `children`

**Modificar `src/App.tsx`:**
- Envolver rotas `/dashboard`, `/create-market`, `/watchlist`, `/notifications` com `<ProtectedRoute>`
- Remover o guard manual (`if (!user) return <Navigate>`) de `Dashboard.tsx`

---

## 3. Redirect pós-signup — Página de verificação de email

**Criar `src/pages/VerifyEmail.tsx`:**
- Layout simples com icone de email, titulo "Verifique seu email", instrução para checar a caixa de entrada
- Botão "Reenviar email" que chama `supabase.auth.resend({ type: 'signup', email })`
- Link para `/login`

**Modificar `src/pages/Signup.tsx`:**
- Após signup bem-sucedido, redirecionar para `/verify-email?email=...` em vez de `/dashboard`

**Modificar `src/App.tsx`:**
- Adicionar rota `/verify-email` -> `VerifyEmail`

---

## 4. Edição de perfil — Modal/página no Dashboard

**Criar `src/components/EditProfileDialog.tsx`:**
- Dialog (modal) com formulário: display_name, bio, avatar_url (input de URL por enquanto), specialties (multi-select ou tags)
- Usa `supabase.from('profiles').update(...)` com os campos editáveis
- Chama `refreshProfile()` do AuthContext após salvar
- O trigger `protect_profile_fields` já garante que campos sensíveis não sejam alterados

**Modificar `src/pages/Dashboard.tsx`:**
- Adicionar botão "Editar perfil" ao lado do nome, que abre o dialog

---

## 5. SEO básico — index.html + favicon

**Modificar `index.html`:**
- Trocar `lang="en"` para `lang="pt-BR"`
- Atualizar OG image/description para PT-BR e remover referência ao Lovable
- Adicionar `<link rel="canonical" href="https://futra.app/" />`
- Adicionar favicon placeholder (letra F com gradient via SVG data URI)
- Adicionar JSON-LD WebApplication schema
- Remover `@Lovable` do twitter:site

---

## Arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | RLS policies INSERT/DELETE em user_roles |
| `src/components/ProtectedRoute.tsx` | Criar |
| `src/pages/VerifyEmail.tsx` | Criar |
| `src/components/EditProfileDialog.tsx` | Criar |
| `src/App.tsx` | Adicionar ProtectedRoute, rota /verify-email |
| `src/pages/Signup.tsx` | Redirect para /verify-email |
| `src/pages/Dashboard.tsx` | Remover guard manual, adicionar botão editar perfil |
| `index.html` | SEO completo |

