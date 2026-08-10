import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Verifica se o usuário está logado

export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        return res.status(401).json({
          message: 'Usuário não encontrado',
        })
      }

      next()
    } catch (error) {
      return res.status(401).json({
        message: 'Token inválido',
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Não autorizado, sem token',
    })
  }
}

/*
====================================================
ADMIN
====================================================
*/

export const admin = (req, res, next) => {
  console.log('CHECK ADMIN:', {
    id: req.user?._id,
    isAdmin: req.user?.isAdmin,
    role: req.user?.role,
  })

  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    console.log('ADMIN LIBERADO')

    return next()
  }

  console.log('ADMIN BLOQUEADO')

  return res.status(403).json({
    message: 'Acesso negado. Apenas administradores.',
  })
}
