import cloudinary from '../config/cloudinary.js'

const uploadImage = async (file, folder = 'profile-images') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,

        resource_type: 'image',
      },

      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      },
    )

    uploadStream.end(file.buffer)
  })
}

const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId)
}

export { uploadImage, deleteImage }
