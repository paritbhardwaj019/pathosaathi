/**
 * Tenant Configuration for PathoSaathi
 * Defines tenant types and handles tenant isolation at model level
 * Supports full prefix customization by partners
 */

export const TENANT_TYPES = {
  ROOT: "ROOT",
  PARTNER: "PARTNER",
} as const;

export type TenantType = (typeof TENANT_TYPES)[keyof typeof TENANT_TYPES];

/**
 * Default tenant identifiers
 */
export const DEFAULT_TENANTS = {
  ROOT: "PS_ROOT",
} as const;

/**
 * Tenant prefix configuration interface
 */
export interface TenantPrefixConfig {
  collectionPrefix: string;
  identifierPrefix: string;
  companyName: string;
  customDomain?: string;
}

/**
 * Partner tenant configurations storage
 */
export class TenantConfigManager {
  private static configs = new Map<string, TenantPrefixConfig>();

  /**
   * Set tenant prefix configuration
   */
  static setTenantConfig(
    tenantPrefix: string,
    config: TenantPrefixConfig
  ): void {
    this.configs.set(tenantPrefix, config);
  }

  /**
   * Get tenant prefix configuration
   */
  static getTenantConfig(tenantPrefix: string): TenantPrefixConfig | null {
    return this.configs.get(tenantPrefix) || null;
  }

  /**
   * Get identifier prefix for a tenant
   */
  static getIdentifierPrefix(tenantPrefix: string): string {
    const config = this.configs.get(tenantPrefix);
    return config ? config.identifierPrefix : "PS";
  }

  /**
   * Get all tenant configurations
   */
  static getAllConfigs(): Map<string, TenantPrefixConfig> {
    return new Map(this.configs);
  }

  /**
   * Remove tenant configuration
   */
  static removeTenantConfig(tenantPrefix: string): void {
    this.configs.delete(tenantPrefix);
  }
}

/**
 * Generate tenant-specific collection name
 * This creates isolated collections per tenant
 * @param tenantPrefix - Tenant identifier prefix
 * @param modelName - Base model name
 * @returns Tenant-specific collection name
 */
export const getTenantCollectionName = (
  tenantPrefix: string,
  modelName: string
): string => {
  return `${tenantPrefix}_${modelName}`;
};

/**
 * Generate unique tenant prefix for partners with custom naming
 * @param partnerName - Partner company name
 * @param partnerCode - Partner code
 * @param customPrefix - Custom prefix if provided
 * @returns Tenant prefix for partner
 */
export const generatePartnerTenantPrefix = (
  partnerName: string,
  partnerCode: string,
  customPrefix?: string
): string => {
  if (customPrefix) {
    const cleanPrefix = customPrefix
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 10);

    const shortId = partnerCode.substring(0, 4).toUpperCase();
    return `${cleanPrefix}_${shortId}`;
  }

  const cleanName = partnerName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 8);

  const shortId = partnerCode.substring(0, 4).toUpperCase();
  return `PS_${cleanName}_${shortId}`;
};

/**
 * Validate tenant prefix format (more flexible for custom prefixes)
 * @param prefix - Tenant prefix to validate
 * @returns Boolean indicating if prefix is valid
 */
export const isValidTenantPrefix = (prefix: string): boolean => {
  return /^[A-Z0-9_]{3,25}$/.test(prefix);
};

/**
 * Initialize partner tenant configuration
 * @param partnerName - Partner company name
 * @param partnerCode - Partner code
 * @param customPrefix - Optional custom identifier prefix
 * @param customCollectionPrefix - Optional custom collection prefix
 * @returns Tenant prefix configuration
 */
export const initializePartnerTenant = (
  partnerName: string,
  partnerCode: string,
  customPrefix?: string,
  customCollectionPrefix?: string
): { tenantPrefix: string; config: TenantPrefixConfig } => {
  const tenantPrefix = generatePartnerTenantPrefix(
    partnerName,
    partnerCode,
    customCollectionPrefix
  );

  const config: TenantPrefixConfig = {
    collectionPrefix: tenantPrefix,
    identifierPrefix: customPrefix || partnerName.substring(0, 8).toUpperCase(),
    companyName: partnerName,
  };

  TenantConfigManager.setTenantConfig(tenantPrefix, config);

  return { tenantPrefix, config };
};
