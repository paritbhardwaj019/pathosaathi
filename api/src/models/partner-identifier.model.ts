import mongoose, { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IIdentifierConfig {
  prefix: string;
  format: string;
  separator: string;
  dateFormat: "YYYYMMDD" | "YYMMDD" | "DDMMYYYY" | "MMDDYYYY" | "YY" | "YYYY";
  counterLength: number;
  resetFrequency: "DAILY" | "MONTHLY" | "YEARLY" | "NEVER";
}

export interface IModelIdentifierConfig {
  User?: IIdentifierConfig;
  Partner?: IIdentifierConfig;
  Lab?: IIdentifierConfig;
  Patient?: IIdentifierConfig;
  Test?: IIdentifierConfig;
  TestOrder?: IIdentifierConfig;
  LabSubscription?: IIdentifierConfig;
  Plan?: IIdentifierConfig;
  PlanType?: IIdentifierConfig;
  [key: string]: IIdentifierConfig | undefined;
}

export interface IPartnerIdentifierConfiguration extends ITenantDocument {
  identifier: string;

  tenantPrefix: string;
  partner: mongoose.Types.ObjectId;
  partnerName: string;

  globalPrefix: string;
  configurations: IModelIdentifierConfig;

  appliedTemplate?: string;

  version: string;
  isActive: boolean;

  lastModifiedBy: mongoose.Types.ObjectId;
  changeHistory: {
    version: string;
    changes: string;
    modifiedBy: mongoose.Types.ObjectId;
    modifiedAt: Date;
  }[];

  stats: {
    totalIdentifiersGenerated: number;
    lastUsed: Date;
    modelsConfigured: number;
    configurationChanges: number;
  };

  // Methods
  getModelConfig(modelName: string): IIdentifierConfig;
  updateModelConfig(
    modelName: string,
    config: Partial<IIdentifierConfig>
  ): void;
  applyTemplate(
    templateName: string,
    modifiedBy: mongoose.Types.ObjectId
  ): void;
  validateConfiguration(): { valid: boolean; errors: string[] };
}

const identifierConfigSchema = new Schema<IIdentifierConfig>(
  {
    prefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
      match: /^[A-Z0-9]{1,10}$/,
    },

    format: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      validate: {
        validator: function (format: string) {
          // Must include either {COUNTER} or {TODAYS_ENTRY}
          return (
            format.includes("{COUNTER}") || format.includes("{TODAYS_ENTRY}")
          );
        },
        message: "Format must include {COUNTER} or {TODAYS_ENTRY} placeholder",
      },
    },

    separator: {
      type: String,
      default: "_",
      maxlength: 1,
      match: /^[_\-.]?$/,
    },

    dateFormat: {
      type: String,
      enum: ["YYYYMMDD", "YYMMDD", "DDMMYYYY", "MMDDYYYY", "YY", "YYYY"],
      default: "YYMMDD",
    },

    counterLength: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 4,
    },

    resetFrequency: {
      type: String,
      enum: ["DAILY", "MONTHLY", "YEARLY", "NEVER"],
      default: "DAILY",
    },
  },
  { _id: false }
);

const partnerIdentifierConfigurationSchema =
  new Schema<IPartnerIdentifierConfiguration>(
    {
      identifier: {
        type: String,
        unique: true,
        immutable: true,
        trim: true,
      },

      tenantPrefix: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
      },

      partner: {
        type: Schema.Types.ObjectId,
        ref: "Partner",
        required: true,
      },

      partnerName: {
        type: String,
        required: true,
        trim: true,
      },

      globalPrefix: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 10,
        match: /^[A-Z0-9]{1,10}$/,
      },

      configurations: {
        User: identifierConfigSchema,
        Partner: identifierConfigSchema,
        Lab: identifierConfigSchema,
        Patient: identifierConfigSchema,
        Test: identifierConfigSchema,
        TestOrder: identifierConfigSchema,
        LabSubscription: identifierConfigSchema,
        Plan: identifierConfigSchema,
        PlanType: identifierConfigSchema,
      },

      appliedTemplate: {
        type: String,
        trim: true,
        enum: ["MEDICAL_STANDARD", "APOLLO_STYLE", "SIMPLE_NUMERIC", "CUSTOM"],
      },

      version: {
        type: String,
        default: "1.0.0",
        match: /^\d+\.\d+\.\d+$/,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      lastModifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      changeHistory: [
        {
          version: { type: String, required: true },
          changes: { type: String, required: true, maxlength: 1000 },
          modifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          modifiedAt: { type: Date, default: Date.now },
        },
      ],

      stats: {
        totalIdentifiersGenerated: { type: Number, default: 0, min: 0 },
        lastUsed: { type: Date },
        modelsConfigured: { type: Number, default: 0, min: 0 },
        configurationChanges: { type: Number, default: 0, min: 0 },
      },
    },
    {
      timestamps: true,
    }
  );

