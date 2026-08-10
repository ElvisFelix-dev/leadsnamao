import Visit from '../../models/Visit.js'

import { VISIT_STATUS } from '../../constants/visitStatus.js'

export const getUpcomingVisitsService = async ({ user, limit = 5 }) => {
  // ======================================
  // Data atual
  // ======================================

  const now = new Date()

  // ======================================
  // Normalizar limite
  // ======================================

  const currentLimit = Math.min(Math.max(Number(limit) || 5, 1), 50)

  // ======================================
  // Query
  // ======================================

  const query = {
    date: {
      $gte: now,
    },

    status: {
      $in: [VISIT_STATUS.SCHEDULED, VISIT_STATUS.CONFIRMED],
    },
  }

  // ======================================
  // Permissão
  // ======================================

  const isAdmin = user?.isAdmin === true || user?.role === 'admin'

  /*
   * Admin:
   * visualiza as próximas visitas
   * de toda a plataforma.
   *
   * Corretor:
   * visualiza somente suas próprias
   * próximas visitas.
   */

  if (!isAdmin) {
    query.broker = user._id
  }

  // ======================================
  // Buscar visitas
  // ======================================

  const visits = await Visit.find(query)
    .populate('lead', 'name phone email region stage status priority')
    .populate('property', 'name code address images location price')
    .populate('broker', 'name email avatar phone')
    .populate('createdBy', 'name email avatar')
    .sort({
      date: 1,
    })
    .limit(currentLimit)

  // ======================================
  // Retorno
  // ======================================

  return visits
}
