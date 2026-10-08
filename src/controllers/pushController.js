import {
  savePushSubscription,
  removePushSubscription,
  sendPushToUser,
  getVapidPublicKey,
} from '../service/pushNotificationService.js'

/*
=========================================
REGISTRAR PUSH SUBSCRIPTION
=========================================
*/

/**
 * Registra ou atualiza a subscription push
 * do usuário autenticado.
 *
 * POST /api/users/push/subscribe
 *
 * Body:
 * {
 *   endpoint: "...",
 *   expirationTime: null,
 *   keys: {
 *     p256dh: "...",
 *     auth: "..."
 *   }
 * }
 */
export const subscribePush = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const { subscription } = req.body

    if (!subscription?.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription push é obrigatória.',
      })
    }

    if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({
        success: false,
        message: 'Chaves da subscription push são obrigatórias.',
      })
    }

    const user = await savePushSubscription(userId, subscription)

    return res.status(200).json({
      success: true,
      message: 'Notificações push ativadas com sucesso.',
      data: {
        userId: user._id,
        subscribed: true,
      },
    })
  } catch (error) {
    console.error('[PushController] Erro ao registrar subscription:', error)

    return res.status(500).json({
      success: false,
      message: 'Não foi possível ativar as notificações push.',
    })
  }
}

/*
=========================================
REMOVER PUSH SUBSCRIPTION
=========================================
*/

/**
 * Remove uma subscription específica.
 *
 * DELETE /api/users/push/unsubscribe
 *
 * Body:
 * {
 *   endpoint: "..."
 * }
 */
export const unsubscribePush = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint da subscription é obrigatório.',
      })
    }

    await removePushSubscription(userId, endpoint)

    return res.status(200).json({
      success: true,
      message: 'Notificações push desativadas neste dispositivo.',
      data: {
        subscribed: false,
      },
    })
  } catch (error) {
    console.error('[PushController] Erro ao remover subscription:', error)

    return res.status(500).json({
      success: false,
      message: 'Não foi possível desativar as notificações push.',
    })
  }
}

/*
=========================================
VAPID PUBLIC KEY
=========================================
*/

/**
 * Retorna a chave pública VAPID.
 *
 * GET /api/users/push/vapid-public-key
 */
export const getPushPublicKey = async (req, res) => {
  try {
    const publicKey = getVapidPublicKey()

    return res.status(200).json({
      success: true,
      data: {
        publicKey,
      },
    })
  } catch (error) {
    console.error('[PushController] Erro ao obter VAPID public key:', error)

    return res.status(500).json({
      success: false,
      message: 'Chave pública VAPID não configurada.',
    })
  }
}

/*
=========================================
TESTAR PUSH
=========================================
*/

/**
 * Envia uma notificação de teste
 * para o usuário autenticado.
 *
 * POST /api/users/push/test
 *
 * Body opcional:
 * {
 *   title: "Teste",
 *   body: "Push funcionando!",
 *   url: "/dashboard"
 * }
 */
export const testPush = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const { title, body, url } = req.body || {}

    const result = await sendPushToUser(userId, {
      title: title || 'Leads Na Mão',

      body: body || 'As notificações push estão funcionando!',

      url: url || '/dashboard',

      tag: 'push-test',
    })

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        message:
          'Este usuário não possui uma subscription push ativa neste dispositivo.',
        reason: result.reason,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notificação de teste enviada com sucesso.',
      data: result,
    })
  } catch (error) {
    console.error('[PushController] Erro ao testar push:', error)

    return res.status(500).json({
      success: false,
      message: 'Não foi possível enviar a notificação de teste.',
    })
  }
}
