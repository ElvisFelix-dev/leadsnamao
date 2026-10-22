# Migração inicial para CRM NODUS

## O que foi alterado
- Atualizados textos de marca em notificações, e-mails, logs e respostas de health check para `CRM NODUS`.
- Atualizados identificadores de origem internos de follow-up para `crm-nodus`.
- Adicionado suporte opcional a `variations` em cada etapa do modelo `LeadFollowUpTemplate`, preservando o campo legado `message`.
- O scheduler seleciona a variação ativa menos usada (considerando registros `sent` e `simulated`), usando a data de criação como desempate, e grava `templateVariationId`/`templateVariationLabel` no registro de follow-up.
- Adicionada validação de variações no endpoint de templates.
- Adicionados `isTestLead` e `whatsappConsent` ao modelo Lead. Os defaults são seguros (`false` e `unknown`).
- O agendador e o processador bloqueiam leads marcados como teste e leads sem consentimento explícito (`whatsappConsent.status === 'granted'`) ou com consentimento revogado.
- Mantido `LEAD_FOLLOWUPS_DRY_RUN=true` como padrão e a autorização explícita já existente para envio real.

## Importante antes de publicar
1. O frontend atual ainda precisa ser atualizado para cadastrar e editar `variations` e para capturar consentimento de WhatsApp de forma clara.
2. Leads existentes ficam com `whatsappConsent.status` ausente, portanto serão bloqueados até que o consentimento válido seja registrado. Não faça uma migração em massa atribuindo `granted` sem evidência de consentimento.
3. Os links e endereços antigos (`leadsnamao.netlify.app`, e-mail `@leadsnamao.com.br`, redes sociais e domínio `.local` de contatos internos) foram deliberadamente preservados para não quebrar links nem identidade técnica. Atualize-os quando os novos domínios e contas NODUS estiverem definidos.
4. Não foi feita renomeação de coleções MongoDB, nomes de variáveis de ambiente ou identificadores públicos de API para preservar compatibilidade.
5. Antes de ativar envio real, teste em ambiente isolado e confirme os controles de consentimento, respostas recebidas, deduplicação e leads de teste.

## Validação executada
`node --check` executado com sucesso nos arquivos JavaScript alterados.
