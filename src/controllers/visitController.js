import asyncHandler from '../middleware/asyncHandler.js'

import { createVisitService } from '../service/visit/createVisitService.js'
import { getVisitsService } from '../service/visit/getVisitsService.js'
import { getVisitByIdService } from '../service/visit/getVisitByIdService.js'
import { updateVisitService } from '../service/visit/updateVisitService.js'
import { deleteVisitService } from '../service/visit/deleteVisitService.js'
import { confirmVisitService } from '../service/visit/confirmVisitService.js'
import { completeVisitService } from '../service/visit/completeVisitService.js'
import { cancelVisitService } from '../service/visit/cancelVisitService.js'
import { getTodayVisitsService } from '../service/visit/getTodayVisitsService.js'
import { getUpcomingVisitsService } from '../service/visit/getUpcomingVisitsService.js'

/*
====================================================
Criar visita
====================================================
*/

export const createVisit = asyncHandler(async (req, res) => {
  const visit = await createVisitService({
    body: req.body,
    user: req.user,
  })

  res.status(201).json({
    success: true,
    message: 'Visita agendada com sucesso.',
    data: visit,
  })
})

/*
====================================================
Listar visitas
====================================================
*/

export const getVisits = asyncHandler(async (req, res) => {
  console.log('========== AUTH VISITS ==========')
  console.log('USER ID:', req.user?.id)
  console.log('USER ROLE:', req.user?.role)
  console.log('USER isAdmin:', req.user?.isAdmin)

  const isAdmin = req.user?.isAdmin === true || req.user?.role === 'admin'

  console.log('IS ADMIN FINAL:', isAdmin)
  console.log('=================================')
  const result = await getVisitsService({
    brokerId: req.user.id,
    isAdmin,
    ...req.query,
  })

  res.json({ success: true, ...result })
})

/*
====================================================
Buscar visita
====================================================
*/

export const getVisitById = asyncHandler(async (req, res) => {
  const visit = await getVisitByIdService({
    id: req.params.id,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    data: visit,
  })
})

/*
====================================================
Atualizar visita
====================================================
*/

export const updateVisit = asyncHandler(async (req, res) => {
  const visit = await updateVisitService({
    id: req.params.id,
    body: req.body,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    message: 'Visita atualizada com sucesso.',
    data: visit,
  })
})

/*
====================================================
Excluir visita
====================================================
*/

export const deleteVisit = asyncHandler(async (req, res) => {
  await deleteVisitService({
    id: req.params.id,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    message: 'Visita removida com sucesso.',
  })
})

/*
====================================================
Confirmar visita
====================================================
*/

export const confirmVisit = asyncHandler(async (req, res) => {
  const visit = await confirmVisitService({
    id: req.params.id,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    message: 'Visita confirmada.',
    data: visit,
  })
})

/*
====================================================
Concluir visita
====================================================
*/

export const completeVisit = asyncHandler(async (req, res) => {
  const visit = await completeVisitService({
    id: req.params.id,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    message: 'Visita concluída.',
    data: visit,
  })
})

/*
====================================================
Cancelar visita
====================================================
*/

export const cancelVisit = asyncHandler(async (req, res) => {
  const visit = await cancelVisitService({
    id: req.params.id,
    body: req.body,
    user: req.user,
  })

  res.status(200).json({
    success: true,
    message: 'Visita cancelada.',
    data: visit,
  })
})

/*
====================================================
Visitas de hoje
====================================================
*/

export const getTodayVisits = asyncHandler(async (req, res) => {
  const visits = await getTodayVisitsService({
    user: req.user,
  })

  res.status(200).json({
    success: true,
    data: visits,
  })
})

/*
====================================================
Próximas visitas
====================================================
*/

export const getUpcomingVisits = asyncHandler(async (req, res) => {
  const visits = await getUpcomingVisitsService({
    user: req.user,
  })

  res.status(200).json({
    success: true,
    data: visits,
  })
})
