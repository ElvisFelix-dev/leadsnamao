import webpush from 'web-push'
import User from '../models/User.js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:contato@leadsnamao.com.br'

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('[PushNotificationService] VAPID keys não configuradas.')
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

/**
 * Envia uma notificação push para uma subscription específica.
 */
export async function sendPushNotification(subscription, payload = {}) {
  if (!subscription?.endpoint) {
    throw new Error('Subscription push inválida.')
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não configuradas.')
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'Leads Na Mão',
    body: payload.body || 'Você recebeu uma nova notificação.',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/logo192.png',
    url: payload.url || '/',
    tag: payload.tag || 'leads-na-mao',
    data: payload.data || {},
  })

  try {
    await webpush.sendNotification(subscription, notificationPayload)

    return {
      success: true,
    }
  } catch (error) {
    console.error('[PushNotificationService] Erro ao enviar push:', error)

    throw error
  }
}

/**
 * Envia uma notificação para um usuário específico.
 */
export async function sendPushToUser(userId, payload = {}) {
  if (!userId) {
    throw new Error('userId é obrigatório.')
  }

  const user = await User.findById(userId).select('pushSubscription')

  if (!user) {
    throw new Error('Usuário não encontrado.')
  }

  if (!user.pushSubscriptions?.endpoint) {
    return {
      success: false,
      skipped: true,
      reason: 'USER_WITHOUT_PUSH_SUBSCRIPTION',
    }
  }

  try {
    await sendPushNotification(user.pushSubscriptions, payload)

    return {
      success: true,
      userId: user._id,
    }
  } catch (error) {
    /**
     * 404 / 410 normalmente indicam que a subscription
     * deixou de ser válida.
     *
     * Nesse caso removemos a subscription do usuário.
     */
    if (error.statusCode === 404 || error.statusCode === 410) {
      await User.findByIdAndUpdate(userId, {
        $unset: {
          pushSubscription: 1,
        },
      })

      return {
        success: false,
        skipped: true,
        reason: 'INVALID_PUSH_SUBSCRIPTION',
      }
    }

    throw error
  }
}

/**
 * Envia uma notificação para vários usuários.
 */
export async function sendPushToUsers(userIds = [], payload = {}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return {
      success: true,
      sent: 0,
      failed: 0,
      skipped: 0,
    }
  }

  const users = await User.find({
    _id: { $in: userIds },
    'pushSubscription.endpoint': {
      $exists: true,
    },
  }).select('_id pushSubscription')

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const user of users) {
    try {
      const result = await sendPushToUser(user._id, payload)

      if (result.success) {
        sent++
      } else {
        skipped++
      }
    } catch (error) {
      failed++

      console.error(
        `[PushNotificationService] Erro ao enviar para ${user._id}:`,
        error,
      )
    }
  }

  skipped += userIds.length - users.length

  return {
    success: failed === 0,
    sent,
    failed,
    skipped,
  }
}

/**
 * Salva/atualiza a subscription push do usuário.
 */
export async function savePushSubscription(userId, subscription) {
  if (!userId) {
    throw new Error('userId é obrigatório.')
  }

  if (!subscription?.endpoint) {
    throw new Error('Subscription push inválida.')
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        pushSubscription: subscription,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select('_id pushSubscription')

  if (!user) {
    throw new Error('Usuário não encontrado.')
  }

  return user
}

/**
 * Remove a subscription push do usuário.
 */
export async function removePushSubscription(userId) {
  if (!userId) {
    throw new Error('userId é obrigatório.')
  }

  await User.findByIdAndUpdate(userId, {
    $unset: {
      pushSubscription: 1,
    },
  })

  return {
    success: true,
  }
}

/**
 * Retorna a chave pública VAPID.
 *
 * O frontend precisa dela para executar:
 *
 * pushManager.subscribe(...)
 */
export function getVapidPublicKey() {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID_PUBLIC_KEY não configurada.')
  }

  return VAPID_PUBLIC_KEY
}
