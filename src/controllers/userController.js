import crypto from 'crypto'

import User from '../models/User.js'
import sendEmail from '../utils/sendEmail.js'
import { welcomeTemplate } from '../utils/emailTemplates.js'
import generateToken from '../utils/generateToken.js'

// Registrar novo usuário
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, isAdmin, phone } = req.body

    // Verifica se usuário já existe
    const userExists = await User.findOne({ email, phone })
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já cadastrado' })
    }

    // Cria usuário
    const user = await User.create({ name, email, password, isAdmin, phone })

    // Tenta enviar e-mail de boas-vindas
    ;(async () => {
      try {
        await sendEmail({
          email: user.email,
          subject: 'Bem-vindo(a) à plataforma LeadsnaMão 🚀!',
          message: welcomeTemplate(user.name),
        })
      } catch (emailError) {
        console.error('Erro ao enviar e-mail de boas-vindas:', emailError)
      }
    })()

    // Retorna dados do usuário + token
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      phone: user.phone,
      token: generateToken(user._id, user.isAdmin),
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar usuário', error })
  }
}

// Login de usuário
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id, user.isAdmin),
      })
    } else {
      res.status(401).json({ message: 'Credenciais inválidas' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no login', error })
  }
}

// Perfil do usuário logado
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (user) {
      res.json(user)
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar perfil', error })
  }
}

// Solicitar reset de senha
export const forgotPassword = async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' })

  // Gerar token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash do token antes de salvar
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000 // 30 minutos

  await user.save()

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

  const message = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">

      <h2 style="color: #333333; text-align: center;">Redefinição de senha</h2>
      <p style="color: #555555; font-size: 16px; line-height: 1.5;">
        Você solicitou redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
          style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
          Redefinir Senha
        </a>
      </div>

      <p style="color: #999999; font-size: 14px; line-height: 1.5; text-align: center;">
        Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.
      </p>

      <p style="color: #999999; font-size: 12px; line-height: 1.5; text-align: center; margin-top: 20px;">
        &copy; ${new Date().getFullYear()} LeadsnaMão 🚀. Todos os direitos reservados.
      </p>
    </div>
  </div>
`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Recuperação de senha',
      message,
    })
    res.json({ message: 'Email de recuperação enviado!' })
  } catch (error) {
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()
    res.status(500).json({ message: 'Erro ao enviar e-mail', error })
  }
}

// Resetar senha
export const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user)
    return res.status(400).json({ message: 'Token inválido ou expirado' })

  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined

  await user.save()

  res.json({ message: 'Senha resetada com sucesso!' })
}

// 📌 Listar todos os usuários
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password') // já inclui createdAt por padrão
    res.json(users)
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error)
    res
      .status(500)
      .json({ message: 'Erro ao listar usuários', error: error.message })
  }
}

// Atualizar perfil do usuário logado
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id) // req.user vem do middleware de autenticação
    if (!user)
      return res.status(404).json({ message: 'Usuário não encontrado' })

    const { name, email, password } = req.body

    if (name) user.name = name
    if (email) user.email = email
    if (password) user.password = password // hash automático pelo pre-save do model

    // Atualiza avatar se enviado
    if (req.file && req.file.path) {
      user.avatar = req.file.path
    }

    await user.save()

    res.json({
      message: 'Perfil atualizado com sucesso!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ message: 'Erro ao atualizar perfil', error: error.message })
  }
}

// Controller para pegar informações do usuário logado
export const getLoggedUser = async (req, res) => {
  try {
    // req.user.id vem do middleware de autenticação JWT
    const user = await User.findById(req.user.id).select(
      '-password -resetPasswordToken -resetPasswordExpire',
    )

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
      avatar: user.avatar || null, // retorna null se não tiver avatar
    })
  } catch (error) {
    console.error('Erro ao buscar usuário logado:', error)
    res.status(500).json({ message: 'Erro ao buscar usuário logado', error })
  }
}
