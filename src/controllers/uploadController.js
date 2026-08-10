import User from '../models/User.js'
import { uploadImage, deleteImage } from '../service/cloudinaryService.js'

// Upload genérico
export const uploadController = async (req, res) => {
  console.log('UPLOAD GENERICO CHAMADO')

  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhuma imagem enviada',
      })
    }

    const folder = req.body.folder || 'profile-images'

    const result = await uploadImage(req.file, folder)

    res.json({
      url: result.secure_url,

      public_id: result.public_id,
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    })
  }
}

// Upload Avatar
export const uploadAvatarController = async (req, res) => {
  console.log('UPLOAD AVATAR CHAMADO')
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhuma imagem enviada',
      })
    }

    const result = await uploadImage(req.file)

    console.log('CLOUDINARY URL:')
    console.log(result.secure_url)

    console.log('USER AUTH:')
    console.log(req.user)

    const user = await User.findById(req.user._id)

    console.log('USER ENCONTRADO:')
    console.log(user)

    user.avatar = result.secure_url

    console.log('NOVO AVATAR:')
    console.log(user.avatar)

    await user.save()

    console.log('SALVO NO BANCO')

    res.json({
      message: 'Avatar atualizado',
      avatar: user.avatar,
    })
  } catch (error) {
    console.log(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

// Upload Cover
export const uploadCoverController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhuma imagem enviada',
      })
    }

    const result = await uploadImage(req.file)

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
      })
    }

    user.coverImage = result.secure_url

    await user.save()

    res.json({
      message: 'Capa atualizada',
      coverImage: user.coverImage,
      public_id: result.public_id,
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    })
  }
}

// Remover imagem
export const removeImageController = async (req, res) => {
  try {
    const { publicId } = req.body

    await deleteImage(publicId)

    res.json({
      message: 'Imagem removida',
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    })
  }
}

export const uploadPropertyController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhuma imagem enviada',
      })
    }

    const result = await uploadImage(req.file, 'property-images')

    return res.json({
      success: true,

      url: result.secure_url,

      public_id: result.public_id,
    })
  } catch (error) {
    console.log(error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
