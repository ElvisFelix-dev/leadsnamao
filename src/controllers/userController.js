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
  }
}
