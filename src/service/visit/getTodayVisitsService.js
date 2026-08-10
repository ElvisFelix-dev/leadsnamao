import Visit from '../../models/Visit.js'

import { VISIT_STATUS } from '../../constants/visitStatus.js'

export const getTodayVisitsService = async ({ user }) => {
  // ======================================
  // Início e fim do dia
  // ======================================

  const start = new Date()

  start.setHours(0, 0, 0, 0)

  const end = new Date()

  end.setHours(23, 59, 59, 999)

  // ======================================
  // Query
  // ======================================

  const query = {
    date: {
      $gte: start,
      $lte: end,
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
   * visualiza todas as visitas de hoje.
   *
   * Corretor:
   * visualiza somente suas próprias visitas.
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

  // ======================================
  // Retorno
  // ======================================

  return visits
}
