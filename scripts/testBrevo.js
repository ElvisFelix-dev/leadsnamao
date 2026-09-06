import Brevo from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

const accountApi = new Brevo.AccountApi()

accountApi.setApiKey(Brevo.AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY)

try {
  const account = await accountApi.getAccount()
  console.log('✅ Autenticado!')
  console.log(account.body)
} catch (err) {
  console.log('❌ Erro')
  console.log(err.response?.status)
  console.log(err.response?.body)
  console.log(err.message)
}
