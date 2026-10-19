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
  timeout: 120000,
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
HELPERS DE STORAGE
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
TIPOS PERMITIDOS NO CHAT / WHATSAPP
====================================================
*/

const CHAT_MEDIA_MIME_TYPES = new Set([
  // Imagens
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',

  // Vídeos
  'video/mp4',
  'video/3gpp',
  'video/quicktime',
  'video/webm',

  // Áudios
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',

  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
])

/*
====================================================
UPLOAD DE MÍDIAS DO CHAT
====================================================

Aceita imagens, áudios, vídeos e documentos.

O arquivo fica hospedado no Cloudinary e a URL
retornada será usada posteriormente pelo chat
para enviar a mídia ao WhatsApp.

Limite: 50 MB por arquivo.
====================================================
*/

export const chatMediaUpload = multer({
  // Mantemos o arquivo em memória para que o controller possa converter
  // áudios antes de enviá-los ao Cloudinary. Os demais anexos seguem sendo
  // enviados ao Cloudinary pelo próprio controller, sem conversão.
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!CHAT_MEDIA_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error('Formato não permitido para anexos do chat.'))
    }

    callback(null, true)
  },
})

/*
====================================================
UPLOAD DE AVATAR
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
UPLOAD DE CAPA
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
UPLOAD DE IMAGENS DOS IMÓVEIS
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
UPLOAD DE PDF DOS IMÓVEIS
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
UPLOAD DE CONTRATOS
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
UPLOAD DE DOCUMENTOS
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
UPLOAD PARA IMPORTAÇÃO CSV
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
