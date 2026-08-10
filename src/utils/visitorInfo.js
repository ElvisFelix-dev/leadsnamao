import { UAParser } from 'ua-parser-js'
import geoip from 'geoip-lite'

/* ============================================================
   Obter IP Real
============================================================ */

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ''
  )
}

/* ============================================================
   Limpar IPv6 Local
============================================================ */

function normalizeIp(ip = '') {
  if (!ip) return ''

  return ip.replace('::ffff:', '')
}

/* ============================================================
   Detectar Localização
============================================================ */

function getLocation(ip) {
  if (!ip) {
    return {}
  }

  const geo = geoip.lookup(ip)

  if (!geo) {
    return {}
  }

  return {
    country: geo.country || '',
    countryCode: geo.country || '',

    state: geo.region || '',

    city: geo.city || '',

    timezone: geo.timezone || '',

    latitude: geo.ll?.[0] || null,

    longitude: geo.ll?.[1] || null,
  }
}

/* ============================================================
   Detectar Navegador / SO / Dispositivo
============================================================ */

function parseUserAgent(userAgent = '') {
  const parser = new UAParser(userAgent)

  const result = parser.getResult()

  return {
    browser: result.browser.name || '',

    browserVersion: result.browser.version || '',

    os: result.os.name || '',

    osVersion: result.os.version || '',

    deviceType: result.device.type || detectDevice(result),

    vendor: result.device.vendor || '',

    model: result.device.model || '',

    cpuArchitecture: result.cpu.architecture || '',
  }
}

/* ============================================================
   Fallback de Dispositivo
============================================================ */

function detectDevice(result) {
  const os = result.os.name?.toLowerCase() || ''

  if (os.includes('android') || os.includes('ios')) {
    return 'mobile'
  }

  if (os.includes('windows') || os.includes('mac') || os.includes('linux')) {
    return 'desktop'
  }

  return 'unknown'
}

/* ============================================================
   Export
============================================================ */

/* ============================================================
   Visitor Info Principal
============================================================ */

export function getVisitorInfo(req) {
  const rawIp = getClientIp(req)

  const ip = normalizeIp(rawIp)

  const userAgent = req.headers['user-agent'] || ''

  const language = req.headers['accept-language'] || ''

  const location = getLocation(ip)

  const device = parseUserAgent(userAgent)

  return {
    /* ===========================
       Rede
    =========================== */

    ip,

    forwardedIp: rawIp,

    userAgent,

    language,

    /* ===========================
       Localização
    =========================== */

    country: location.country || '',

    countryCode: location.countryCode || '',

    state: location.state || '',

    city: location.city || '',

    timezone: location.timezone || '',

    latitude: location.latitude || null,

    longitude: location.longitude || null,

    /* ===========================
       Navegador
    =========================== */

    browser: device.browser,

    browserVersion: device.browserVersion,

    /* ===========================
       Sistema
    =========================== */

    os: device.os,

    osVersion: device.osVersion,

    /* ===========================
       Dispositivo
    =========================== */

    deviceType: device.deviceType,

    vendor: device.vendor,

    model: device.model,

    cpuArchitecture: device.cpuArchitecture,

    /* ===========================
       Frontend opcional
       preenchido depois
    =========================== */

    screenWidth: null,

    screenHeight: null,
  }
}

/* ============================================================
   Export Default
============================================================ */

export default {
  getVisitorInfo,
}
