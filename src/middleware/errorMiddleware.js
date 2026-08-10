const errorMiddleware = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500

  console.error('❌ Error:', err)

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })
}

export default errorMiddleware
