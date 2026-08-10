import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Verifica se o usuário está logado
<<<<<<< HEAD

=======
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]
<<<<<<< HEAD

=======
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.user = await User.findById(decoded.id).select('-password')

<<<<<<< HEAD
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
=======
      next()
    } catch (error) {
      res.status(401).json({ message: 'Token inválido' })
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
    }
  }

  if (!token) {
<<<<<<< HEAD
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
=======
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
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
}