partnerIdentifierConfigurationSchema.index({ tenantPrefix: 1 });
partnerIdentifierConfigurationSchema.index({ partner: 1 });
partnerIdentifierConfigurationSchema.index({ isActive: 1 });
partnerIdentifierConfigurationSchema.index({ globalPrefix: 1 });
partnerIdentifierConfigurationSchema.index({ lastModifiedBy: 1 });

partnerIdentifierConfigurationSchema.pre("save", async function (next) {
  try {
    if (!this.identifier) {
      this.identifier = await getNextIdentifier(
        "PS_ROOT",
        "PartnerIdentifierConfiguration"
      );
    }

    if (this.configurations) {
      this.stats.modelsConfigured = Object.keys(this.configurations).filter(
        (key) => {
          const config =
            this.configurations[key as keyof IModelIdentifierConfig];
          return config && Object.keys(config).length > 0;
        }
      ).length;
    }

    if (this.isModified("configurations") && !this.isNew) {
      this.stats.configurationChanges += 1;
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

partnerIdentifierConfigurationSchema.methods.getModelConfig = function (
  modelName: string
): IIdentifierConfig {
  return this.configurations[modelName] || this.getDefaultConfig(modelName);
};

partnerIdentifierConfigurationSchema.methods.getDefaultConfig = function (
  modelName: string
): IIdentifierConfig {
  const defaults: { [key: string]: IIdentifierConfig } = {
    User: {
      prefix: this.globalPrefix,
      format: "USR_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Partner: {
      prefix: this.globalPrefix,
      format: "PTR_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Lab: {
      prefix: this.globalPrefix,
      format: "LAB_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Patient: {
      prefix: this.globalPrefix,
      format: "PAT_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Test: {
      prefix: this.globalPrefix,
      format: "TST_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    TestOrder: {
      prefix: this.globalPrefix,
      format: "ORD_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    LabSubscription: {
      prefix: this.globalPrefix,
      format: "SUB_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Plan: {
      prefix: this.globalPrefix,
      format: "PLN_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    PlanType: {
      prefix: this.globalPrefix,
      format: "PLT_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Theme: {
      prefix: this.globalPrefix,
      format: "THM_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Branding: {
      prefix: this.globalPrefix,
      format: "BRD_{DATE_FORMAT}_{TODAYS_ENTRY}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "DAILY",
    },
    Font: {
      prefix: this.globalPrefix,
      format: "FNT_{COUNTER}",
      separator: "_",
      dateFormat: "YYMMDD",
      counterLength: 4,
      resetFrequency: "NEVER",
    },
  };

  return defaults[modelName] || defaults.User;
};

partnerIdentifierConfigurationSchema.methods.updateModelConfig = function (
  modelName: string,
  config: Partial<IIdentifierConfig>
): void {
  if (!this.configurations) {
    this.configurations = {};
  }

  const currentConfig = this.getModelConfig(modelName);
  this.configurations[modelName] = { ...currentConfig, ...config };
};

partnerIdentifierConfigurationSchema.methods.applyTemplate = function (
  templateName: string,
  modifiedBy: mongoose.Types.ObjectId
): void {
  const templates: { [key: string]: IModelIdentifierConfig } = {
    MEDICAL_STANDARD: {
      User: {
        prefix: this.globalPrefix,
        format: "USR_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Patient: {
        prefix: this.globalPrefix,
        format: "PAT_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      TestOrder: {
        prefix: this.globalPrefix,
        format: "ORD_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "YYMMDD",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
    },
    APOLLO_STYLE: {
      User: {
        prefix: this.globalPrefix,
        format: "U_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "DDMMYYYY",
        counterLength: 4,
        resetFrequency: "DAILY",
      },
      Patient: {
        prefix: this.globalPrefix,
        format: "P_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "DDMMYYYY",
        counterLength: 5,
        resetFrequency: "DAILY",
      },
      TestOrder: {
        prefix: this.globalPrefix,
        format: "R_{DATE_FORMAT}_{TODAYS_ENTRY}",
        separator: "_",
        dateFormat: "DDMMYYYY",
        counterLength: 5,
        resetFrequency: "DAILY",
      },
    },
    SIMPLE_NUMERIC: {
      User: {
        prefix: this.globalPrefix,
        format: "USR{COUNTER}",
        separator: "",
        dateFormat: "YYMMDD",
        counterLength: 6,
        resetFrequency: "NEVER",
      },
      Patient: {
        prefix: this.globalPrefix,
        format: "PAT{COUNTER}",
        separator: "",
        dateFormat: "YYMMDD",
        counterLength: 6,
        resetFrequency: "NEVER",
      },
      TestOrder: {
        prefix: this.globalPrefix,
        format: "ORD{COUNTER}",
        separator: "",
        dateFormat: "YYMMDD",
        counterLength: 6,
        resetFrequency: "NEVER",
      },
    },
  };

  const template = templates[templateName];
  if (template) {
    this.configurations = { ...this.configurations, ...template };
    this.appliedTemplate = templateName;

    // Add to change history
    this.changeHistory.push({
      version: this.version,
      changes: `Applied template: ${templateName}`,
      modifiedBy,
      modifiedAt: new Date(),
    });
  }
};

partnerIdentifierConfigurationSchema.methods.validateConfiguration =
  function (): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.globalPrefix) {
      errors.push("Global prefix is required");
    }

    if (this.configurations) {
      Object.entries(this.configurations).forEach(([modelName, config]) => {
        if (config) {
          const identifierConfig = config as IIdentifierConfig;
          if (!identifierConfig.prefix) {
            errors.push(`${modelName}: Prefix is required`);
          }

          if (!identifierConfig.format) {
            errors.push(`${modelName}: Format is required`);
          } else if (
            !identifierConfig.format.includes("{COUNTER}") &&
            !identifierConfig.format.includes("{TODAYS_ENTRY}")
          ) {
            errors.push(
              `${modelName}: Format must include {COUNTER} or {TODAYS_ENTRY}`
            );
          }

          if (
            identifierConfig.counterLength < 1 ||
            identifierConfig.counterLength > 10
          ) {
            errors.push(
              `${modelName}: Counter length must be between 1 and 10`
            );
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  };

// Static methods
partnerIdentifierConfigurationSchema.statics.findByTenantPrefix = function (
  tenantPrefix: string
) {
  return this.findOne({ tenantPrefix, isActive: true });
};

partnerIdentifierConfigurationSchema.statics.findByPartner = function (
  partnerId: string
) {
  return this.findOne({ partner: partnerId, isActive: true });
};

partnerIdentifierConfigurationSchema.statics.createDefaultConfiguration =
  async function (
    tenantPrefix: string,
    partnerId: string,
    partnerName: string,
    globalPrefix: string,
    createdBy: string
  ) {
    const config = new this({
      tenantPrefix, // Partner's tenant prefix (stored in document)
      partner: partnerId,
      partnerName,
      globalPrefix,
      configurations: {}, // Will use defaults from getDefaultConfig method
      lastModifiedBy: createdBy,
      changeHistory: [
        {
          version: "1.0.0",
          changes: "Initial configuration created with default values",
          modifiedBy: createdBy,
          modifiedAt: new Date(),
        },
      ],
      // Note: Document itself is stored in ROOT tenant collection via model factory
    });

    await config.save();
    return config;
  };

partnerIdentifierConfigurationSchema.statics.updateUsageStats = async function (
  tenantPrefix: string,
  increment: number = 1
) {
  return this.findOneAndUpdate(
    { tenantPrefix, isActive: true },
    {
      $inc: { "stats.totalIdentifiersGenerated": increment },
      $set: { "stats.lastUsed": new Date() },
    },
    { new: true }
  );
};

export { partnerIdentifierConfigurationSchema };
