import mongoose, { Model } from "mongoose";
import { getTenantModel } from "@/models/base.model";
import {
  DEFAULT_TENANTS,
  generatePartnerTenantPrefix,
  getTenantCollectionName,
} from "@/config/tenant.config";
import { userSchema, IUser } from "@/models/user.model";
import { partnerSchema, IPartner } from "@/models/partner.model";
import { labSchema, ILab } from "@/models/lab.model";
import { addressSchema, IAddress } from "@/models/address.model";
import {
  labSubscriptionSchema,
  ILabSubscription,
} from "@/models/lab-subscription.model";
import {
  workingHoursSchema,
  IWorkingHours,
} from "@/models/working-hours.model";
import {
  apiIntegrationSchema,
  IApiIntegration,
} from "@/models/api-integration.model";
import {
  partnerIdentifierConfigurationSchema,
  IPartnerIdentifierConfiguration,
} from "@/models/partner-identifier.model";
import { themeSchema, ITheme } from "@/models/theme.model";
import { brandingSchema, IBranding } from "@/models/branding.model";
import { fontSchema, IFont } from "@/models/font.model";

/**
 * Model Factory Service for PathoSaathi
 * Handles tenant-aware model creation and retrieval
 */
export class ModelFactory {
  private static modelCache = new Map<string, Model<any>>();

  /**
   * Register a model with both its tenant-specific name and ref name
   * This ensures populate operations can find models by their ref name
   * @param tenantPrefix - Tenant prefix
   * @param modelName - Base model name (used as ref name)
   * @param schema - Mongoose schema
   */
  private static registerModelWithRefName(
    tenantPrefix: string,
    modelName: string,
    schema: any
  ): void {
    try {
      const collectionName = getTenantCollectionName(tenantPrefix, modelName);
      // Register with the ref name so populate can find it
      if (!mongoose.models[modelName]) {
        mongoose.model(modelName, schema, collectionName);
      }
    } catch (error) {
      // Model already exists or error registering, continue silently
      // This is expected if the model was already registered
    }
  }

  /**
   * Get User model for a specific tenant
   */
  static getUserModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<IUser> {
    const cacheKey = `${tenantPrefix}_User`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IUser>;
    }

