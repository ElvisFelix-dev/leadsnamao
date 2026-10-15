# Central de Notificações — Backend (etapa 1)

## O que foi adicionado

- `src/models/Notification.js`: histórico persistido, prioridade, vínculo com entidade, estado de leitura e chave para evitar duplicação.
- `src/service/notifications/notificationService.js`: criação central, emissão Socket.IO na sala `user_<id>`, envio Web Push e funções de consulta/leitura.
- `src/controllers/notificationController.js` e `src/routes/notificationRoutes.js`: endpoints autenticados para listar, contar não lidas, marcar como lida, marcar todas como lidas e excluir.
- `src/jobs/processVisitReminders.js`: verificação a cada 5 minutos dos lembretes de compromissos com `reminder.enabled`.
- Ajuste de `src/service/pushNotificationService.js`: passa a respeitar `User.pushSubscriptions` (lista de dispositivos), remove subscriptions expiradas e carrega VAPID de forma tardia.

## Endpoints

- `GET /api/notifications?page=1&limit=20&unreadOnly=true`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`

Todos exigem `Authorization: Bearer <token>`.

## Eventos conectados nesta etapa

- Novo lead: gestor(es); corretor quando atribuído; gestor quando ficar pendente de distribuição.
- Proposta enviada para aprovação: gestor(es).
- Proposta aprovada/rejeitada: corretor responsável.
- Venda concluída: corretor vendedor e gestor(es).
- Comissão paga: corretores beneficiários (vendedor/captador) e gestor(es).
- Compromisso criado na agenda/visita: responsável e gestor(es).
- Lembrete de compromisso: responsável e gestor(es), com deduplicação por compromisso e data.

## Configuração e observações

- Web Push usa `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e opcionalmente `VAPID_SUBJECT`, como já previsto no serviço anterior.
- O frontend não está incluído no ZIP recebido. Ainda falta ligar a interface da Central, o contador de não lidas, o listener Socket.IO `notification:new` e confirmar o comportamento do service worker na versão atual do frontend.
- O backend enviado não possui um modelo separado de tarefas/follow-ups nem um identificador explícito de imobiliária/tenant. Os lembretes implementados usam os compromissos existentes em `Visit`/Agenda. Antes de compartilhar um único banco entre várias imobiliárias, é necessário definir e aplicar o escopo de tenant para que gestores recebam apenas notificações da própria organização.
- `npm test` não executa testes automatizados neste projeto; o `package.json` contém apenas um placeholder. A validação realizada nesta etapa foi sintática (`node --check`) em todos os arquivos JavaScript.
