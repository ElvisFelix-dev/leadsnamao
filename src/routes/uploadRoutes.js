import express from 'express'

import upload from '../middleware/uploadMiddleware.js'

import {
  uploadController,
  removeImageController,
  uploadAvatarController,
  uploadCoverController,
  uploadPropertyController,
} from '../controllers/uploadController.js'

import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
=====================================
Upload genérico
=====================================
*/

router.post('/image', protect, upload.single('image'), uploadController)

router.delete('/image', protect, removeImageController)

/*
=====================================
Perfil do usuário
=====================================
*/

router.post('/avatar', protect, upload.single('image'), uploadAvatarController)

router.post('/cover', protect, upload.single('image'), uploadCoverController)

/*
=====================================
Imóveis
=====================================
*/

router.post(
  '/property',
  protect,
  admin,
  upload.single('image'),
  uploadPropertyController,
)

export default router
