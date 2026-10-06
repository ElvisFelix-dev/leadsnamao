export function normalizePhone(value) {
  if (!value) return ''

  const phone = String(value).replace(/\D/g, '')

  if (!phone) return ''

  if (phone.startsWith('55')) {
    return phone
  }

  if (phone.length === 10 || phone.length === 11) {
    return `55${phone}`
  }

  return phone
}
