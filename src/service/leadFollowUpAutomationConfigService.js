import LeadFollowUpTemplate from '../models/LeadFollowUpTemplate.js'

export const DEFAULT_FOLLOW_UP_SETTINGS = {
  enabled: false,
  timezone: 'America/Sao_Paulo',
  windowStart: '09:00',
  windowEnd: '18:00',
  allowWeekends: true,
  schedule: [
    { step: 'D0', enabled: true, delayMinutes: 5, time: '09:00' },
    { step: 'D1', enabled: true, delayMinutes: 1440, time: '09:00' },
    { step: 'D3', enabled: true, delayMinutes: 4320, time: '10:30' },
    { step: 'D5', enabled: true, delayMinutes: 7200, time: '14:00' },
    { step: 'D7', enabled: true, delayMinutes: 10080, time: '15:00' },
    { step: 'D10', enabled: true, delayMinutes: 14400, time: '16:30' },
  ],
}

const STEP_DAY_OFFSETS = { D0: 0, D1: 1, D3: 3, D5: 5, D7: 7, D10: 10 }
const timeToMinutes = (value) => {
  const [h, m] = String(value || '').split(':').map(Number)
  return h * 60 + m
}
const getParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.map((p) => [p.type, p.value]))
}
const localToUtc = (year, month, day, hour, minute, timezone) => {
  // Resolve wall-clock time without relying on the host machine timezone.
  const target = Date.UTC(year, month - 1, day, hour, minute, 0)
  let guess = target
  for (let i = 0; i < 3; i += 1) {
    const p = getParts(new Date(guess), timezone)
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
    guess += target - represented
  }
  return new Date(guess)
}
const addCalendarDays = (dateParts, days) => {
  const d = new Date(Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day) + days))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}
const isWeekend = (date, timezone) => {
  const p = getParts(date, timezone)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date)
  return weekday === 'Sat' || weekday === 'Sun'
}
export const normalizeFollowUpSettings = (incoming = {}) => {
  const merged = { ...DEFAULT_FOLLOW_UP_SETTINGS, ...incoming }
  const byStep = new Map((Array.isArray(incoming.schedule) ? incoming.schedule : []).map((x) => [x.step, x]))
  merged.schedule = DEFAULT_FOLLOW_UP_SETTINGS.schedule.map((fallback) => ({
    ...fallback, ...(byStep.get(fallback.step) || {}),
  }))
  if (!/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(merged.timezone) ||
      !['America/Sao_Paulo'].includes(merged.timezone)) {
    throw new Error('Fuso horário inválido. Use America/Sao_Paulo.')
  }
  const validTime = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
  if (!validTime(merged.windowStart) || !validTime(merged.windowEnd) ||
      timeToMinutes(merged.windowStart) >= timeToMinutes(merged.windowEnd)) {
    throw new Error('A janela de envio precisa ter horários válidos e o início anterior ao fim.')
  }
  merged.schedule = merged.schedule.map((item) => {
    if (!validTime(item.time) || !Number.isFinite(Number(item.delayMinutes)) ||
      Number(item.delayMinutes) < 0 || Number(item.delayMinutes) > 43200) {
      throw new Error(`Configuração de horário inválida na etapa ${item.step}.`)
    }
    if (timeToMinutes(item.time) < timeToMinutes(merged.windowStart) ||
      timeToMinutes(item.time) >= timeToMinutes(merged.windowEnd)) {
      throw new Error(`O horário de ${item.step} deve estar dentro da janela permitida.`)
    }
    return { step: item.step, enabled: item.enabled !== false, delayMinutes: Number(item.delayMinutes), time: item.time }
  })
  merged.enabled = merged.enabled === true
  merged.allowWeekends = merged.allowWeekends !== false
  return merged
}
export const getFollowUpSettings = async () => {
  const doc = await LeadFollowUpTemplate.findOne({ key: 'default' }).select('settings').lean()
  return normalizeFollowUpSettings(doc?.settings || {})
}
export const isAllowedFollowUpTime = (date, settings) => {
  const p = getParts(date, settings.timezone)
  const minute = Number(p.hour) * 60 + Number(p.minute)
  if (minute < timeToMinutes(settings.windowStart) || minute >= timeToMinutes(settings.windowEnd)) return false
  if (!settings.allowWeekends && isWeekend(date, settings.timezone)) return false
  return true
}
export const nextAllowedFollowUpTime = (date, settings) => {
  let candidate = new Date(date)
  for (let i = 0; i < 10; i += 1) {
    const p = getParts(candidate, settings.timezone)
    const minute = Number(p.hour) * 60 + Number(p.minute)
    if (!settings.allowWeekends && isWeekend(candidate, settings.timezone)) {
      const day = addCalendarDays(p, 1)
      candidate = localToUtc(day.year, day.month, day.day, ...settings.windowStart.split(':').map(Number), settings.timezone)
      continue
    }
    if (minute < timeToMinutes(settings.windowStart)) {
      candidate = localToUtc(Number(p.year), Number(p.month), Number(p.day), ...settings.windowStart.split(':').map(Number), settings.timezone)
      continue
    }
    if (minute >= timeToMinutes(settings.windowEnd)) {
      const day = addCalendarDays(p, 1)
      candidate = localToUtc(day.year, day.month, day.day, ...settings.windowStart.split(':').map(Number), settings.timezone)
      continue
    }
    return candidate
  }
  return candidate
}
export const calculateFollowUpSchedule = (baseDate, step, settings) => {
  const config = settings.schedule.find((x) => x.step === step)
  if (!config || !config.enabled) return null
  if (step === 'D0') return nextAllowedFollowUpTime(new Date(baseDate.getTime() + config.delayMinutes * 60000), settings)
  const p = getParts(baseDate, settings.timezone)
  const targetDay = addCalendarDays(p, STEP_DAY_OFFSETS[step] || 0)
  const [hour, minute] = config.time.split(':').map(Number)
  let target = localToUtc(targetDay.year, targetDay.month, targetDay.day, hour, minute, settings.timezone)
  target = nextAllowedFollowUpTime(target, settings)
  return target
}
