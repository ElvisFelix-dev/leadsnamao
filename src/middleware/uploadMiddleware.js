import multer from 'multer'

const storage = multer.memoryStorage()

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true)
    } else {
      callback(new Error('Somente imagens são permitidas'), false)
    }
  },
})

export default upload
