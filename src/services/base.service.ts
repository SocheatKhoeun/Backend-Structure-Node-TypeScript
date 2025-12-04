import { query } from '../db/index.js'

type FilterValue = string | number | Array<string | number> | { op: string; value: any }

export type ListOptions = {
  filters?: Record<string, FilterValue>
  search?: { q: string; fields: string[] }
  joins?: Array<{ table: string; alias?: string; on: string }>
  select?: string[]
  orderBy?: Array<{ field: string; dir?: 'ASC' | 'DESC' }>
  limit?: number
  page?: number
  offset?: number
  paginate?: boolean
}

export class BaseService {
  table: string

  constructor(table: string) {
    this.table = table
  }

  // create a new row, returns the inserted row
  async create(data: Record<string, any>) {
    const keys = Object.keys(data)
    const params: any[] = []
    const cols = keys.map((k, i) => {
      params.push(data[k])
      return `$${i + 1}`
    })
    const sql = `INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${cols.join(',')}) RETURNING *`
    const result = await query(sql, params)
    return result.rows[0]
  }

  // update by id (assumes pk column 'id')
  async update(id: string | number, data: Record<string, any>) {
    const keys = Object.keys(data)
    if (keys.length === 0) return null
    const params: any[] = []
    const sets = keys.map((k, i) => {
      params.push(data[k])
      return `${k} = $${i + 1}`
    })
    params.push(id)
    const sql = `UPDATE ${this.table} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`
    const result = await query(sql, params)
    return result.rows[0]
  }

  // update status or soft-delete
  async updateStatus(id: string | number, status: number) {
    const sql = `UPDATE ${this.table} SET status = $1, updated_at = NOW() ${status === 2 ? ', deleted_at = NOW()' : ''} WHERE id = $2 RETURNING *`
    const result = await query(sql, [status, id])
    return result.rows[0]
  }

  // find by id
  async find(id: string | number, select?: string[]) {
    const cols = select && select.length ? select.join(',') : '*'
    const sql = `SELECT ${cols} FROM ${this.table} WHERE id = $1 LIMIT 1`
    const result = await query(sql, [id])
    return result.rows[0]
  }

  // find by global_id (UUID string)
  async findByGlobalId(globalId: string, select?: string[]) {
    const cols = select && select.length ? select.join(',') : '*'
    const sql = `SELECT ${cols} FROM ${this.table} WHERE global_id = $1 LIMIT 1`
    const result = await query(sql, [globalId])
    return result.rows[0]
  }

  // get primary id by global_id (returns numeric id or null)
  async getIdByGlobalId(globalId: string) {
    const sql = `SELECT id FROM ${this.table} WHERE global_id = $1 LIMIT 1`
    const result = await query(sql, [globalId])
    return result.rows[0] ? result.rows[0].id : null
  }

  // update by global_id
  async updateByGlobalId(globalId: string, data: Record<string, any>) {
    const keys = Object.keys(data)
    if (keys.length === 0) return null
    const params: any[] = []
    const sets = keys.map((k, i) => {
      params.push(data[k])
      return `${k} = $${i + 1}`
    })
    params.push(globalId)
    const sql = `UPDATE ${this.table} SET ${sets.join(', ')}, updated_at = NOW() WHERE global_id = $${params.length} RETURNING *`
    const result = await query(sql, params)
    return result.rows[0]
  }

  // update status or soft-delete by global_id
  async updateStatusByGlobalId(globalId: string, status: number) {
    const sql = `UPDATE ${this.table} SET status = $1, updated_at = NOW() ${status === 2 ? ', deleted_at = NOW()' : ''} WHERE global_id = $2 RETURNING *`
    const result = await query(sql, [status, globalId])
    return result.rows[0]
  }

  // build where clause from filters and search; returns { whereSql, params }
  private buildWhere(opts: ListOptions) {
    const where: string[] = []
    const params: any[] = []
    let idx = 1

    if (opts?.filters) {
      for (const [k, v] of Object.entries(opts.filters)) {
        if (Array.isArray(v)) {
          const placeholders = v.map(() => `$${idx++}`)
          params.push(...v)
          where.push(`${k} IN (${placeholders.join(',')})`)
        } else if (typeof v === 'object' && v !== null && 'op' in v) {
          params.push((v as any).value)
          where.push(`${k} ${(v as any).op} $${idx++}`)
        } else {
          params.push(v as any)
          where.push(`${k} = $${idx++}`)
        }
      }
    }

    if (opts?.search && opts.search.q) {
      const q = `%${opts.search.q}%`
      const parts: string[] = []
      for (const f of opts.search.fields) {
        params.push(q)
        parts.push(`${f} ILIKE $${idx++}`)
      }
      if (parts.length) where.push(`(${parts.join(' OR ')})`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    return { whereSql, params }
  }

  // list with options: joins, filters, search, order, pagination
  async list(opts: ListOptions = {}) {
    const select = opts.select && opts.select.length ? opts.select.join(',') : `${this.table}.*`

    // build joins
    const joinsSql = (opts.joins || [])
      .map((j) => `LEFT JOIN ${j.table} ${j.alias ?? ''} ON ${j.on}`)
      .join(' ')

    const { whereSql, params } = this.buildWhere(opts)

    // order
    const orderSql = opts.orderBy && opts.orderBy.length ? `ORDER BY ${opts.orderBy.map(o => `${o.field} ${o.dir ?? 'DESC'}`).join(',')}` : `ORDER BY ${this.table}.id DESC`

    // pagination
    const limit = opts.limit ?? (opts.paginate ? 20 : undefined)
    const offset = opts.offset ?? (opts.page ? ((opts.page - 1) * (limit ?? 20)) : undefined)

    const limitSql = limit ? `LIMIT ${limit}` : ''
    const offsetSql = offset ? `OFFSET ${offset}` : ''

    const sql = `SELECT ${select} FROM ${this.table} ${joinsSql} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`
    const result = await query(sql, params)

    if (opts.paginate) {
      // count total
      const countSql = `SELECT COUNT(*) as total FROM ${this.table} ${joinsSql} ${whereSql}`
      const countRes = await query(countSql, params)
      const total = Number(countRes.rows[0]?.total ?? 0)
      const perPage = limit ?? 20
      const page = opts.page ?? 1
      return { rows: result.rows, total, perPage, page }
    }

    return result.rows
  }
}

export default BaseService
