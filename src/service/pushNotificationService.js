import webpush from 'web-push'
import User from '../models/User.js'

let configuredPublicKey = null
let configuredPrivateKey = null

const getVapidConfig = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT || 'mailto:contato@leadsnamao.com.br',
})

const ensureVapidConfigured = () => {
  const { publicKey, privateKey, subject } = getVapidConfig()
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não configuradas.')
  }
  if (configuredPublicKey !== publicKey || configuredPrivateKey !== privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configuredPublicKey = publicKey
    configuredPrivateKey = privateKey
  }
  return { publicKey, privateKey }
}

export async function sendPushNotification(subscription, payload = {}) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Subscription push inválida.')
  }
  ensureVapidConfigured()

  const notificationPayload = JSON.stringify({
    title: payload.title || 'CRM NODUS',
    body: payload.body || 'Você recebeu uma nova notificação.',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/logo192.png',
    url: payload.url || '/',
    tag: payload.tag || 'crm-nodus',
    data: payload.data || {},
  })

  await webpush.sendNotification(subscription, notificationPayload)
  return { success: true }
}

export async function sendPushToUser(userId, payload = {}) {
  if (!userId) throw new Error('userId é obrigatório.')

  const user = await User.findById(userId).select('_id pushSubscriptions')
  if (!user) throw new Error('Usuário não encontrado.')

  const subscriptions = user.getPushSubscriptions
    ? user.getPushSubscriptions()
    : (user.pushSubscriptions || []).filter(
        (item) => item?.endpoint && item?.keys?.p256dh && item?.keys?.auth,
      )

  if (!subscriptions.length) {
    return { success: false, skipped: true, reason: 'USER_WITHOUT_PUSH_SUBSCRIPTION' }
  }

  let sent = 0
  let failed = 0
  let removed = 0

  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription, payload)
      sent += 1
      if (user.touchPushSubscription) {
        // Atualização de atividade sem interromper o envio se falhar.
        await user.touchPushSubscription(subscription.endpoint).catch(() => {})
      }
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        if (user.removePushSubscription) {
          await user.removePushSubscription(subscription.endpoint).catch(() => {})
        } else {
          user.pushSubscriptions = (user.pushSubscriptions || []).filter(
            (item) => item.endpoint !== subscription.endpoint,
          )
          await user.save().catch(() => {})
        }
        removed += 1
      } else {
        failed += 1
        console.error('[PushNotificationService] Erro ao enviar push:', error.message)
      }
    }
  }

  return {
    success: sent > 0 && failed === 0,
    userId: String(user._id),
    sent,
    failed,
    removed,
    skipped: sent === 0 && failed === 0,
    ...(sent === 0 && failed === 0 ? { reason: 'NO_VALID_PUSH_SUBSCRIPTION' } : {}),
  }
}

export async function sendPushToUsers(userIds = [], payload = {}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { success: true, sent: 0, failed: 0, skipped: 0 }
  }

  const ids = [...new Set(userIds.map((id) => String(id?._id || id)).filter(Boolean))]
  const results = await Promise.allSettled(ids.map((id) => sendPushToUser(id, payload)))
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const result of results) {
    if (result.status === 'rejected') failed += 1
    else if (result.value.sent > 0) sent += result.value.sent
    else skipped += 1
  }

  return { success: failed === 0, sent, failed, skipped }
}

export async function savePushSubscription(userId, subscription) {
  if (!userId) throw new Error('userId é obrigatório.')
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Subscription push inválida.')
  }

  const user = await User.findById(userId)
  if (!user) throw new Error('Usuário não encontrado.')

  if (typeof user.addPushSubscription === 'function') {
    await user.addPushSubscription(subscription)
  } else {
    user.pushSubscriptions = user.pushSubscriptions || []
    const index = user.pushSubscriptions.findIndex((item) => item.endpoint === subscription.endpoint)
    const data = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      lastUsedAt: new Date(),
    }
    if (index >= 0) user.pushSubscriptions[index] = { ...user.pushSubscriptions[index].toObject?.(), ...data }
    else user.pushSubscriptions.push({ ...data, createdAt: new Date() })
    await user.save()
  }

  return User.findById(userId).select('_id pushSubscriptions')
}

export async function removePushSubscription(userId, endpoint) {
  if (!userId) throw new Error('userId é obrigatório.')
  const user = await User.findById(userId)
  if (!user) throw new Error('Usuário não encontrado.')

  if (typeof user.removePushSubscription === 'function') {
    await user.removePushSubscription(endpoint)
  } else {
    user.pushSubscriptions = (user.pushSubscriptions || []).filter(
      (subscription) => endpoint && subscription.endpoint !== endpoint,
    )
    await user.save()
  }

  return { success: true }
}

export function getVapidPublicKey() {
  const { publicKey, privateKey } = getVapidConfig()
  if (!publicKey || !privateKey) throw new Error('Chaves VAPID não configuradas.')
  return publicKey
}
