import dotenv from 'dotenv' // garante que .env esteja disponível

import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'properties', // pasta no Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
})

// 🔎 Teste de conexão
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Erro ao conectar com Cloudinary:', error)
  } else {
    console.log('✅ Cloudinary conectado com sucesso:', result)
  }
})

export const upload = multer({ storage })
