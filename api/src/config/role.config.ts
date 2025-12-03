/**
 * Role Configuration for PathoSaathi
 * Defines all user roles in the system
 */

export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  PARTNER: "PARTNER",
  LAB_OWNER: "LAB_OWNER",
  TECH: "TECH",
  RECEPTION: "RECEPTION",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */

export const ROLE_HIERARCHY: UserRole[] = [
  ROLES.TECH,
  ROLES.RECEPTION,
  ROLES.LAB_OWNER,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.PARTNER,
  ROLES.SUPERADMIN,
];

/**
 * Check if a role has higher or equal permissions than another
 */
export const hasRolePermission = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userIndex >= requiredIndex;
};

/**
 * Partner types
 */
export const PARTNER_TYPES = {
  COMMISSION: "COMMISSION",
  WHITE_LABEL: "WHITE_LABEL",
} as const;

export type PartnerType = (typeof PARTNER_TYPES)[keyof typeof PARTNER_TYPES];

/**
 * Registration fees by partner type
 */
export const PARTNER_FEES = {
  [PARTNER_TYPES.COMMISSION]: 999,
  [PARTNER_TYPES.WHITE_LABEL]: 3999,
} as const;
