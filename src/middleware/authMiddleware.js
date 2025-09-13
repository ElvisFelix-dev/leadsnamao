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

      next()
    } catch (error) {
      res.status(401).json({ message: 'Token inválido' })
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, sem token' })
  }
}

// Permite apenas admins
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next()
  } else {
    res
      .status(403)
      .json({ message: 'Acesso negado. Apenas admin pode acessar.' })
  }
}
