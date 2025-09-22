import Property from '../models/Property.js'
import { getCoordinatesFromAddress } from '../utils/geocode.js'

// Criar imóvel (apenas admin)
// Criar imóvel (apenas admin ou corretor)
export const createProperty = async (req, res) => {
  try {
    const data = { ...req.body }

    // 🔑 Vincula ao usuário logado
    data.createdBy = req.user._id
    data.brokerId = req.user._id // ← necessário porque o schema exige

    // 📸 Pegar URLs das imagens enviadas
    if (req.files?.length > 0) {
      data.images = req.files.map((file) => file.path) // Cloudinary retorna a URL em file.path
    }

    // 📍 Buscar coordenadas pelo endereço
    const coords = await getCoordinatesFromAddress(data.address)
    if (coords) {
      data.location = coords
    }

    const property = new Property(data)
    const createdProperty = await property.save()

    res.status(201).json(createdProperty)
  } catch (error) {
    console.error('❌ Erro ao criar imóvel:', error.message) // log mais claro
    res
      .status(500)
      .json({ message: 'Erro ao criar imóvel', error: error.message })
  }
}

// Listar todos imóveis com filtros
export const getProperties = async (req, res) => {
  try {
    const { region, bedrooms, parking } = req.query

    const filter = {}

    if (region) filter.region = region
    if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) } // >= qtd
    if (parking) filter.parking = { $gte: Number(parking) } // >= qtd

    const properties = await Property.find(filter)

    res.status(200).json(properties)
  } catch (error) {
    console.error('❌ Erro ao buscar imóveis:', error)
    res.status(500).json({ message: 'Erro ao buscar imóveis' })
  }
}

// Listar imóvel por ID
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
    if (!property)
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    res.json(property)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar imóvel', error })
  }
}

// Atualizar imóvel (apenas admin)
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
    if (!property)
      return res.status(404).json({ message: 'Imóvel não encontrado' })

    // Atualiza campos
    Object.assign(property, req.body)

    // Atualiza imagens se enviadas
    if (req.files) {
      property.images = req.files.map((file) => file.path)
    }

    const updatedProperty = await property.save()
    res.json(updatedProperty)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar imóvel', error })
  }
}

// Deletar imóvel (apenas admin)
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    res.json({ message: 'Imóvel deletado com sucesso!' })
  } catch (error) {
    console.error('❌ Erro ao deletar:', error)
    res
      .status(500)
      .json({ message: 'Erro ao deletar imóvel', error: error.message })
  }
}

export const getRandomImages = async (req, res) => {
  try {
    // Retorna 5 imagens aleatórias (ajuste o número se quiser mais)
    const properties = await Property.aggregate([
      { $sample: { size: 5 } }, // pega aleatoriamente
      { $project: { images: 1, name: 1 } }, // pega apenas images e nome
    ])

    // Pega a primeira imagem de cada imóvel
    const images = properties.map((p) => ({
      title: p.name,
      img: p.images[0],
      id: p._id,
    }))

    res.json(images)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar imagens', error })
  }
}

export const shareProperty = async (req, res) => {
  try {
    const { id } = req.params // id do imóvel

    // pega o número do corretor logado
    const phoneNumber = req.user.phone

    if (!phoneNumber) {
      return res.status(400).json({
        message: 'Seu perfil não possui número de WhatsApp cadastrado',
      })
    }

    const property = await Property.findById(id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    // 📄 Monta mensagem do imóvel
    const message = `
🏠 *${property.name}*
📍 Endereço: ${property.address}
📌 Região: ${property.region}
🛏️ Quartos: ${property.bedrooms}
🚗 Vagas: ${property.parking}
💰 Preço: R$ ${property.price.toLocaleString('pt-BR')}
ℹ️ Descrição: ${property.description}
    `

    // 📲 Gera link de compartilhamento no WhatsApp
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`

    res.json({ whatsappLink })
  } catch (error) {
    console.error('❌ Erro ao gerar link do WhatsApp:', error)
    res.status(500).json({ message: 'Erro ao compartilhar imóvel' })
  }
}
