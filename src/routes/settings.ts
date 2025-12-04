import express from 'express'
import { auth } from '../middlewares/auth.js'
import { authorizeAction } from '../middlewares/authorizeAction.js'
import { listSettings, getSettingById, createSetting, updateSetting, deleteSetting } from '../controllers/settings.controller.js'

const r = express.Router()

r.get('/', auth, authorizeAction('settings', 'view'), listSettings)
// use global_id (UUID) in path for lookup/update/delete
r.get('/:global_id', auth, authorizeAction('settings', 'view'), getSettingById)
r.post('/', auth, authorizeAction('settings', 'add'), createSetting)
r.patch('/:global_id', auth, authorizeAction('settings', 'edit'), updateSetting)
r.delete('/:global_id', auth, authorizeAction('settings', 'delete'), deleteSetting)

export default r
