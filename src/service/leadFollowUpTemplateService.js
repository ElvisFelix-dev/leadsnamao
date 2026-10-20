export const FOLLOW_UP_TEMPLATE_DEFAULTS = [
  {
    step: 'D0',
    label: 'D0 · Primeiro contato',
    enabled: true,
    message: 'Olá, {nome}! Recebemos seu interesse{referencia_imovel} e estamos à disposição para ajudar. Você ainda está procurando um imóvel?',
  },
  {
    step: 'D1',
    label: 'D1 · Após 1 dia',
    enabled: true,
    message: 'Olá, {nome}! Passando para saber se você conseguiu avançar na busca{referencia_imovel}. Posso ajudar com as opções disponíveis?',
  },
  {
    step: 'D3',
    label: 'D3 · Após 3 dias',
    enabled: true,
    message: 'Olá, {nome}! Gostaria de saber se ainda podemos ajudar na sua busca{referencia_imovel}. Se suas preferências mudaram, podemos considerar isso também.',
  },
  {
    step: 'D5',
    label: 'D5 · Após 5 dias',
    enabled: true,
    message: 'Olá, {nome}! Continuo à disposição para ajudar você a encontrar um imóvel que faça sentido para suas necessidades. Podemos conversar?',
  },
  {
    step: 'D7',
    label: 'D7 · Após 7 dias',
    enabled: true,
    message: 'Olá, {nome}! Ainda podemos ajudar na sua busca por um imóvel. Se quiser continuar, basta responder a esta mensagem.',
  },
  {
    step: 'D10',
    label: 'D10 · Último contato',
    enabled: true,
    message: 'Olá, {nome}! Este é nosso último contato automático por enquanto. Se ainda estiver procurando um imóvel, pode responder por aqui que teremos prazer em ajudar.',
  },
]

const getProperty = (lead) => {
  if (!lead?.property || typeof lead.property !== 'object') return null
  return lead.property
}

export const getTemplateVariables = (lead = {}) => {
  const property = getProperty(lead)
  const fullName = String(lead.name || '').trim()
  const firstName = fullName.split(/\s+/)[0] || 'tudo bem'
  const propertyName = String(property?.name || '').trim()
  const propertyCode = String(property?.code || '').trim()
  const district = String(property?.location?.district || '').trim()
  const city = String(property?.location?.city || '').trim()

  const propertyParts = []
  if (propertyName) propertyParts.push(propertyName)
  else if (propertyCode) propertyParts.push(`código ${propertyCode}`)
  if (district) propertyParts.push(`no bairro ${district}`)
  if (city) propertyParts.push(`em ${city}`)

  const propertyReference = propertyParts.length
    ? ` sobre o imóvel ${propertyParts.join(', ')}`
    : ''

  return {
    nome: firstName,
    nome_completo: fullName || firstName,
    imovel: propertyName || propertyCode || '',
    codigo_imovel: propertyCode,
    bairro: district,
    cidade: city,
    referencia_imovel: propertyReference,
  }
}

export const renderFollowUpTemplate = (template, lead) => {
  const variables = getTemplateVariables(lead)
  return String(template || '').replace(/\{([a-zA-Z_]+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key]
    }
    return match
  }).replace(/[ \t]{2,}/g, ' ').trim()
}

export const getTemplateText = (templates, step) => {
  const found = templates?.find((item) => item.step === step && item.enabled !== false)
  if (found) return found.message
  const fallback = FOLLOW_UP_TEMPLATE_DEFAULTS.find((item) => item.step === step)
  return fallback?.message || ''
}
