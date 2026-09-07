import express from 'express'

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
  adminDeleteUser,
  adminUpdateUser,
  adminGetUser,
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
router.post('/forgot-password', forgotPassword)

// Resetar senha
router.put('/reset-password/:token', resetPassword)

// Usuário logado
router.get('/me', protect, getMe)

/*
====================================================
ADMIN - GERENCIAR USUÁRIOS
====================================================
*/

// Buscar qualquer usuário (admin)
router.get('/admin/users/:id', protect, admin, adminGetUser)

// Atualizar qualquer usuário (admin)
router.put('/admin/users/:id', protect, admin, adminUpdateUser)

// Deletar qualquer usuário (admin)
router.delete('/admin/users/:id', protect, admin, adminDeleteUser)

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

export default router
