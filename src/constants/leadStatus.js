// backend/constants/leadStatus.js

export const LEAD_STATUS = {
  NEW: 'novo',
  IN_PROGRESS: 'em_andamento',
  CONVERTED: 'convertido',
  LOST: 'perdido',
  CONTACTED: 'contatado', // ← ADICIONAR
  NEGOTIATION: 'em_negociacao', // ← ADICIONAR
  ARCHIVED: 'arquivado', // ← ADICIONAR
}

export const LEAD_STATUS_LIST = Object.values(LEAD_STATUS)
