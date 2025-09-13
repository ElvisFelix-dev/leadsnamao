import express from 'express'
import Property from '../models/Property.js'
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getRandomImages,
  shareProperty,
} from '../controllers/propertyController.js'
import reviewRoutes from './reviewRoutes.js'
import { upload } from '../utils/upload.js'
import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Rotas públicas
router.get('/', getProperties)
router.get('/:id', getPropertyById)
router.get('/random-images', getRandomImages)

// Rotas protegidas (apenas admin)
router.post('/', protect, admin, createProperty)
router.put('/:id', protect, admin, updateProperty)
router.delete('/:id', protect, admin, deleteProperty)

router.get('/:id/share', protect, shareProperty)

// Criação de imóvel com imagens
router.post(
  '/create-property',
  protect,
  admin,
  upload.array('images', 10),
  createProperty,
)

// Rotas de review
router.use('/:id/reviews', protect, reviewRoutes)

// Atualização de imóvel com imagens
router.put(
  '/update/:id',
  protect,
  admin,
  upload.array('images', 10),
  updateProperty,
)

// Listar propriedades por categoria
router.get('/category/:type', async (req, res) => {
  try {
    const { type } = req.params
    const properties = await Property.find({ category: type })
    res.json(properties)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar propriedades', error })
  }
})

export default router
