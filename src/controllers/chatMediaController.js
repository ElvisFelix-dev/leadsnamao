import asyncHandler from '../middleware/asyncHandler.js'
import AppError from '../utils/AppError.js'

export const uploadChatMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Selecione um arquivo para enviar.', 400)
  }

  const url = req.file.path || req.file.secure_url

  if (!url || !url.startsWith('https://')) {
    throw new AppError(
      'Não foi possível obter uma URL HTTPS para o arquivo.',
      502,
    )
  }

  return res.status(201).json({
    success: true,
    message: 'Arquivo enviado com sucesso.',
    data: {
      url,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      format: req.file.mimetype.startsWith('image/')
        ? 'image'
        : req.file.mimetype.startsWith('video/')
          ? 'video'
          : req.file.mimetype.startsWith('audio/')
            ? 'audio'
            : 'file',
    },
  })
})
