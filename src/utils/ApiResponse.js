class ApiResponse {
  static success(res, data = null, message = 'Sucesso', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
    })
  }

  static created(res, data = null, message = 'Criado com sucesso') {
    return res.status(201).json({
      success: true,
      message,
      data,
    })
  }

  static paginated(res, data, page, limit, total, message = 'Sucesso') {
    return res.json({
      success: true,
      message,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data,
    })
  }
}

export default ApiResponse
