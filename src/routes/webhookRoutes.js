import express from 'express'
const router = express.Router()

// Rota de validação do Webhook (Meta/WhatsApp)
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado com sucesso!')
    return res.status(200).send(challenge)
  } else {
    console.warn('❌ Tentativa de verificação de webhook inválida')
    return res.sendStatus(403)
  }
})

// Rota para receber mensagens do WhatsApp
router.post('/', async (req, res) => {
  try {
    // Processar mensagens recebidas
    console.log('📩 Webhook recebido:', req.body)

    // Aqui você processa as mensagens e salva no banco
    // ...

    res.status(200).send('EVENT_RECEIVED')
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message)
    res.status(500).send('EVENT_ERROR')
  }
})

export default router
