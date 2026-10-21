import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { createLink, getContext, submit, revokeLink } from '../controllers/publicProposalController.js'

const router = express.Router()

// Rotas públicas: não exigem login; token longo, aleatório e validado no servidor.
router.get('/:token', getContext)
router.post('/:token/submit', submit)

// Rotas internas de gestão de links.
router.post('/links', protect, createLink)
router.delete('/links/:linkId', protect, revokeLink)

export default router
