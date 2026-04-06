

# Painel Administrativo FUTRA - Plano de Implementação

## Visao Geral

Construir uma area administrativa completa em `/admin` com sidebar, CRUD funcional, dashboard com metricas reais, gestao de mercados/categorias/conteudo/usuarios/logs, protegida por role `admin` no backend e frontend.

---

## Fase 1: Banco de Dados (Migration SQL)

Criar uma unica migration com:

**Novas tabelas:**
- `categories` (id, name, slug, description, active, created_at, updated_at)
- `site_content` (id, section_key unique, title, subtitle, body, cta_label, cta_link, active, created_at, updated_at)
- `faq_items` (id, question, answer, order_index, active, created_at, updated_at)
- `admin_logs` (id, admin_user_id references auth.users, action_type, entity_type, entity_id, description, created_at)

**RLS para todas as novas tabelas:**
- `categories`: SELECT publico, INSERT/UPDATE/DELETE apenas admins (usando `has_role`)
- `site_content`: SELECT publico, INSERT/UPDATE/DELETE apenas admins
- `faq_items`: SELECT publico, INSERT/UPDATE/DELETE apenas admins
- `admin_logs`: SELECT/INSERT apenas admins, sem UPDATE/DELETE

**Nota:** As tabelas `profiles`, `markets`, `user_roles` e `predictions` ja existem e nao serao recriadas. A migration apenas adicionara novas policies de admin para UPDATE/DELETE em `markets` e SELECT amplo em `profiles` e `predictions` para admins.

**Edge function `admin-actions`:** Para operacoes privilegiadas (promover/remover admin, deletar mercado, bloquear usuario) usando service_role key, com verificacao de role do chamador.

---

## Fase 2: Seguranca e Roteamento

**Componente `AdminGuard`:**
- Verifica autenticacao (redireciona para `/login` se nao autenticado)
- Consulta `user_roles` para verificar role `admin`
- Redireciona para pagina 403 se nao for admin
- Loading state enquanto verifica

**Componente `AdminLayout`:**
- Sidebar fixa com navegacao entre secoes (Dashboard, Mercados, Categorias, Conteudo, Usuarios, Logs)
- Usa `SidebarProvider` do shadcn
- Header com nome do admin e botao de sair
- Design dark fintech consistente com FUTRA

**Hook `useAdmin`:**
- Retorna `isAdmin`, `loading`
- Usa `has_role` RPC ou query em `user_roles`

**Rotas no App.tsx:**
- `/admin` -> Dashboard
- `/admin/markets` -> Gestao de mercados
- `/admin/categories` -> Gestao de categorias
- `/admin/content` -> Conteudo do site
- `/admin/users` -> Gestao de usuarios
- `/admin/logs` -> Logs administrativos

**Ocultar links admin:** O Header e BottomNav nao mostrarao nenhum link para `/admin` a nao ser que `isAdmin` seja true.

---

## Fase 3: Paginas do Admin

### 3.1 Dashboard (`/admin`)
- Cards com metricas: total usuarios, total mercados, mercados ativos/fechados, categorias, conteudos publicados
- Queries diretas via Supabase com `.select('*', { count: 'exact', head: true })`
- Tabela de atividades recentes (ultimos admin_logs)
- Ultimos mercados criados/editados

### 3.2 Gestao de Mercados (`/admin/markets`)
- Tabela paginada com busca por nome, filtro por categoria/status
- Dialog/Sheet para criar/editar mercado (formulario com Zod validation)
- Botoes: editar, excluir (com confirmacao AlertDialog), duplicar, toggle destaque, alterar status
- Mutations via TanStack Query + Supabase
- Operacoes de admin (status, featured, trending, delete) via edge function

### 3.3 Gestao de Categorias (`/admin/categories`)
- CRUD com tabela simples
- Toggle ativo/inativo
- Alerta antes de excluir se houver mercados vinculados (verificacao client-side)

### 3.4 Conteudo do Site (`/admin/content`)
- Tabs: "Secoes do Site" e "FAQs"
- Secoes: editar por section_key (hero, about, how-it-works, etc.)
- FAQs: lista reordenavel, criar/editar/excluir
- Toggle ativo/inativo

### 3.5 Gestao de Usuarios (`/admin/users`)
- Tabela com todos os profiles + join com user_roles
- Promover/remover admin (via edge function)
- Confirmacao forte antes de remover proprio acesso admin

### 3.6 Logs (`/admin/logs`)
- Tabela paginada com filtros por action_type e entity_type
- Exibe admin, acao, entidade e timestamp
- Read-only

---

## Fase 4: Logging Automatico

- Hook `useAdminLog` que insere em `admin_logs` apos cada mutacao bem-sucedida
- Registra: criacao, edicao, exclusao de mercados, categorias, conteudo, FAQs, alteracoes de role

---

## Estrutura de Arquivos

```text
src/
  hooks/useAdmin.ts
  hooks/useAdminLog.ts
  components/admin/
    AdminGuard.tsx
    AdminLayout.tsx
    AdminSidebar.tsx
    AdminMetricCard.tsx
    AdminDataTable.tsx
    MarketForm.tsx
    CategoryForm.tsx
    ContentForm.tsx
    FaqForm.tsx
  pages/admin/
    AdminDashboard.tsx
    AdminMarkets.tsx
    AdminCategories.tsx
    AdminContent.tsx
    AdminUsers.tsx
    AdminLogs.tsx
    Forbidden.tsx
supabase/
  migrations/XXXX_admin_tables.sql
  functions/admin-actions/index.ts
```

---

## Detalhes Tecnicos

- **Paginacao:** Implementada com `.range(from, to)` do Supabase + state local de pagina
- **Busca:** Input com debounce de 300ms + `.ilike('question', '%term%')`
- **Formularios:** React Hook Form + Zod schemas
- **Mutations:** `useMutation` do TanStack Query com `invalidateQueries` apos sucesso
- **Edge function:** Usa `SUPABASE_SERVICE_ROLE_KEY` para operacoes privilegiadas (insert em user_roles, delete em markets, etc.) com verificacao de que o chamador e admin
- **Design:** Reutiliza CSS variables do tema dark FUTRA, cards com `bg-card`, borders com `border`, badges com cores do sistema

