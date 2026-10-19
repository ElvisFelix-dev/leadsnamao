import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'

import ffmpegPath from 'ffmpeg-static'

import asyncHandler from '../middleware/asyncHandler.js'
import AppError from '../utils/AppError.js'
import { cloudinary } from '../utils/upload.js'

const AUDIO_MIME_PREFIX = 'audio/'
const MAX_CONVERSION_TIME_MS = 30000

const convertAudioToOggOpus = (inputBuffer) =>
  new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(new Error('Binário do FFmpeg não foi encontrado.'))
    }

    const ffmpeg = spawn(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-vn',
        '-c:a',
        'libopus',
        '-b:a',
        '32k',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-application',
        'voip',
        '-f',
        'ogg',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )

    const outputChunks = []
    const errorChunks = []
    let settled = false

    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      callback(value)
    }

    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL')
      finish(reject, new Error('Tempo limite excedido ao converter o áudio.'))
    }, MAX_CONVERSION_TIME_MS)

    ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk))
    ffmpeg.stderr.on('data', (chunk) => errorChunks.push(chunk))
    ffmpeg.on('error', (error) => finish(reject, error))
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        const details = Buffer.concat(errorChunks).toString('utf8').trim()
        return finish(
          reject,
          new Error(details || `FFmpeg terminou com código ${code}.`),
        )
      }

      const outputBuffer = Buffer.concat(outputChunks)
      if (!outputBuffer.length) {
        return finish(
          reject,
          new Error('O FFmpeg não gerou um arquivo de áudio.'),
        )
      }

      finish(resolve, outputBuffer)
    })

    ffmpeg.stdin.on('error', (error) => {
      // O FFmpeg pode fechar stdin depois de reportar uma entrada inválida.
      if (error.code !== 'EPIPE') finish(reject, error)
    })
    ffmpeg.stdin.end(inputBuffer)
  })

const uploadBufferToCloudinary = ({ buffer, resourceType, format, publicId }) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'crm/chat-media',
        resource_type: resourceType,
        public_id: publicId,
        ...(format ? { format } : {}),
      },
      (error, result) => {
        if (error) return reject(error)
        if (!result?.secure_url) {
          return reject(new Error('Cloudinary não retornou uma URL HTTPS.'))
        }
        resolve(result)
      },
    )

    Readable.from([buffer]).pipe(uploadStream)
  })

export const uploadChatMedia = asyncHandler(async (req, res) => {
  const file = req.file

  if (!file?.buffer?.length) {
    throw new AppError('Selecione um arquivo válido para enviar.', 400)
  }

  const originalMimeType = String(file.mimetype || '').toLowerCase()
  const isAudio = originalMimeType.startsWith(AUDIO_MIME_PREFIX)
  const publicId = `${Date.now()}-${crypto.randomUUID()}`

  let buffer = file.buffer
  let mimeType = originalMimeType || 'application/octet-stream'
  let name = file.originalname || 'arquivo'
  let resourceType = 'auto'
  let format

  if (isAudio) {
    try {
      buffer = await convertAudioToOggOpus(file.buffer)
    } catch (error) {
      console.error('[ChatMedia] Falha ao converter áudio:', {
        mimeType: originalMimeType,
        message: error?.message,
      })
      throw new AppError(
        'Não foi possível converter o áudio. Grave novamente e tente enviar.',
        422,
      )
    }

    mimeType = 'audio/ogg'
    name = `${String(file.originalname || 'audio').replace(/\.[^.]+$/, '')}.ogg`
    resourceType = 'video' // O Cloudinary armazena áudio no resource_type video.
    format = 'ogg'

    console.info('[ChatMedia] Áudio convertido para OGG/Opus:', {
      originalMimeType,
      outputMimeType: mimeType,
      originalSize: file.size,
      convertedSize: buffer.length,
    })
  }

  let uploaded
  try {
    uploaded = await uploadBufferToCloudinary({
      buffer,
      resourceType,
      format,
      publicId,
    })
  } catch (error) {
    console.error('[ChatMedia] Falha no upload para Cloudinary:', {
      message: error?.message,
      http_code: error?.http_code,
      resourceType,
    })
    throw new AppError('Não foi possível armazenar o arquivo enviado.', 502)
  }

  return res.status(201).json({
    success: true,
    message: isAudio
      ? 'Áudio convertido e enviado com sucesso.'
      : 'Arquivo enviado com sucesso.',
    data: {
      url: uploaded.secure_url,
      name,
      size: buffer.length,
      mimeType,
      format: isAudio
        ? 'audio'
        : mimeType.startsWith('image/')
          ? 'image'
          : mimeType.startsWith('video/')
            ? 'video'
            : 'file',
      publicId: uploaded.public_id,
    },
  })
})

export default { uploadChatMedia }
