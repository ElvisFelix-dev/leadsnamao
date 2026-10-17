import { getSocketIO } from '../sockets/index.js'
import { notifyLeadCreated } from './leadService.js'

/**
 * Persiste a notificação no banco E emite via Socket.IO em tempo real.
 *
 * Regras:
 *  - Admins/managers SEMPRE recebem (sala "admins")
 *  - Corretor recebe SOMENTE se o lead estiver atribuído a ele
 *    (sala "broker_{id}")
 *  - Lead sem corretor → só admin (fila de distribuição)
 */
export async function notifyLeadRealtime(lead, { assignedTo = null } = {}) {
  if (!lead?._id) {
    console.warn('[Realtime] Lead sem _id, abortando notificação')
    return
  }

  const brokerId = assignedTo?._id || assignedTo || lead.assignedTo || null
  const io = getSocketIO()

  // 1. Persistir no banco (reaproveita sua função existente)
  try {
    await notifyLeadCreated(lead, {
      pendingDistribution: !brokerId,
      assignedTo: brokerId,
    })
    console.log(`💾 [Realtime] Notificação persistida: lead ${lead._id}`)
  } catch (err) {
    console.error('[Realtime] Erro ao persistir notificação:', err)
    // Não retorna — tenta emitir mesmo assim
  }

  // 2. Emitir em tempo real
  if (!io) {
    console.warn('[Realtime] Socket.IO não inicializado; emissão ignorada')
    return
  }

  const payload = {
    _id: String(lead._id),
    type: 'lead_created',
    priority: brokerId ? 'normal' : 'high',
    title: brokerId
      ? 'Novo lead atribuído a você'
      : 'Novo lead aguardando distribuição',
    message:
      `${lead.name || 'Lead'} • ${lead.phone || lead.email || ''}`.trim(),
    leadId: String(lead._id),
    assignedTo: brokerId ? String(brokerId) : null,
    link: `/lead-detail/${lead._id}`,
    createdAt: new Date().toISOString(),
  }

  io.to('admins').emit('notification:new', payload)

  if (brokerId) {
    io.to(`broker_${String(brokerId)}`).emit('notification:new', payload)
  }

  console.log(
    `📡 [Realtime] Lead ${lead._id} emitido → admins${brokerId ? ` + broker_${brokerId}` : ''}`,
  )
}
