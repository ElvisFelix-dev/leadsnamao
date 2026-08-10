import brokerDashboardService from '../service/dashboard/brokerDashboardService.js'

/*
====================================================
Dashboard Corretor

GET /api/broker-dashboard

Retorna:
- Dados do corretor
- Cards
- Gráfico
- Metas
- Próximas visitas
- Últimos leads
- Atividades
====================================================
*/

export const getBrokerDashboard = async (req, res, next) => {
  try {
    const brokerId = req.user.id

    if (!brokerId) {
      return res.status(401).json({
        message: 'Usuário não autenticado',
      })
    }

    const dashboard = await brokerDashboardService(brokerId)

    return res.status(200).json(dashboard)
  } catch (error) {
    console.error('ERRO BROKER DASHBOARD:', error)

    next(error)
  }
}
