<<<<<<< HEAD
import asyncHandler from 'express-async-handler'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import generateToken from '../utils/generateToken.js'

import {
  welcomeTemplate,
  resetPasswordTemplate,
} from '../utils/emailTemplates.js'

import { sendEmail } from '../service/email/sendEmails.js'

import {
  createUser,
  findUserByEmail,
  resetUserPassword,
  getMe as getMeService,
  updateAvatar,
  updateCoverImage,
  updateUser,
  getBrokers,
  getBrokerDetailsById,
  getBrokerMonthlyPerformance,
  getBrokerLatestLeads,
} from '../service/users/userService.js'

/*
====================================================
REGISTRAR USUÁRIO
====================================================
*/

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  /*
  ==========================================
  VALIDAÇÃO
  ==========================================
  */

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Nome, e-mail e senha são obrigatórios.')
  }

  /*
  ==========================================
  VERIFICAR EMAIL
  ==========================================
  */

  const userExists = await findUserByEmail(email)

  if (userExists) {
    res.status(400)
    throw new Error('Já existe um usuário com este e-mail.')
  }

  /*
  ==========================================
  CRIAR USUÁRIO
  ==========================================
  */

  const user = await createUser({
    name,
    email,
    password,
  })

  /*
  ==========================================
  EMAIL DE BOAS-VINDAS
  ==========================================
  */

  try {
    await sendEmail({
      to: user.email,
      subject: '🎉 Bem-vindo ao LeadsnaMão',
      htmlContent: welcomeTemplate(user.name),
    })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error.message)
  }

  /*
  ==========================================
  RESPOSTA
  ==========================================
  */

  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso.',

    data: {
      token: generateToken(user._id, user.role === 'admin'),

      user: {
        _id: user._id,
        name: user.name,
        slug: user.slug,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    },
  })
})

/*
====================================================
LOGIN DO USUÁRIO
====================================================
*/

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    // Buscar usuário pelo email

    const user = await findUserByEmail(email)

    if (!user) {
      return res.status(401).json({
        message: 'Email ou senha inválidos',
      })
    }

    // Verificar senha

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Email ou senha inválidos',
      })
    }

    // Verificar usuário ativo

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Usuário desativado',
      })
    }

    // Gerar token

    const token = generateToken(user._id, user.role)

    const userData = user.toObject()

    delete userData.password

    res.json({
      ...userData,
      token,
    })
  } catch (error) {
    next(error)
  }
}

/*
====================================================
ESQUECI MINHA SENHA
====================================================
*/

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body

    const user = await findUserByEmail(email)

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
      })
    }

    /*
    ==================================
    GERAR TOKEN
    ==================================
    */

    const resetToken = crypto.randomBytes(32).toString('hex')

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000

    await user.save()

    /*
    ==================================
    LINK RESET
    ==================================
    */

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    /*
    ==================================
    ENVIO EMAIL
    ==================================
    */

    await sendEmail({
      to: user.email,

      subject: 'Recuperação de senha - LeadsnaMão',

      htmlContent: resetPasswordTemplate(user.name, resetUrl),
    })

    return res.json({
      success: true,

      message: 'Email de recuperação enviado com sucesso',
    })
  } catch (error) {
    console.error('Erro forgot password:', error)

    return res.status(500).json({
      message: 'Erro ao solicitar recuperação de senha',
    })
  }
}

/*
====================================================
RESETAR SENHA
====================================================
*/

export async function resetPassword(req, res) {
  try {
    const { token } = req.params

    const { password } = req.body

    await resetUserPassword(token, password)

    res.json({
      success: true,

      message: 'Senha alterada com sucesso',
    })
  } catch (error) {
    res.status(400).json({
      message: error.message,
    })
  }
}

/*
====================================================
GET ME
USUÁRIO LOGADO
====================================================
*/

/*
====================================================
GET ME
USUÁRIO LOGADO
====================================================
*/

export async function getMe(req, res, next) {
  try {
    const user = await getMeService(req.user._id)

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
      })
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
}

/*
====================================================
ATUALIZAR PERFIL
USUÁRIO LOGADO
====================================================
*/

export const updateProfile = asyncHandler(async (req, res) => {
  console.log('BODY RECEBIDO:')
  console.log(req.body)

  const user = await updateUser(req.user._id, req.body)

  console.log('USUÁRIO ATUALIZADO:')
  console.log(user)

  if (!user) {
    res.status(404)
    throw new Error('Usuário não encontrado')
  }

  res.status(200).json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: user,
  })
})

