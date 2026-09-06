import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

try {
  const response = await axios.get('https://api.brevo.com/v3/account', {
    headers: {
      'api-key': process.env.BREVO_API_KEY,
    },
  })

  console.log(response.data)
} catch (err) {
  console.log('STATUS:', err.response?.status)
  console.log('DATA:', err.response?.data)
}
