/**
 * Identifier Configuration System for PathoSaathi
 * Allows tenants to customize identifier prefixes and formats
 */
export interface IdentifierConfig {
  prefix: string;
  format: string;
  separator: string;
  dateFormat: "YYYYMMDD" | "YYMMDD" | "DDMMYYYY" | "MMDDYYYY" | "YY" | "YYYY";
  counterLength: number;
  resetFrequency: "DAILY" | "MONTHLY" | "YEARLY" | "NEVER";
}

export interface ModelIdentifierConfig {
  [modelName: string]: IdentifierConfig;
}

/**
 * Default identifier configurations
 */
export const DEFAULT_IDENTIFIER_CONFIG: ModelIdentifierConfig = {
  User: {
    prefix: "PS",
    format: "USR_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Partner: {
    prefix: "PS",
    format: "PTR_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Lab: {
    prefix: "PS",
    format: "LAB_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Patient: {
    prefix: "PS",
    format: "PAT_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Test: {
    prefix: "PS",
    format: "TST_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  TestOrder: {
    prefix: "PS",
    format: "ORD_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  LabSubscription: {
    prefix: "PS",
    format: "SUB_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Theme: {
    prefix: "PS",
    format: "THM_{COUNTER}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "NEVER",
  },
  Branding: {
    prefix: "PS",
    format: "BRD_{DATE_FORMAT}_{TODAYS_ENTRY}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "DAILY",
  },
  Font: {
    prefix: "PS",
    format: "FNT_{COUNTER}",
    separator: "_",
    dateFormat: "YYMMDD",
    counterLength: 4,
    resetFrequency: "NEVER",
  },
};

/**
 * Partner-specific identifier configurations storage
 */
export class IdentifierConfigManager {
  private static configs = new Map<string, ModelIdentifierConfig>();

  /**
   * Set identifier configuration for a tenant
   */
  static setTenantConfig(
    tenantPrefix: string,
    config: ModelIdentifierConfig
  ): void {
    this.configs.set(tenantPrefix, config);
  }

  /**
   * Get identifier configuration for a tenant and model
   */
  static getConfig(tenantPrefix: string, modelName: string): IdentifierConfig {
    const tenantConfig = this.configs.get(tenantPrefix);

    if (tenantConfig && tenantConfig[modelName]) {
      return tenantConfig[modelName];
    }

    return (
      DEFAULT_IDENTIFIER_CONFIG[modelName] || DEFAULT_IDENTIFIER_CONFIG.User
    );
  }

  /**
   * Update specific model config for a tenant
   */
  static updateModelConfig(
    tenantPrefix: string,
    modelName: string,
    config: IdentifierConfig
  ): void {
    if (!this.configs.has(tenantPrefix)) {
      this.configs.set(tenantPrefix, {});
    }

    const tenantConfig = this.configs.get(tenantPrefix)!;
    tenantConfig[modelName] = config;
  }

  /**
   * Get all configurations for a tenant
   */
  static getTenantConfig(tenantPrefix: string): ModelIdentifierConfig {
    return this.configs.get(tenantPrefix) || {};
  }

  /**
   * Reset configuration for a tenant
   */
  static resetTenantConfig(tenantPrefix: string): void {
    this.configs.delete(tenantPrefix);
  }
}

/**
 * Generate date string based on format
 */
export function formatDate(format: IdentifierConfig["dateFormat"]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  switch (format) {
    case "YYYYMMDD":
      return `${year}${month}${day}`;
    case "YYMMDD":
      return `${String(year).slice(-2)}${month}${day}`;
    case "DDMMYYYY":
      return `${day}${month}${year}`;
    case "MMDDYYYY":
      return `${month}${day}${year}`;
    case "YY":
      return String(year).slice(-2);
    case "YYYY":
      return String(year);
    default:
      return `${String(year).slice(-2)}${month}${day}`;
  }
}

/**
 * Get reset key based on frequency
 */
export function getResetKey(
  frequency: IdentifierConfig["resetFrequency"]
): string {
  const now = new Date();

  switch (frequency) {
    case "DAILY":
      return now.toISOString().slice(0, 10);
    case "MONTHLY":
      return now.toISOString().slice(0, 7);
    case "YEARLY":
      return now.getFullYear().toString();
    case "NEVER":
      return "all-time";
    default:
      return now.toISOString().slice(0, 10);
  }
}

/**
 * Parse identifier format template
 */
export function parseIdentifierFormat(
  format: string,
  config: IdentifierConfig,
  counter: number
): string {
  const dateStr = formatDate(config.dateFormat);
  const counterStr = String(counter).padStart(config.counterLength, "0");

  return format
    .replace("{DATE_FORMAT}", dateStr)
    .replace("{TODAYS_ENTRY}", counterStr)
    .replace("{COUNTER}", counterStr);
}

/**
 * Generate full identifier
 */
export function generateIdentifier(
  tenantPrefix: string,
  modelName: string,
  counter: number
): string {
  const config = IdentifierConfigManager.getConfig(tenantPrefix, modelName);
  const identifierBody = parseIdentifierFormat(config.format, config, counter);

  if (config.prefix) {
    return `${config.prefix}${config.separator}${identifierBody}`;
  }

  return identifierBody;
}
