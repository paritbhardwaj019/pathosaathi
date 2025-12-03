import mongoose, { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IPlanTypeFeature {
  id: string; // Unique feature ID for selection
  name: string; // Feature display name
  description: string; // Feature description (replaces content)
  isDefault: boolean; // Auto-selected by default
  displayOrder: number; // Sort order in UI
  icon?: string; // Optional icon name/URL
  isActive: boolean; // Can be selected/used
}

export interface IPlanType extends ITenantDocument {
  identifier: string;
  name: string;

  description?: string;

  features: string[];
  baseCost: number;
  currency: string;

  supportedBillingCycles: ("MONTHLY" | "QUARTERLY" | "YEARLY")[];
  defaultBillingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";

  limits: {
    maxPatients: number;
    maxTests: number;
    maxUsers: number;
    storageGB: number;
    apiCalls: number;
    whatsappMessages: number;
    smsMessages: number;
    emailReports: number;
  };

  isActive: boolean;
  isPublic: boolean;
  version: string;

  publishedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  changeLog?: {
    version: string;
    changes: string;
    modifiedBy: mongoose.Types.ObjectId;
    modifiedAt: Date;
  }[];

  stats: {
    totalPlansCreated: number;
    activePartners: number;
    lastUsed?: Date;
  };

  addFeature(feature: string): void;
  removeFeature(feature: string): void;
  clone(newName: string, userId: mongoose.Types.ObjectId): IPlanType;
}

const planTypeSchema = new Schema<IPlanType>(
  {
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    features: {
      type: [String],
      default: [],
    },

    baseCost: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP"],
    },

    supportedBillingCycles: [
      {
        type: String,
        enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
      },
    ],

    defaultBillingCycle: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
      default: "MONTHLY",
    },

    limits: {
      maxPatients: { type: Number, default: 1000, min: 0 },
      maxTests: { type: Number, default: 5000, min: 0 },
      maxUsers: { type: Number, default: 5, min: 1 },
      storageGB: { type: Number, default: 5, min: 1 },
      apiCalls: { type: Number, default: 10000, min: 0 },
      whatsappMessages: { type: Number, default: 500, min: 0 },
      smsMessages: { type: Number, default: 1000, min: 0 },
      emailReports: { type: Number, default: 2000, min: 0 },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    version: {
      type: String,
      default: "1.0.0",
      match: /^\d+\.\d+\.\d+$/,
    },

    publishedAt: {
      type: Date,
      index: true,
    },

    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    changeLog: [
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
      totalPlansCreated: { type: Number, default: 0, min: 0 },
      activePartners: { type: Number, default: 0, min: 0 },
      lastUsed: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index
planTypeSchema.index({ name: 1 });
planTypeSchema.index({ isPublic: 1, isActive: 1 });
planTypeSchema.index({ publishedAt: 1 });

planTypeSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "PlanType");
    }

    if (this.isModified("features") || this.isModified("baseCost")) {
      const currentVersion = this.version.split(".").map(Number);
      currentVersion[1]++;
      this.version = currentVersion.join(".");
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

planTypeSchema.methods.addFeature = function (feature: string): void {
  if (!this.features.includes(feature)) {
    this.features.push(feature);
  }
};

planTypeSchema.methods.removeFeature = function (feature: string): void {
  const index = this.features.indexOf(feature);
  if (index > -1) {
    this.features.splice(index, 1);
  }
};

planTypeSchema.methods.clone = function (
  newName: string,
  userId: mongoose.Types.ObjectId
): IPlanType {
  const cloned = new (this.constructor as any)({
    ...this.toObject(),
    _id: undefined,
    identifier: undefined,
    name: newName,
    version: "1.0.0",
    publishedAt: undefined,
    publishedBy: undefined,
    lastModifiedBy: userId,
    changeLog: [
      {
        version: "1.0.0",
        changes: `Cloned from ${this.name}`,
        modifiedBy: userId,
        modifiedAt: new Date(),
      },
    ],
    stats: {
      totalPlansCreated: 0,
      activePartners: 0,
    },
    features: [...this.features],
    createdAt: undefined,
    updatedAt: undefined,
  });

  return cloned;
};

planTypeSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

planTypeSchema.statics.getPublicPlanTypes = function () {
  const query: any = { isActive: true, isPublic: true };
  return this.find(query).sort({ name: 1 });
};

planTypeSchema.statics.getFeaturesForPlanType = function (planTypeId: string) {
  return this.findById(planTypeId).select("features");
};

planTypeSchema.statics.incrementUsageStats = async function (
  planTypeId: string,
  partnerId?: string
) {
  const updateQuery: any = {
    $inc: { "stats.totalPlansCreated": 1 },
    $set: { "stats.lastUsed": new Date() },
  };

  if (partnerId) {
    updateQuery.$inc["stats.activePartners"] = 1;
  }

  return this.findByIdAndUpdate(planTypeId, updateQuery);
};

planTypeSchema.statics.searchPlanTypes = function (
  searchTerm: string,
  filters: any = {}
) {
  const query: any = {
    isActive: true,
    ...filters,
    $or: [
      { name: new RegExp(searchTerm, "i") },
      { "displayName.en": new RegExp(searchTerm, "i") },
      { description: new RegExp(searchTerm, "i") },
      { features: new RegExp(searchTerm, "i") },
    ],
  };

  return this.find(query)
    .populate("publishedBy", "name identifier")
    .populate("lastModifiedBy", "name identifier")
    .sort({ name: 1 });
};

export { planTypeSchema };
