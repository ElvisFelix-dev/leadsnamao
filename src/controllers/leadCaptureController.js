import {
  captureLead,
  captureSiteLead,
  captureBrokerHotsiteLead,
  capturePropertyLead,
} from '../service/leadCaptureService.js'

/* ============================================================
   CAPTURAR LEAD
   Endpoint genérico
============================================================ */

/**
 * POST
 * /api/lead-capture
 *
 * Endpoint genérico para captura de leads.
 *
 * Pode ser utilizado por:
 * - site
 * - hotsite
 * - portal
 * - campanhas
 * - integrações
 * - outros canais públicos
 */
export async function createLead(req, res) {
  try {
    const result = await captureLead({
      ...req.body,

      /*
       * Informações técnicas da requisição.
       * Não devem ser confiadas ao frontend.
       */
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',

      userAgent: req.headers['user-agent'] || '',

      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    })

    return res.status(201).json({
      success: true,
      message: 'Lead criado com sucesso.',
      data: result,
    })
  } catch (error) {
    console.error('Erro ao capturar lead:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Não foi possível criar o lead.',
    })
  }
}

/* ============================================================
   LEAD DO SITE DA IMOBILIÁRIA
============================================================ */

/**
 * POST
 * /api/lead-capture/site
 *
 * Lead vindo do site principal da imobiliária.
 *
 * IMPORTANTE:
 * Esse lead não possui corretor de origem.
 *
 * Portanto:
 * - sourceType = site
 * - sourceBroker = null
 * - assignedTo = null
 * - awaitingAssignment = true
 *
 * O ADMIN fará a distribuição posteriormente.
 */
export async function createSiteLead(req, res) {
  try {
    const result = await captureSiteLead({
      ...req.body,

      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',

      userAgent: req.headers['user-agent'] || '',

      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    })

    return res.status(201).json({
      success: true,
      message: 'Solicitação recebida com sucesso.',
      data: result,
    })
  } catch (error) {
    console.error('Erro ao criar lead do site:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Não foi possível enviar sua solicitação.',
    })
  }
}

/* ============================================================
   LEAD DO HOTSITE DO CORRETOR
============================================================ */

/**
 * POST
 * /api/lead-capture/broker/:brokerId
 *
 * Lead originado diretamente pelo hotsite de um corretor.
 *
 * Nesse caso o backend determina:
 *
 * - sourceType = broker_hotsite
 * - sourceBroker = brokerId
 * - assignedTo = brokerId
 * - awaitingAssignment = false
 *
 * O admin não precisa distribuir esse lead.
 */
export async function createBrokerLead(req, res) {
  try {
    const { brokerId } = req.params

    if (!brokerId) {
      return res.status(400).json({
        success: false,
        message: 'ID do corretor não informado.',
      })
    }

    const result = await captureBrokerHotsiteLead({
      ...req.body,

      brokerId,

      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',

      userAgent: req.headers['user-agent'] || '',

      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    })

    return res.status(201).json({
      success: true,
      message: 'Solicitação enviada ao corretor com sucesso.',
      data: result,
    })
  } catch (error) {
    console.error('Erro ao criar lead do corretor:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || 'Não foi possível enviar sua solicitação ao corretor.',
    })
  }
}

/* ============================================================
   LEAD RELACIONADO A UM IMÓVEL
============================================================ */

/**
 * POST
 * /api/lead-capture/property/:propertyId
 *
 * Usado quando o visitante está visualizando
 * um imóvel específico.
 *
 * Pode vir de:
 *
 * - site da imobiliária
 * - hotsite do corretor
 * - portal
 * - campanha
 * - outros canais
 *
 * O service é responsável por determinar
 * a origem e a atribuição.
 */
export async function createPropertyLead(req, res) {
  try {
    const { propertyId } = req.params

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'ID do imóvel não informado.',
      })
    }

    const result = await capturePropertyLead({
      ...req.body,

      propertyId,

      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',

      userAgent: req.headers['user-agent'] || '',

      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    })

    return res.status(201).json({
      success: true,
      message: 'Solicitação recebida com sucesso.',
      data: result,
    })
  } catch (error) {
    console.error('Erro ao criar lead do imóvel:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message ||
        'Não foi possível enviar sua solicitação sobre o imóvel.',
    })
  }
}

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  createLead,
  createSiteLead,
  createBrokerLead,
  createPropertyLead,
}
