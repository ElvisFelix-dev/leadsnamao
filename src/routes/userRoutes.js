import express from 'express'
<<<<<<< HEAD

import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  uploadAvatar,
  uploadCover,
  listBrokers,
  getBrokerDetails,
  brokerPerformance,
  brokerLeads,
} from '../controllers/userController.js'

import { avatarUpload, coverUpload } from '../utils/upload.js'

import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
====================================================
AUTH
====================================================
*/

// Cadastro
router.post('/register', register)

// Login
router.post('/login', login)

// Recuperar senha
=======
import {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  getUsers,
  updateUserProfile,
  getLoggedUser,
  getBrokers,
  getBrokerById,
  getBrokerBySlug,
  getPublicBrokerById,
} from '../controllers/userController.js'
import { protect, admin } from '../middleware/authMiddleware.js'
import { upload } from '../utils/upload.js'

const router = express.Router()

// Cadastro
router.post('/register', registerUser)

// Login
router.post('/login', loginUser)

// Buscar corretor pelo slug
router.get('/brokers/name/:slug', getBrokerBySlug)

// Buscar corretor público pelo ID
router.get('/brokers/public/:id', getPublicBrokerById)

// Perfil (apenas usuário logado)
router.get('/profile', protect, getUserProfile)

// Atualiza perfil logado
router.put('/edit-profile', protect, upload.single('avatar'), updateUserProfile)

// Exemplo de rota apenas para admin
router.get('/admin-only', protect, admin, (req, res) => {
  res.json({ message: 'Bem-vindo Admin!' })
})

// Apenas admin pode acessar
router.get('/brokers', protect, getBrokers)

router.get('/brokers/:id', getBrokerById)

// Solicitar reset
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
router.post('/forgot-password', forgotPassword)

// Resetar senha
router.put('/reset-password/:token', resetPassword)

<<<<<<< HEAD
// Usuário logado
router.get('/me', protect, getMe)

/*
====================================================
PERFIL
====================================================
*/

router.put('/profile', protect, updateProfile)

/*
====================================================
AVATAR
====================================================
*/

router.put('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar)

/*
====================================================
CAPA
====================================================
*/

router.put('/cover', protect, coverUpload.single('cover'), uploadCover)

router.get('/brokers', protect, admin, listBrokers)

router.get('/brokers/:id', protect, admin, getBrokerDetails)

router.get('/brokers/:id/performance', protect, admin, brokerPerformance)

router.get('/brokers/:id/leads', protect, admin, brokerLeads)
=======
// 📌 Somente admin pode ver todos os usuários
router.get('/user', protect, admin, getUsers)

router.get('/me', protect, getLoggedUser)
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64

export default router
