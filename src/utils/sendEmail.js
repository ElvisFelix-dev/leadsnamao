import nodemailer from 'nodemailer'

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER, // seu email
      pass: process.env.EMAIL_PASS, // senha de app
    },
  })

  const mailOptions = {
    from: `"Leads na Mão" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  }

  await transporter.sendMail(mailOptions)
}

export default sendEmail
