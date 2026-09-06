import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// =====================================================
// PROTECT
// =====================================================

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado, token não enviado.',
      })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Formato de autorização inválido.',
      })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado, sem token.',
      })
    }

    // =====================================================
    // JWT
    // =====================================================

    let decoded

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
        error: jwtError.message,
      })
    }

    // =====================================================
    // USUÁRIO
    // =====================================================

    const userId = decoded.id

    console.log('🆔 User ID do token:', userId)

    if (!userId) {
      console.log('❌ Token não possui decoded.id')

      return res.status(401).json({
        success: false,
        message: 'Token inválido: ID do usuário ausente.',
      })
    }

    const user = await User.findById(userId).select('-password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.',
      })
    }

    req.user = user

    return next()
  } catch (error) {
    console.error('❌ ERRO AUTH MIDDLEWARE:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro interno de autenticação.',
    })
  }
}

// =====================================================
// ADMIN
// =====================================================

export const admin = (req, res, next) => {
  console.log({
    id: req.user?._id,
    isAdmin: req.user?.isAdmin,
    role: req.user?.role,
  })

  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    return next()
  }

  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Apenas administradores.',
  })
}
