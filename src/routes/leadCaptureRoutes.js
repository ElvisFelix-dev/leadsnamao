// src/routes/leadCaptureRoutes.js
import { Router } from 'express'

import {
  createLead,
  createSiteLead,
  createBrokerLead,
  createPropertyLead,
} from '../controllers/leadCaptureController.js'

const router = Router()

/* ============================================================
   CAPTURA GENÉRICA
============================================================ */

/**
 * POST /api/lead-capture
 * Captura genérica de lead.
 * Pode ser utilizada por: integrações, campanhas, portais, outros canais
 */
router.post('/', createLead)

/* ============================================================
   SITE DA IMOBILIÁRIA
============================================================ */

/**
 * POST /api/lead-capture/site
 * Lead vindo do site principal da imobiliária.
 *
 * Fluxo:
 * Site → Lead → assignedTo = null → Aguarda distribuição
 */
router.post('/site', createSiteLead)

/* ============================================================
   HOTSITE DO CORRETOR
============================================================ */

/**
 * POST /api/lead-capture/broker/:brokerId
 * Lead originado pelo hotsite de um corretor.
 *
 * Fluxo:
 * Hotsite do corretor → Lead → sourceBroker = brokerId → assignedTo = brokerId
 * O lead já pertence ao corretor.
 */
router.post('/broker/:brokerId', createBrokerLead)

/* ============================================================
   LEAD DE UM IMÓVEL 🔥 CORRIGIDO
============================================================ */

/**
 * POST /api/lead-capture/property/:propertyId
 * Lead relacionado diretamente a um imóvel.
 *
 * Fluxo:
 * Página do imóvel → Lead → Busca corretor do imóvel → Atribui ao corretor
 *
 * Se o imóvel não tiver corretor, tenta distribuir automaticamente.
 */
router.post('/property/:propertyId', createPropertyLead)

/* ============================================================
   EXPORT
============================================================ */

export default router
