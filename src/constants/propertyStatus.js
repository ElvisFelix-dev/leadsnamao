// src/constants/propertyStatus.js

export const PROPERTY_STATUS = {
  AVAILABLE: 'disponivel',
  RESERVED: 'reservado',
  SOLD: 'vendido',
  RENTED: 'alugado',
  INACTIVE: 'inativo',
  ARCHIVED: 'arquivado', // ← ADICIONAR
  DRAFT: 'rascunho', // ← ADICIONAR (opcional)
  PUBLISHED: 'publicado', // ← ADICIONAR (opcional)
}

export const PROPERTY_STATUS_LIST = Object.values(PROPERTY_STATUS)
