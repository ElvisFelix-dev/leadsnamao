import express from 'express'
import { addReview, getReviews } from '../controllers/reviewController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router({ mergeParams: true })

// POST: adicionar review (usuário logado)
router.post('/', protect, addReview)

// GET: listar reviews de um imóvel
router.get('/', getReviews)

export default router
