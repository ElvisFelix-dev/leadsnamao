import { validationResult } from 'express-validator'

export default function validateRequest(req, res, next) {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação.',
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    })
  }

  next()
}
