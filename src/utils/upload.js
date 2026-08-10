import dotenv from 'dotenv'
import multer from 'multer'

import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

dotenv.config()

/*
====================================================
CLOUDINARY
====================================================
*/

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/*
====================================================
TESTE DE CONEXÃO
====================================================
*/

cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Erro ao conectar com Cloudinary:', error)
  } else {
    console.log('✅ Cloudinary conectado com sucesso:', result)
  }
})

/*
====================================================
HELPER
====================================================
*/

function createImageStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,

    params: async () => ({
      folder,

      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],

      transformation: [
        {
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
    }),
  })
}

function createRawStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,

    params: async () => ({
      folder,

      resource_type: 'raw',
    }),
  })
}

/*
====================================================
AVATAR
====================================================
*/

export const avatarUpload = multer({
  storage: createImageStorage('crm/avatar'),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

/*
====================================================
CAPA
====================================================
*/

export const coverUpload = multer({
  storage: createImageStorage('crm/cover'),

  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

/*
====================================================
IMÓVEIS
====================================================
*/

export const propertyImageUpload = multer({
  storage: createImageStorage('crm/properties'),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

/*
====================================================
PDF DOS IMÓVEIS
====================================================
*/

export const propertyPdfUpload = multer({
  storage: createRawStorage('crm/property-pdf'),

  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})

/*
====================================================
CONTRATOS
====================================================
*/

export const contractUpload = multer({
  storage: createRawStorage('crm/contracts'),

  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})

/*
====================================================
DOCUMENTOS
====================================================
*/

export const documentUpload = multer({
  storage: createRawStorage('crm/documents'),

  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})

/*
====================================================
IMPORTAÇÃO CSV
====================================================
*/

export const csvUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

/*
====================================================
EXPORTA CLOUDINARY
====================================================
*/

export { cloudinary }
