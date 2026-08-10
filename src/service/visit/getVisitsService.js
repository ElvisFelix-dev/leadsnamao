import Visit from '../../models/Visit.js'

export const getVisitsService = async ({
  brokerId,
  isAdmin = false,
  page = 1,
  limit = 10,
  search = '',
  status,
  startDate,
  endDate,
  sortBy = 'date',
  order = 'asc',
}) => {
  console.log('========== GET VISITS SERVICE ==========')
  console.log('brokerId recebido:', brokerId)
  console.log('isAdmin:', isAdmin)
  console.log('search:', search)
  console.log('status:', status)
  console.log('startDate:', startDate)
  console.log('endDate:', endDate)
  console.log('========================================')

  const query = {}

  // =====================================================
  // PERMISSÕES
  // =====================================================

  // Admin visualiza todas as visitas
  // Corretor visualiza somente as próprias visitas
  if (!isAdmin) {
    query.broker = brokerId
  }

  // =====================================================
  // STATUS
  // =====================================================

  if (status) {
    query.status = status
  }

  // =====================================================
  // DATA
  // =====================================================

  // IMPORTANTE:
  // No Visit.js o campo é "date", e não "scheduledAt".
  if (startDate || endDate) {
    query.date = {}

    if (startDate) {
      const initialDate = new Date(startDate)

      initialDate.setHours(0, 0, 0, 0)

      query.date.$gte = initialDate
    }

    if (endDate) {
      const finalDate = new Date(endDate)

      finalDate.setHours(23, 59, 59, 999)

      query.date.$lte = finalDate
    }
  }

  console.log('QUERY FINAL:', query)

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  const currentPage = Math.max(Number(page) || 1, 1)

  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)

  // =====================================================
  // BUSCA
  // =====================================================

  /*
   * A busca pelo nome do Lead não pode ser feita
   * diretamente no Visit.find(), porque "lead" é ObjectId.
   *
   * Por isso fazemos o populate com match.
   *
   * Para manter o comportamento atual, filtramos depois
   * as visitas que não possuem Lead após o populate.
   */

  let visits = await Visit.find(query)
    .populate({
      path: 'lead',
      select: `
        name
        phone
        email
        region
        status
        stage
        priority
        source
        sourceType
        landingPage
        referrer
        property
      `,
      match: search
        ? {
            name: {
              $regex: search,
              $options: 'i',
            },
          }
        : undefined,
    })

    // ===================================================
    // IMÓVEL
    // ===================================================

    .populate({
      path: 'property',
      select: `
        name
        code
        images
        image
        coverImage
        type
        category
        purpose
        bedrooms
        bathrooms
        suites
        parkingSpaces
        prices
        location
        status
        active
        published
      `,
    })

    // ===================================================
    // CORRETOR
    // ===================================================

    .populate({
      path: 'broker',
      select: `
        name
        email
        avatar
        phone
      `,
    })

    // ===================================================
    // CRIADO POR
    // ===================================================

    .populate({
      path: 'createdBy',
      select: `
        name
        email
        avatar
      `,
    })

    // ===================================================
    // ORDENAÇÃO
    // ===================================================

    .sort({
      [sortBy]: order === 'desc' ? -1 : 1,
    })

  // =====================================================
  // FILTRO DE BUSCA DO LEAD
  // =====================================================

  if (search) {
    visits = visits.filter((visit) => visit.lead)
  }

  // =====================================================
  // TOTAL
  // =====================================================

  const total = visits.length

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  const startIndex = (currentPage - 1) * currentLimit

  const paginatedVisits = visits.slice(startIndex, startIndex + currentLimit)

  // =====================================================
  // NORMALIZAÇÃO DOS DADOS
  // =====================================================

  const normalizedVisits = paginatedVisits.map((visit) => {
    const item = visit.toJSON()

    const property = item.property

    // -----------------------------------------------
    // Endereço do imóvel
    // -----------------------------------------------

    let propertyAddress = ''

    if (property?.location) {
      const { street, number, complement, district, city, state } =
        property.location

      propertyAddress = [street, number, complement, district, city, state]
        .filter(Boolean)
        .join(', ')
    }

    // -----------------------------------------------
    // Preço
    // -----------------------------------------------

    let propertyPrice = null

    if (property?.prices) {
      if (property.purpose === 'aluguel') {
        propertyPrice = property.prices.rentPrice || 0
      } else {
        propertyPrice = property.prices.salePrice || 0
      }
    }

    // -----------------------------------------------
    // Imagem principal
    // -----------------------------------------------

    let propertyImage = property?.coverImage || ''

    if (!propertyImage && property?.images?.length) {
      const cover = property.images.find((image) => image.isCover)

      propertyImage = cover?.url || property.images[0]?.url || ''
    }

    // -----------------------------------------------
    // Retorno
    // -----------------------------------------------

    return {
      ...item,

      // Data principal da visita
      scheduledAt: item.date,

      // Informações calculadas do imóvel
      propertyInfo: property
        ? {
            id: property._id,
            name: property.name,
            code: property.code || '',
            type: property.type || '',
            category: property.category || '',
            purpose: property.purpose || '',
            bedrooms: property.bedrooms || 0,
            bathrooms: property.bathrooms || 0,
            suites: property.suites || 0,
            parkingSpaces: property.parkingSpaces || 0,
            image: propertyImage,
            address: propertyAddress,
            price: propertyPrice,
          }
        : null,

      // Informações do Lead
      leadInfo: item.lead
        ? {
            id: item.lead._id,
            name: item.lead.name,
            phone: item.lead.phone || '',
            email: item.lead.email || '',
            status: item.lead.status || '',
            stage: item.lead.stage || '',
            priority: item.lead.priority || '',
            source: item.lead.source || '',
            sourceType: item.lead.sourceType || '',
          }
        : null,

      // Informações do corretor
      brokerInfo: item.broker
        ? {
            id: item.broker._id,
            name: item.broker.name,
            email: item.broker.email || '',
            phone: item.broker.phone || '',
            avatar: item.broker.avatar || '',
          }
        : null,
    }
  })

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    visits: normalizedVisits,

    pagination: {
      total,

      page: currentPage,

      limit: currentLimit,

      pages: Math.ceil(total / currentLimit),
    },
  }
}