    const model = getTenantModel<IUser>(tenantPrefix, "User", userSchema);
    this.modelCache.set(cacheKey, model);
    return model;
  }

  /**
   * Get Partner model for ROOT tenant only (partners are global)
   */
  static getPartnerModel(): Model<IPartner> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_Partner`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IPartner>;
    }

    const model = getTenantModel<IPartner>(
      tenantPrefix,
      "Partner",
      partnerSchema
    );
    this.modelCache.set(cacheKey, model);

    // Register with ref name for populate operations
    this.registerModelWithRefName(tenantPrefix, "Partner", partnerSchema);

    return model;
  }

  /**
   * Get Lab model for a specific tenant
   */
  static getLabModel(tenantPrefix: string = DEFAULT_TENANTS.ROOT): Model<ILab> {
    const cacheKey = `${tenantPrefix}_Lab`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<ILab>;
    }

    const model = getTenantModel<ILab>(tenantPrefix, "Lab", labSchema);
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(tenantPrefix, "Lab", labSchema);

    return model;
  }

  /**
   * Get Address model for a specific tenant
   */
  static getAddressModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<IAddress> {
    const cacheKey = `${tenantPrefix}_Address`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IAddress>;
    }

    const model = getTenantModel<IAddress>(
      tenantPrefix,
      "Address",
      addressSchema
    );
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(tenantPrefix, "Address", addressSchema);

    return model;
  }

  /**
   * Get Working Hours model for a specific tenant
   */
  static getWorkingHoursModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<IWorkingHours> {
    const cacheKey = `${tenantPrefix}_WorkingHours`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IWorkingHours>;
    }

    const model = getTenantModel<IWorkingHours>(
      tenantPrefix,
      "WorkingHours",
      workingHoursSchema
    );
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(
      tenantPrefix,
      "WorkingHours",
      workingHoursSchema
    );

    return model;
  }

  /**
   * Get API Integration model for a specific tenant
   */
  static getApiIntegrationModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<IApiIntegration> {
    const cacheKey = `${tenantPrefix}_ApiIntegration`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IApiIntegration>;
    }

    const model = getTenantModel<IApiIntegration>(
      tenantPrefix,
      "ApiIntegration",
      apiIntegrationSchema
    );
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(
      tenantPrefix,
      "ApiIntegration",
      apiIntegrationSchema
    );

    return model;
  }

  /**
   * Get Lab Subscription model for a specific tenant
   */
  static getLabSubscriptionModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<ILabSubscription> {
    const cacheKey = `${tenantPrefix}_LabSubscription`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<ILabSubscription>;
    }

    const model = getTenantModel<ILabSubscription>(
      tenantPrefix,
      "LabSubscription",
      labSubscriptionSchema
    );
    this.modelCache.set(cacheKey, model);
    return model;
  }

  /**
   * Get Partner Identifier Configuration model for ROOT tenant only
   * (identifier configurations are global and stored in ROOT tenant)
   */
  static getPartnerIdentifierConfigurationModel(): Model<IPartnerIdentifierConfiguration> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_PartnerIdentifierConfiguration`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IPartnerIdentifierConfiguration>;
    }

    const model = getTenantModel<IPartnerIdentifierConfiguration>(
      tenantPrefix,
      "PartnerIdentifierConfiguration",
      partnerIdentifierConfigurationSchema
    );
    this.modelCache.set(cacheKey, model);
    return model;
  }

  /**
   * Get Theme model for ROOT tenant only (themes are global design system)
   */
  static getThemeModel(): Model<ITheme> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_Theme`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<ITheme>;
    }

    const model = getTenantModel<ITheme>(tenantPrefix, "Theme", themeSchema);
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(tenantPrefix, "Theme", themeSchema);

    return model;
  }

  /**
   * Get Branding model for ROOT tenant only (brandings are global)
   */
  static getBrandingModel(): Model<IBranding> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_Branding`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IBranding>;
    }

    const model = getTenantModel<IBranding>(
      tenantPrefix,
      "Branding",
      brandingSchema
    );
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(tenantPrefix, "Branding", brandingSchema);

    return model;
  }

  /**
   * Get Font model for ROOT tenant only (fonts are global)
   */
  static getFontModel(): Model<IFont> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_Font`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached as Model<IFont>;
    }

    const model = getTenantModel<IFont>(tenantPrefix, "Font", fontSchema);
    this.modelCache.set(cacheKey, model);

    this.registerModelWithRefName(tenantPrefix, "Font", fontSchema);

    return model;
  }

  /**
   * Get Patient model for a specific tenant
   * TODO: Implement when patient.model.ts is created
   */
  static getPatientModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<any> {
    const cacheKey = `${tenantPrefix}_Patient`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // TODO: Uncomment when patient.model.ts is created
    // const model = getTenantModel<IPatient>(
    //   tenantPrefix,
    //   "Patient",
    //   patientSchema
    // );
    // this.modelCache.set(cacheKey, model);
    // return model;
    throw new Error("Patient model not yet implemented");
  }

  /**
   * Get Test model for ROOT tenant (tests are global catalog)
   * TODO: Implement when test.model.ts is created
   */
  static getTestModel(): Model<any> {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;
    const cacheKey = `${tenantPrefix}_Test`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // TODO: Uncomment when test.model.ts is created
    // const model = getTenantModel<ITest>(tenantPrefix, "Test", testSchema);
    // this.modelCache.set(cacheKey, model);
    // return model;
    throw new Error("Test model not yet implemented");
  }

  /**
   * Get Test Order model for a specific tenant
   * TODO: Implement when test-order.model.ts is created
   */
  static getTestOrderModel(
    tenantPrefix: string = DEFAULT_TENANTS.ROOT
  ): Model<any> {
    const cacheKey = `${tenantPrefix}_TestOrder`;

    const cached = this.modelCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // TODO: Uncomment when test-order.model.ts is created
    // const model = getTenantModel<ITestOrder>(
    //   tenantPrefix,
    //   "TestOrder",
    //   testOrderSchema
    // );
    // this.modelCache.set(cacheKey, model);
    // return model;
    throw new Error("TestOrder model not yet implemented");
  }

  /**
   * Create partner tenant and return tenant prefix
   */
  static async createPartnerTenant(partner: IPartner): Promise<string> {
    const partnerId =
      typeof partner._id === "string"
        ? partner._id
        : (partner._id as any)?.toString() || "";
    const tenantPrefix = generatePartnerTenantPrefix(
      partner.companyName,
      partnerId
    );

    // Initialize partner-specific models
    this.getUserModel(tenantPrefix);
    this.getLabModel(tenantPrefix);
    this.getLabSubscriptionModel(tenantPrefix);
    // TODO: Uncomment when these models are implemented
    // this.getPatientModel(tenantPrefix);
    // this.getTestOrderModel(tenantPrefix);

    return tenantPrefix;
  }

  /**
   * Get all models for a specific tenant
   */
  static getAllModels(tenantPrefix: string = DEFAULT_TENANTS.ROOT) {
    return {
      User: this.getUserModel(tenantPrefix),
      Partner: this.getPartnerModel(), // Always from ROOT tenant
      Lab: this.getLabModel(tenantPrefix),
      Address: this.getAddressModel(tenantPrefix),
      WorkingHours: this.getWorkingHoursModel(tenantPrefix),
      ApiIntegration: this.getApiIntegrationModel(tenantPrefix),
      LabSubscription: this.getLabSubscriptionModel(tenantPrefix),
      PartnerIdentifierConfiguration:
        this.getPartnerIdentifierConfigurationModel(), // Always from ROOT tenant
      Theme: this.getThemeModel(), // Always from ROOT tenant
      Branding: this.getBrandingModel(), // Always from ROOT tenant
      Font: this.getFontModel(), // Always from ROOT tenant
      // TODO: Uncomment when these models are implemented
      // Patient: this.getPatientModel(tenantPrefix),
      // Test: this.getTestModel(), // Always from ROOT tenant
      // TestOrder: this.getTestOrderModel(tenantPrefix),
    };
  }

  /**
   * Get models for superadmin (ROOT tenant)
   */
  static getRootModels() {
    return this.getAllModels(DEFAULT_TENANTS.ROOT);
  }

  /**
   * Determine tenant prefix based on user context
   */
  static getTenantPrefixForUser(user: any): string {
    // Superadmin always uses ROOT tenant
    if (user.role === "SUPERADMIN") {
      return DEFAULT_TENANTS.ROOT;
    }

    // Partners use ROOT tenant for their own data
    if (user.role === "PARTNER") {
      return DEFAULT_TENANTS.ROOT;
    }

    // Lab users use their lab's partner tenant (if exists) or ROOT
    if (["LAB_OWNER", "TECH", "RECEPTION"].includes(user.role)) {
      if (user.lab && user.lab.partner) {
        // Generate tenant prefix for the partner
        const partnerId =
          typeof user.lab.partner._id === "string"
            ? user.lab.partner._id
            : (user.lab.partner._id as any)?.toString() || "";
        return generatePartnerTenantPrefix(
          user.lab.partner.companyName,
          partnerId
        );
      }
      return DEFAULT_TENANTS.ROOT; // Direct customer labs
    }

    // Default to ROOT tenant
    return DEFAULT_TENANTS.ROOT;
  }

  /**
   * Clear model cache for a specific tenant
   */
  static clearTenantCache(tenantPrefix: string): void {
    const keysToDelete = Array.from(this.modelCache.keys()).filter((key) =>
      key.startsWith(tenantPrefix)
    );

    keysToDelete.forEach((key) => {
      this.modelCache.delete(key);
    });
  }

  /**
   * Clear entire model cache
   */
  static clearAllCache(): void {
    this.modelCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      totalModels: this.modelCache.size,
      cachedModels: Array.from(this.modelCache.keys()),
    };
  }

  /**
   * Initialize all core models for ROOT tenant
   * This ensures all models are registered with their ref names at app startup
   * Call this method after database connection is established
   */
  static initializeCoreModels(): void {
    const tenantPrefix = DEFAULT_TENANTS.ROOT;

    try {
      this.getPartnerModel();
      this.getLabModel(tenantPrefix);
      this.getAddressModel(tenantPrefix);
      this.getWorkingHoursModel(tenantPrefix);
      this.getApiIntegrationModel(tenantPrefix);
      this.getUserModel(tenantPrefix);
      this.getLabSubscriptionModel(tenantPrefix);
      this.getPartnerIdentifierConfigurationModel();
      this.getThemeModel();
      this.getBrandingModel();
      this.getFontModel();
    } catch (error) {
      console.error("Error initializing core models:", error);
    }
  }
}

export const Models = {
  getUser: (tenantPrefix?: string) => ModelFactory.getUserModel(tenantPrefix),
  getPartner: () => ModelFactory.getPartnerModel(),
  getLab: (tenantPrefix?: string) => ModelFactory.getLabModel(tenantPrefix),
  getAddress: (tenantPrefix?: string) =>
    ModelFactory.getAddressModel(tenantPrefix),
  getWorkingHours: (tenantPrefix?: string) =>
    ModelFactory.getWorkingHoursModel(tenantPrefix),
  getApiIntegration: (tenantPrefix?: string) =>
    ModelFactory.getApiIntegrationModel(tenantPrefix),
  getLabSubscription: (tenantPrefix?: string) =>
    ModelFactory.getLabSubscriptionModel(tenantPrefix),
  getPartnerIdentifierConfiguration: () =>
    ModelFactory.getPartnerIdentifierConfigurationModel(),
  getTheme: () => ModelFactory.getThemeModel(),
  getBranding: () => ModelFactory.getBrandingModel(),
  getFont: () => ModelFactory.getFontModel(),
  // TODO: Uncomment when these models are implemented
  // getPatient: (tenantPrefix?: string) =>
  //   ModelFactory.getPatientModel(tenantPrefix),
  // getTest: () => ModelFactory.getTestModel(),
  // getTestOrder: (tenantPrefix?: string) =>
  //   ModelFactory.getTestOrderModel(tenantPrefix),

  // Utility methods
  getAllForTenant: (tenantPrefix?: string) =>
    ModelFactory.getAllModels(tenantPrefix),
  getTenantPrefix: (user: any) => ModelFactory.getTenantPrefixForUser(user),
};

export default ModelFactory;
