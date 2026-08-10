import axios from 'axios'

export const getCoordinatesFromAddress = async (address) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY // coloque no .env
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address,
          key: apiKey,
        },
      },
    )

    if (response.data.status === 'OK') {
      const { lat, lng } = response.data.results[0].geometry.location
      return { lat, lng }
    } else {
      console.error('Erro no Geocoding:', response.data)
      return null
    }
  } catch (error) {
    console.error('Erro ao buscar coordenadas:', error.message)
    return null
  }
}
