/* ============================================================
   LEAD SOURCE TYPE
   Origem específica do Lead
============================================================ */

/**
 * Tipos de origem dos Leads.
 *
 * sourceType representa o canal específico
 * pelo qual o Lead entrou no CRM.
 */

export const LEAD_SOURCE_TYPE = {
  CRM: 'crm',

  COMPANY_SITE: 'company_site',

  BROKER_HOTSITE: 'broker_hotsite',

  META: 'meta',

  OLX: 'olx',

  ZAP: 'zap',

  CSV: 'csv',

  MANUAL: 'manual',
}

/* ============================================================
   LISTA DE ORIGENS
============================================================ */

export const LEAD_SOURCE_TYPE_LIST = Object.values(LEAD_SOURCE_TYPE)

/* ============================================================
   LABELS
============================================================ */

export const LEAD_SOURCE_TYPE_LABELS = {
  [LEAD_SOURCE_TYPE.CRM]: 'CRM',

  [LEAD_SOURCE_TYPE.COMPANY_SITE]: 'Site da Imobiliária',

  [LEAD_SOURCE_TYPE.BROKER_HOTSITE]: 'Hotsite do Corretor',

  [LEAD_SOURCE_TYPE.META]: 'Meta Ads',

  [LEAD_SOURCE_TYPE.OLX]: 'OLX',

  [LEAD_SOURCE_TYPE.ZAP]: 'ZAP Imóveis',

  [LEAD_SOURCE_TYPE.CSV]: 'Importação CSV',

  [LEAD_SOURCE_TYPE.MANUAL]: 'Cadastro Manual',
}

/* ============================================================
   HELPERS
============================================================ */

/**
 * Verifica se o sourceType é válido.
 */
export function isValidLeadSourceType(value) {
  return LEAD_SOURCE_TYPE_LIST.includes(value)
}

/**
 * Retorna o label amigável da origem.
 */
export function getLeadSourceTypeLabel(value) {
  return LEAD_SOURCE_TYPE_LABELS[value] || value || 'Desconhecido'
}

/* ============================================================
   ORIGENS PÚBLICAS
============================================================ */

/**
 * Origens que podem gerar Lead através
 * da área pública da imobiliária.
 */
export const PUBLIC_LEAD_SOURCE_TYPES = [
  LEAD_SOURCE_TYPE.COMPANY_SITE,

  LEAD_SOURCE_TYPE.BROKER_HOTSITE,
]

/* ============================================================
   ORIGENS QUE POSSUEM CORRETOR DE ORIGEM
============================================================ */

/**
 * Essas origens podem possuir sourceBroker.
 */
export const BROKER_ORIGIN_SOURCE_TYPES = [LEAD_SOURCE_TYPE.BROKER_HOTSITE]

/* ============================================================
   ORIGENS QUE AGUARDAM DISTRIBUIÇÃO
============================================================ */

/**
 * Leads dessas origens entram sem assignedTo
 * e ficam disponíveis para o Admin distribuir.
 */
export const LEAD_SOURCE_TYPES_REQUIRING_ASSIGNMENT = [
  LEAD_SOURCE_TYPE.COMPANY_SITE,

  LEAD_SOURCE_TYPE.META,

  LEAD_SOURCE_TYPE.OLX,

  LEAD_SOURCE_TYPE.ZAP,

  LEAD_SOURCE_TYPE.CSV,
]

/* ============================================================
   ORIGENS COM ATRIBUIÇÃO AUTOMÁTICA
============================================================ */

/**
 * Leads dessas origens podem ser atribuídos
 * automaticamente ao corretor de origem.
 */
export const LEAD_SOURCE_TYPES_AUTO_ASSIGN = [LEAD_SOURCE_TYPE.BROKER_HOTSITE]

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  LEAD_SOURCE_TYPE,

  LEAD_SOURCE_TYPE_LIST,

  LEAD_SOURCE_TYPE_LABELS,

  PUBLIC_LEAD_SOURCE_TYPES,

  BROKER_ORIGIN_SOURCE_TYPES,

  LEAD_SOURCE_TYPES_REQUIRING_ASSIGNMENT,

  LEAD_SOURCE_TYPES_AUTO_ASSIGN,

  isValidLeadSourceType,

  getLeadSourceTypeLabel,
}
