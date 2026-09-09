import Brevo from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

const transactionalEmailApi = new Brevo.TransactionalEmailsApi()

if (!process.env.BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY não encontrada no arquivo .env')
} else {
  transactionalEmailApi.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  )

  console.log('BREVO_API_KEY existe:', !!process.env.BREVO_API_KEY)
  console.log(
    'BREVO_API_KEY começa com:',
    process.env.BREVO_API_KEY?.substring(0, 10),
  )
}

export { Brevo }

export default transactionalEmailApi
