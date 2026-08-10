import transactionalEmailApi, { Brevo } from './emailService.js'

export async function sendEmail({ to, subject, htmlContent }) {
  const email = new Brevo.SendSmtpEmail()

  email.sender = {
    name: 'CRM Imobiliário',
    email: process.env.EMAIL_FROM,
  }

  email.to = [
    {
      email: to,
    },
  ]

  email.subject = subject

  email.htmlContent = htmlContent

  try {
    return await transactionalEmailApi.sendTransacEmail(email)
  } catch (error) {
    console.log('================ BREVO ERROR ================')
    console.log('STATUS:', error.response?.status)
    console.log('BODY:', error.response?.body)
    console.log('MESSAGE:', error.message)
    console.log('=============================================')

    throw error
  }
}
