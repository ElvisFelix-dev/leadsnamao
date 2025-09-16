import express from 'express'
import {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  getUsers,
  updateUserProfile,
  getLoggedUser,
} from '../controllers/userController.js'
import { protect, admin } from '../middleware/authMiddleware.js'
import { upload } from '../utils/upload.js'

const router = express.Router()

// Cadastro
router.post('/register', registerUser)

// Login
router.post('/login', loginUser)

// Perfil (apenas usuário logado)
router.get('/profile', protect, getUserProfile)

// Atualiza perfil logado
router.put('/edit-profile', protect, upload.single('avatar'), updateUserProfile)

// Exemplo de rota apenas para admin
router.get('/admin-only', protect, admin, (req, res) => {
  res.json({ message: 'Bem-vindo Admin!' })
})

// Solicitar reset
router.post('/forgot-password', forgotPassword)

// Resetar senha
router.put('/reset-password/:token', resetPassword)

// 📌 Somente admin pode ver todos os usuários
router.get('/user', protect, admin, getUsers)

router.get('/me', protect, getLoggedUser)

export default router
