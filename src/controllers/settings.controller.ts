import type { Request, Response } from 'express'
import BaseService from '../services/base.service.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { refreshSettings } from '../config/settings.js'

const svc = new BaseService('settings')

export const listSettings = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const perPage = req.query.perPage ? Number(req.query.perPage) : undefined
    const q = req.query.q ? String(req.query.q) : undefined
    const opts: any = { filters: {}, limit: perPage, page, paginate: !!page }
    if (q) opts.search = { q, fields: ['key', 'value', 'description'] }
    const data = await svc.list(opts)
    return sendSuccess(res, data)
  } catch (err: any) {
    console.error('listSettings error', err)
    return sendError(res, 'Failed to list settings', 500)
  }
}

export const getSettingById = async (req: Request, res: Response) => {
  try {
    const global_id = req.params.global_id
    if (!global_id) return sendError(res, 'Missing global_id', 400)
    const row = await svc.findByGlobalId(global_id)
    if (!row) return sendError(res, 'Not found', 404)
    return sendSuccess(res, row)
  } catch (err: any) {
    console.error('getSettingById error', err)
    return sendError(res, 'Failed to get setting', 500)
  }
}

export const createSetting = async (req: Request, res: Response) => {
  try {
    const { key, value, description, status = 1 } = req.body
    if (!key) return sendError(res, 'Missing key', 400)
    const row = await svc.create({ key, value, description, status })
    // reload cache so runtime settings change immediatel
    await refreshSettings()
    return sendSuccess(res, row, 'Setting created')
  } catch (err: any) {
    // Postgres unique violation
    if (err?.code === '23505') return sendError(res, 'Key already exists', 409)
    console.error('createSetting error', err)
    return sendError(res, 'Failed to create setting', 500)
  }
}

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const global_id = req.params.global_id
    if (!global_id) return sendError(res, 'Missing global_id', 400)
    const { key, value, description, status } = req.body
    const row = await svc.updateByGlobalId(global_id, { key, value, description, status })
    if (!row) return sendError(res, 'Not found', 404)
    await refreshSettings()
    return sendSuccess(res, row, 'Setting updated')
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 'Key already exists', 409)
    console.error('updateSetting error', err)
    return sendError(res, 'Failed to update setting', 500)
  }
}

export const deleteSetting = async (req: Request, res: Response) => {
  try {
    const global_id = req.params.global_id
    if (!global_id) return sendError(res, 'Missing global_id', 400)
    await svc.updateStatusByGlobalId(global_id, 2)
    await refreshSettings()
    return sendSuccess(res, null, 'Setting deleted')
  } catch (err: any) {
    console.error('deleteSetting error', err)
    return sendError(res, 'Failed to delete setting', 500)
  }
}

export default { listSettings, getSettingById, createSetting, updateSetting, deleteSetting }
