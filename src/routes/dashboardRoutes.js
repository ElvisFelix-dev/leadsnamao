import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

const router = express.Router()

router.get('/stats', protect, admin, async (req, res) => {
  try {
    const leads = await Lead.countDocuments()
    const imoveis = await Property.countDocuments()
    const usuarios = await User.countDocuments()
    const corretores = await User.countDocuments({ role: 'corretor' })

    // Trazer todos os usuários (para frontend filtrar corretores se necessário)
    const users = await User.find({}, 'name email avatar role isAdmin')

    // Agrupar leads por dia
    const leadsDaily = await Lead.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%d/%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Agrupar imóveis por dia
    const imoveisDaily = await Property.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%d/%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    res.json({
      totals: { leads, imoveis, corretores, usuarios },
      leadsDaily,
      imoveisDaily,
      users,
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error })
  }
})

export default router
