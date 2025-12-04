export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const

export const RoleAccess = {
  customers: {
    view:   [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER],
    add:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    edit:   [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    delete: [ROLES.SUPERADMIN, ROLES.ADMIN],
  },
  settings: {
    view:   [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER],
    add:    [ROLES.SUPERADMIN, ROLES.ADMIN],
    edit:   [ROLES.SUPERADMIN, ROLES.ADMIN],
    delete: [ROLES.SUPERADMIN, ROLES.ADMIN],
  },
  orders: {
    view:   [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER],
    add:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    edit:   [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    delete: [ROLES.SUPERADMIN, ROLES.ADMIN],
  }
} as const

export const RoleHierarchy: Record<string, string[]> = {
  superadmin: ['admin','staff','viewer'],
  admin:      ['staff','viewer'],
  staff:      ['viewer'],
  viewer:     [],
}