

# Push Notifications via Firebase Cloud Messaging

## Visão Geral

Implementar Web Push Notifications usando FCM para que usuários recebam alertas no navegador/dispositivo mesmo quando não estiverem com o app aberto. O fluxo: quando uma notificação é inserida no banco (missão concluída, mercado resolvido, etc.), uma Edge Function envia o push via FCM para os dispositivos registrados do usuário.

## Pré-requisitos do Usuário

Você precisará criar um projeto Firebase (gratuito) e fornecer:
1. **FCM Server Key** (ou Service Account JSON) — para a Edge Function enviar pushes
2. **Firebase Config** (apiKey, projectId, messagingSenderId, appId) — para o frontend registrar o dispositivo

Esses valores serão armazenados como secrets no backend.

## Etapas

### 1. Nova tabela `push_subscriptions`
Armazena tokens FCM vinculados a cada usuário:
- `id`, `user_id`, `fcm_token` (unique), `created_at`, `updated_at`
- RLS: usuários inserem/deletam seus próprios tokens

### 2. Frontend — Registrar token FCM
- Instalar `firebase` SDK (apenas módulos `firebase/app` e `firebase/messaging`)
- Criar hook `usePushNotifications` que:
  - Solicita permissão do navegador (`Notification.requestPermission()`)
  - Obtém token FCM via `getToken(messaging, { vapidKey, serviceWorkerRegistration })`
  - Salva token na tabela `push_subscriptions` (upsert por token)
  - Exibe banner discreto no Dashboard convidando a ativar notificações
- Atualizar `sw.js` para importar o Firebase Messaging SW e lidar com mensagens em background

### 3. Edge Function `send-push-notification`
- Recebida via Database Webhook (trigger no INSERT da tabela `notifications`)
- Busca tokens FCM do `user_id` da notificação
- Envia via FCM HTTP v1 API (`https://fcm.googleapis.com/v1/projects/{project}/messages:send`)
- Usa Service Account JWT para autenticação (sem SDK Firebase server-side)
- Remove tokens inválidos (erro `NOT_FOUND` ou `UNREGISTERED`)

### 4. Database Webhook
- Configurar webhook na tabela `notifications` (evento INSERT) apontando para a Edge Function `send-push-notification`
- Implementado via migration SQL usando `supabase_functions.http_request`

### 5. Configuração de Secrets
- `FCM_SERVICE_ACCOUNT` — JSON da Service Account do Firebase (para autenticação server-side)
- Config pública do Firebase (VAPID key, projectId, etc.) — armazenada no código frontend

## Arquitetura

```text
Missão concluída → INSERT notifications
                        │
                   DB Webhook trigger
                        │
                        ▼
            Edge Function send-push-notification
                        │
                   Busca push_subscriptions
                   do user_id
                        │
                        ▼
                FCM HTTP v1 API
                        │
                        ▼
              Browser/PWA push notification
```

## Detalhes Técnicos

- **Sem impacto na UX existente**: notificações in-app continuam funcionando normalmente
- **Opt-in**: usuário precisa aceitar o prompt do navegador
- **Cleanup automático**: tokens expirados/inválidos são removidos após erro do FCM
- **Compatibilidade**: funciona em Chrome, Edge, Firefox (desktop e Android). iOS Safari suporta desde iOS 16.4 em PWAs instaladas