/*
====================================================
ATUALIZAR AVATAR
====================================================
*/

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Nenhuma imagem enviada.')
  }

  const user = await updateAvatar(req.user._id, req.file.path)

  res.status(200).json({
    success: true,
    message: 'Avatar atualizado com sucesso.',
    data: user,
  })
})

/*
====================================================
ATUALIZAR CAPA
====================================================
*/

export const uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Nenhuma imagem enviada.')
  }

  const user = await updateCoverImage(req.user._id, req.file.path)

  res.status(200).json({
    success: true,
    message: 'Capa atualizada com sucesso.',
    data: user,
  })
})

/*
====================================================
LISTAR CORRETORES
====================================================
*/

export async function listBrokers(req, res) {
  try {
    const brokers = await getBrokers()

    return res.status(200).json({
      success: true,
      data: brokers,
    })
  } catch (error) {
    console.error('Erro ao buscar corretores:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar corretores',
    })
  }
}

export async function getBrokerDetails(req, res) {
  try {
    const broker = await getBrokerDetailsById(req.params.id)

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Corretor não encontrado',
      })
    }

    return res.status(200).json({
      success: true,
      data: broker,
    })
  } catch (error) {
    console.error('Erro ao buscar detalhes do corretor:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar corretor',
    })
  }
}

/*
====================================================
PERFORMANCE DO CORRETOR
ADMIN
====================================================
*/

export async function brokerPerformance(req, res) {
  try {
    const data = await getBrokerMonthlyPerformance(req.params.id)

    return res.status(200).json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro performance corretor:', error)

    return res.status(500).json({
      success: false,

      message: 'Erro ao buscar performance',
    })
  }
}

/*
====================================================
LEADS DO CORRETOR
ADMIN
====================================================
*/

export async function brokerLeads(req, res) {
  try {
    const leads = await getBrokerLatestLeads(req.params.id)

    return res.status(200).json({
      success: true,

      data: leads,
    })
  } catch (error) {
    console.error('Erro buscar leads corretor:', error)

    return res.status(500).json({
      success: false,

      message: 'Erro ao buscar leads',
    })
=======
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
      // 🔥 Atualiza status para ativo
      user.isActive = true
      await user.save()

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        token: generateToken(user._id),
      })
    } else {
      res.status(401).json({ message: 'Credenciais inválidas' })
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro no login' })
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

// 📌 Listar todos os usuários (sem senha)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').lean()

    return res.json(users) // 👉 retorna array direto
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error)
    res
      .status(500)
      .json({ message: 'Erro ao listar usuários', error: error.message })
  }
}

// controllers/userController.js
export const getBrokers = async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: 'Acesso negado' })
    }

    const brokers = await User.find({ isAdmin: false })
      .select('-password')
      .lean()
    return res.json(brokers)
  } catch (error) {
    console.error('❌ Erro ao listar corretores:', error)
    res
      .status(500)
      .json({ message: 'Erro ao listar corretores', error: error.message })
  }
}

// Atualizar perfil do usuário logado
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id) // req.user vem do middleware de autenticação
    if (!user)
      return res.status(404).json({ message: 'Usuário não encontrado' })

    const { name, email, phone, password } = req.body

    if (name) user.name = name
    if (email) user.email = email
    if (phone) user.phone = phone
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
        phone: user.phone,
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

// Pegar um corretor pelo ID (somente admin pode listar todos, mas aqui é público para hotsite)
export const getBrokerById = async (req, res) => {
  try {
    const { id } = req.params
    const broker = await User.findOne({ _id: id, isAdmin: false }).select(
      '-password',
    )

    if (!broker) {
      return res.status(404).json({ message: 'Corretor não encontrado' })
    }

    res.json(broker)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar corretor', error: error.message })
  }
}

export const getBrokerBySlug = async (req, res) => {
  try {
    const { slug } = req.params

    const corretor = await User.findOne({ slug, isBroker: true }).select(
      '-password',
    )
    if (!corretor) {
      return res.status(404).json({ message: 'Corretor não encontrado' })
    }

    res.json(corretor)
  } catch (error) {
    console.error('Erro ao buscar corretor:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

export const getPublicBrokerById = async (req, res) => {
  try {
    const { id } = req.params

    const broker = await User.findById(id).select(
      'name avatar phone email bio', // Somente campos públicos
    )

    if (!broker) {
      return res.status(404).json({ message: 'Corretor não encontrado' })
    }

    res.json(broker)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erro ao buscar corretor' })
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
  }
}
