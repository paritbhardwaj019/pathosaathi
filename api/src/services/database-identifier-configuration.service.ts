import { Models } from "./model-factory.service";
import {
  IPartnerIdentifierConfiguration,
  IIdentifierConfig,
} from "@/models/partner-identifier.model";
import { getNextIdentifier } from "@/models/identifier-counter.model";

/**
 * Database-backed Identifier Configuration Manager
 * Replaces in-memory storage with persistent MongoDB storage
 */
export class DatabaseIdentifierConfigManager {
  private static cache = new Map<string, IIdentifierConfig>();
  private static cacheTimeout = 60 * 1000; // 1 minute cache
  private static cacheTimestamps = new Map<string, number>();

  /**
   * Get identifier configuration for a tenant and model (with caching)
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @returns Identifier configuration
   */
  static async getConfig(
    tenantPrefix: string,
    modelName: string
  ): Promise<IIdentifierConfig> {
    const cacheKey = `${tenantPrefix}:${modelName}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const config = await this.loadFromDatabase(tenantPrefix, modelName);

    this.setCache(cacheKey, config);

    return config;
  }

  /**
   * Load configuration from database
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @returns Identifier configuration
   */
  private static async loadFromDatabase(
    tenantPrefix: string,
    modelName: string
  ): Promise<IIdentifierConfig> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();

      const partnerConfig = await (
        PartnerIdentifierConfiguration as any
      ).findByTenantPrefix(tenantPrefix);

      if (partnerConfig && partnerConfig.configurations[modelName]) {
        return partnerConfig.configurations[modelName] as IIdentifierConfig;
      }

      return this.getDefaultConfig(tenantPrefix, modelName);
    } catch (error) {
      console.error(
        `Error loading identifier config for ${tenantPrefix}:${modelName}`,
        error
      );
      return this.getDefaultConfig(tenantPrefix, modelName);
    }
  }

  /**
   * Get default configuration
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @returns Default identifier configuration
   */
  private static getDefaultConfig(
    tenantPrefix: string,
    modelName: string
  ): IIdentifierConfig {
    // Extract prefix from tenant prefix or use PS as default
    let prefix = "PS";

    if (tenantPrefix !== "PS_ROOT") {
      // Try to extract partner prefix from tenant prefix
      // Format: APOLLO_BLR_1234 -> APOLLO
      const parts = tenantPrefix.split("_");
      if (parts.length >= 2 && parts[0] !== "PS") {
        prefix = parts[0];
      }
    }

    const defaults: { [key: string]: IIdentifierConfig } = {
      User: {
        prefix,
        format: "USR_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Partner: {
        prefix,
        format: "PTR_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Lab: {
        prefix,
        format: "LAB_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Patient: {
        prefix,
        format: "PAT_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Test: {
        prefix,
        format: "TST_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      TestOrder: {
        prefix,
        format: "ORD_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      LabSubscription: {
        prefix,
        format: "SUB_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Plan: {
        prefix,
        format: "PLN_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      PlanType: {
        prefix,
        format: "PLT_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      PartnerIdentifierConfiguration: {
        prefix: "PS",
        format: "IDC_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
    };

    return defaults[modelName] || defaults.User;
  }

  /**
   * Set/update identifier configuration for a tenant and model
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @param config - New configuration
   * @param modifiedBy - User making the change
   */
  static async setModelConfig(
    tenantPrefix: string,
    modelName: string,
    config: Partial<IIdentifierConfig>,
    modifiedBy: string
  ): Promise<void> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();

      let partnerConfig = await (
        PartnerIdentifierConfiguration as any
      ).findByTenantPrefix(tenantPrefix);

      if (!partnerConfig) {
        throw new Error(
          `Partner identifier configuration not found for tenant: ${tenantPrefix}`
        );
      }

      // Update the specific model configuration
      const currentConfig = partnerConfig.getModelConfig(modelName);
      const updatedConfig = { ...currentConfig, ...config };

      partnerConfig.updateModelConfig(modelName, updatedConfig);
      partnerConfig.lastModifiedBy = modifiedBy;

      // Add to change history
      partnerConfig.changeHistory.push({
        version: partnerConfig.version,
        changes: `Updated ${modelName} configuration`,
        modifiedBy,
        modifiedAt: new Date(),
      });

      await partnerConfig.save();

      // Clear cache for this configuration
      const cacheKey = `${tenantPrefix}:${modelName}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    } catch (error) {
      console.error(
        `Error setting identifier config for ${tenantPrefix}:${modelName}`,
        error
      );
      throw error;
    }
  }

  /**
   * Apply a template to partner's configuration
   * @param tenantPrefix - Tenant prefix
   * @param templateName - Template to apply
   * @param modifiedBy - User applying the template
   */
  static async applyTemplate(
    tenantPrefix: string,
    templateName: string,
    modifiedBy: string
  ): Promise<void> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();

      const partnerConfig = await (
        PartnerIdentifierConfiguration as any
      ).findByTenantPrefix(tenantPrefix);

      if (!partnerConfig) {
        throw new Error(
          `Partner identifier configuration not found for tenant: ${tenantPrefix}`
        );
      }

      partnerConfig.applyTemplate(templateName, modifiedBy);
      partnerConfig.lastModifiedBy = modifiedBy;

      await partnerConfig.save();

      // Clear all cached configurations for this tenant
      this.clearTenantCache(tenantPrefix);
    } catch (error) {
      console.error(`Error applying template for ${tenantPrefix}`, error);
      throw error;
    }
  }

  /**
   * Create default configuration for a new partner
   * @param tenantPrefix - Tenant prefix
   * @param partnerId - Partner ID
   * @param partnerName - Partner name
   * @param globalPrefix - Global identifier prefix
   * @param createdBy - User creating the configuration
   */
  static async createDefaultConfiguration(
    tenantPrefix: string,
    partnerId: string,
    partnerName: string,
    globalPrefix: string,
    createdBy: string
  ): Promise<IPartnerIdentifierConfiguration> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();

      const existing = await (
        PartnerIdentifierConfiguration as any
      ).findByTenantPrefix(tenantPrefix);
      if (existing) {
        return existing;
      }

      return await (
        PartnerIdentifierConfiguration as any
      ).createDefaultConfiguration(
        tenantPrefix,
        partnerId,
        partnerName,
        globalPrefix,
        createdBy
      );
    } catch (error) {
      console.error(
        `Error creating default configuration for ${tenantPrefix}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get full configuration for a tenant
   * @param tenantPrefix - Tenant prefix
   * @returns Full partner identifier configuration
   */
  static async getFullConfiguration(
    tenantPrefix: string
  ): Promise<IPartnerIdentifierConfiguration | null> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();
      return await (PartnerIdentifierConfiguration as any).findByTenantPrefix(
        tenantPrefix
      );
    } catch (error) {
      console.error(
        `Error getting full configuration for ${tenantPrefix}`,
        error
      );
      return null;
    }
  }

  /**
   * Update usage statistics
   * @param tenantPrefix - Tenant prefix
   * @param increment - Increment value
   */
  static async updateUsageStats(
    tenantPrefix: string,
    increment: number = 1
  ): Promise<void> {
    try {
      const PartnerIdentifierConfiguration =
        Models.getPartnerIdentifierConfiguration();
      await (PartnerIdentifierConfiguration as any).updateUsageStats(
        tenantPrefix,
        increment
      );
    } catch (error) {
      console.error(`Error updating usage stats for ${tenantPrefix}`, error);
    }
  }

  /**
   * Generate identifier using configuration
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @returns Generated identifier
   */
  static async generateIdentifier(
    tenantPrefix: string,
    modelName: string
  ): Promise<string> {
    try {
      const config = await this.getConfig(tenantPrefix, modelName);
      const counter = await this.getNextCounter(
        tenantPrefix,
        modelName,
        config.resetFrequency
      );

      const identifier = this.formatIdentifier(config, counter);

      await this.updateUsageStats(tenantPrefix);

      return identifier;
    } catch (error) {
      console.error(
        `Error generating identifier for ${tenantPrefix}:${modelName}`,
        error
      );
      throw error;
    }
  }

  /**
   * Format identifier using template
   * @param config - Identifier configuration
   * @param counter - Counter value
   * @returns Generated identifier
   */
  private static formatIdentifier(
    config: IIdentifierConfig,
    counter: number
  ): string {
    const dateStr = this.formatDate(config.dateFormat);
    const counterStr = String(counter).padStart(config.counterLength, "0");

    const identifierBody = config.format
      .replace("{DATE_FORMAT}", dateStr)
      .replace("{TODAYS_ENTRY}", counterStr)
      .replace("{COUNTER}", counterStr);

    // Combine prefix with identifier body
    if (config.prefix) {
      return `${config.prefix}${config.separator}${identifierBody}`;
    }

    return identifierBody;
  }

  /**
   * Get next counter value
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Model name
   * @param resetFrequency - Reset frequency
   * @returns Next counter value
   */
  private static async getNextCounter(
    tenantPrefix: string,
    modelName: string,
    resetFrequency: string
  ): Promise<number> {
    // TODO: This method needs proper implementation to get counter from IdentifierCounter model
    // Currently, getNextIdentifier() already increments and formats the identifier
    // This method should get the current counter, increment it, and return the number
    // For now, we extract a counter-like value from a generated identifier as a workaround
    // In production, integrate with IdentifierCounter.getCurrentCounter() and increment logic

    // Workaround: Generate identifier to increment counter, then extract numeric part
    // This is not ideal but works until proper counter access is implemented
    const identifier = await getNextIdentifier(tenantPrefix, modelName);
    const match = identifier.match(/\d+$/);
    const counter = match ? parseInt(match[0], 10) : 1;

    // Use resetFrequency parameter to avoid unused variable warning
    void resetFrequency;

    return counter;
  }

  /**
   * Format date based on configuration
   * @param format - Date format
   * @returns Formatted date string
   */
  private static formatDate(format: string): string {
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

  // Cache management methods
  private static getFromCache(key: string): IIdentifierConfig | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.cacheTimeout) {
      return this.cache.get(key) || null;
    }

    // Remove expired cache entry
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    return null;
  }

  private static setCache(key: string, config: IIdentifierConfig): void {
    this.cache.set(key, config);
    this.cacheTimestamps.set(key, Date.now());
  }

  private static clearTenantCache(tenantPrefix: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(`${tenantPrefix}:`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Clear all cache (useful for testing or manual refresh)
   */
  static clearAllCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

export async function getConfiguredIdentifier(
  tenantPrefix: string,
  modelName: string
): Promise<string> {
  return await DatabaseIdentifierConfigManager.generateIdentifier(
    tenantPrefix,
    modelName
  );
}

export default DatabaseIdentifierConfigManager;
