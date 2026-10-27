# CRM NODUS — Integração backend da Automação de Follow-ups

## Arquivos adicionados
- `src/service/leadFollowUpAutomationConfigService.js`: configurações padrão, validação de horários, janela, timezone e cálculo de datas.
- `src/controllers/leadFollowUpAutomationController.js`: GET/PUT da configuração e teste individual estritamente simulado.
- `src/routes/leadFollowUpAutomationRoutes.js`: endpoints protegidos por `protect` e `admin`.

## Arquivos alterados
- `src/models/LeadFollowUpTemplate.js`: persiste as regras globais no mesmo documento de templates existente.
- `src/service/leadFollowUpScheduler.js`: usa a configuração para calcular os horários de cada etapa.
- `src/jobs/processLeadFollowUps.js`: bloqueia envios reais quando a automação está pausada e mantém a janela de envio.
- `src/server.js`: monta `/api/lead-follow-up-automation`.

## Endpoints
- `GET /api/lead-follow-up-automation`
- `PUT /api/lead-follow-up-automation` com `{ "config": { enabled, timezone, windowStart, windowEnd, allowWeekends, steps } }`
- `POST /api/lead-follow-up-automation/test` com `{ "leadId": "...", "step": "D0", "dryRun": true }`

O endpoint de teste não cria follow-ups, não altera registros e não chama o gateway WhatsApp.

## Segurança / comportamento
- A configuração começa pausada (`enabled: false`).
- Salvar configuração não envia mensagens.
- Quando a automação está pausada, registros pendentes são preservados; envios reais ficam bloqueados.
- Quando a configuração ativa é salva, somente registros `pending` são reprogramados. Etapas desativadas cancelam somente os registros pendentes daquela etapa. Registros enviados, simulados, em processamento ou cancelados não são reprogramados.
- O worker continua verificando consentimento, resposta do lead, estado terminal, conversa/integracão e deduplicação conforme a lógica existente.
- A janela é validada no backend e aplicada também no worker, usando `America/Sao_Paulo`.

## Validação executada
`node --check` passou nos sete arquivos JS alterados/adicionados. Não foi possível executar teste integrado com MongoDB ou WA-AKG neste ambiente.
