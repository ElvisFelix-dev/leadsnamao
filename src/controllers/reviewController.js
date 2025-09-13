import Property from '../models/Property.js'

// Adicionar review a um imóvel
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    // Verifica se o usuário já fez review
    const alreadyReviewed = property.reviews.find(
      (r) => r.user.toString() === req.user._id.toString(),
    )
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Você já avaliou este imóvel' })
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    }

    property.reviews.push(review)
    property.numReviews = property.reviews.length
    property.rating =
      property.reviews.reduce((acc, item) => item.rating + acc, 0) /
      property.reviews.length

    await property.save()

    res.status(201).json({ message: 'Review adicionada com sucesso!' })
  } catch (error) {
    console.error('❌ Erro ao adicionar review:', error)
    res
      .status(500)
      .json({ message: 'Erro ao adicionar review', error: error.message })
  }
}

// Listar reviews de um imóvel
export const getReviews = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    res.json(property.reviews)
  } catch (error) {
    console.error('❌ Erro ao listar reviews:', error)
    res
      .status(500)
      .json({ message: 'Erro ao listar reviews', error: error.message })
  }
}
