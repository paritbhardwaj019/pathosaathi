import mongoose, { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IPlanFeature {
  id: string; // Reference to plan type feature ID
  name: string; // Partner can customize the name
  description?: string; // Partner can customize description
  content: string; // Partner can customize content (HTML)
  category: string;
  isIncluded: boolean; // Whether this feature is included in the plan
  displayOrder: number;
  icon?: string;
  customization?: string; // Partner-specific customization notes
}

export interface IPlan extends ITenantDocument {
  // Unique Identifier
  identifier: string;

  // Basic Information
  planName: string;

  description?: string;

  // Plan Type Reference
  planType: mongoose.Types.ObjectId; // Reference to PlanType
  planTypeCategory: string; // Cached category from plan type

  // Partner Information
  partner: mongoose.Types.ObjectId; // Partner who created this plan
  partnerName: string; // Cached partner name
  isPartnerBranded: boolean; // Uses partner's branding

  // Pricing & Billing
  sellingPrice: number; // Partner's selling price
  baseCost: number; // Platform base cost (from plan type)
  partnerMargin: number; // Partner's margin amount
  currency: string;

  billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  discounts?: {
    quarterly: number; // % discount for quarterly billing
    yearly: number; // % discount for yearly billing
  };

  // Features
  includedFeatures: IPlanFeature[]; // Selected and customized features
  excludedFeatures: string[]; // Feature IDs that were excluded
  customFeatures?: IPlanFeature[]; // Partner-added custom features

  // Plan Configuration
  isActive: boolean;
  isPublic: boolean; // Visible in partner's public catalog
  isFeatured: boolean; // Featured in partner's catalog
  isCustom: boolean; // Custom plan vs standard plan

  trialPeriodDays: number;
  setupFee: number;
  hasSetupFee: boolean;

  terms?: string;
  supportLevel: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";

  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  version: string;

  stats: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
    avgSubscriptionLength: number;
    churnRate: number;
    lastSubscribed?: Date;
  };

  needsApproval: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;

  calculateTotalPrice(billingCycle?: string): number;
  getFeaturesByCategory(): any[];
  addCustomFeature(feature: Omit<IPlanFeature, "id">): void;
  updateFeature(featureId: string, updates: Partial<IPlanFeature>): void;
  clone(newName: string, userId: mongoose.Types.ObjectId): IPlan;
  validatePricing(): { valid: boolean; errors: string[] };
}

const planFeatureSchema = new Schema<IPlanFeature>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    category: {
      type: String,
      required: true,
      enum: ["core", "advanced", "premium", "addon", "integration"],
      index: true,
    },

    isIncluded: {
      type: Boolean,
      required: true,
      default: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    icon: {
      type: String,
      trim: true,
    },

    customization: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
);

const planSchema = new Schema<IPlan>(
  {
    // Unique Identifier
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },

    // Basic Information
    planName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    displayName: {
      en: { type: String, required: true, trim: true, maxlength: 100 },
      hi: { type: String, trim: true, maxlength: 100 },
      // Allow additional languages dynamically
      type: Map,
      of: String,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Plan Type Reference
    planType: {
      type: Schema.Types.ObjectId,
      ref: "PlanType",
      required: true,
      index: true,
    },

    planTypeCategory: {
      type: String,
      required: true,
      enum: ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE", "CUSTOM"],
      index: true,
    },

    // Partner Information
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true,
    },

    partnerName: {
      type: String,
      required: true,
      trim: true,
    },

    isPartnerBranded: {
      type: Boolean,
      default: true,
    },

    // Pricing & Billing
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    baseCost: {
      type: Number,
      required: true,
      min: 0,
    },

    partnerMargin: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP"],
    },

    billingCycle: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
      default: "MONTHLY",
      index: true,
    },

    discounts: {
      quarterly: { type: Number, min: 0, max: 100, default: 0 },
      yearly: { type: Number, min: 0, max: 100, default: 0 },
    },

    // Features
    includedFeatures: [planFeatureSchema],

    excludedFeatures: [
      {
        type: String,
        trim: true,
      },
    ],

    customFeatures: [planFeatureSchema],

    // Limits & Quotas
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

    // Plan Configuration
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

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isCustom: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Trial & Setup
    trialPeriodDays: {
      type: Number,
      default: 14,
      min: 0,
      max: 365,
    },

    setupFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    hasSetupFee: {
      type: Boolean,
      default: false,
    },

    // Partner Customization
    theme: {
      primaryColor: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      },
      accentColor: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      },
      logo: {
        type: String,
        trim: true,
      },
    },

    // Terms & Conditions
    terms: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    supportLevel: {
      type: String,
      enum: ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"],
      default: "STANDARD",
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    version: {
      type: String,
      default: "1.0.0",
      match: /^\d+\.\d+\.\d+$/,
    },

    // Usage & Analytics
    stats: {
      totalSubscriptions: { type: Number, default: 0, min: 0 },
      activeSubscriptions: { type: Number, default: 0, min: 0 },
      totalRevenue: { type: Number, default: 0, min: 0 },
      avgSubscriptionLength: { type: Number, default: 0, min: 0 },
      churnRate: { type: Number, default: 0, min: 0, max: 100 },
      lastSubscribed: { type: Date },
    },

    // Approval
    needsApproval: {
      type: Boolean,
      default: false,
    },

    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "NOT_REQUIRED"],
      default: "NOT_REQUIRED",
      index: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// identifier index is created by unique: true, no need for explicit index
planSchema.index({ partner: 1, isActive: 1 });
planSchema.index({ planType: 1 });
planSchema.index({ planName: 1 });
planSchema.index({ isPublic: 1, isActive: 1 });
planSchema.index({ isFeatured: 1, isActive: 1 });
planSchema.index({ billingCycle: 1, sellingPrice: 1 });
planSchema.index({ approvalStatus: 1 });
planSchema.index({ createdAt: -1 });

planSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Plan");
    }

    if (this.sellingPrice && this.baseCost) {
      this.partnerMargin = this.sellingPrice - this.baseCost;
    }

    // Sort features by displayOrder
    if (this.includedFeatures) {
      this.includedFeatures.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    if (this.customFeatures) {
      this.customFeatures.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    // Set approval status based on partner type and pricing
    if (!this.needsApproval) {
      this.approvalStatus = "NOT_REQUIRED";
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Methods
planSchema.methods.calculateTotalPrice = function (
  billingCycle?: string
): number {
  const cycle = billingCycle || this.billingCycle;
  let price = this.sellingPrice;

  if (cycle === "QUARTERLY" && this.discounts?.quarterly) {
    price = price * 3 * (1 - this.discounts.quarterly / 100);
  } else if (cycle === "YEARLY" && this.discounts?.yearly) {
    price = price * 12 * (1 - this.discounts.yearly / 100);
  }

  return price;
};

planSchema.methods.getFeaturesByCategory = function (): any[] {
  const featuresByCategory = {};

  [...this.includedFeatures, ...(this.customFeatures || [])].forEach(
    (feature) => {
      const category = feature.category || "core";
      if (!featuresByCategory[category]) {
        featuresByCategory[category] = [];
      }
      featuresByCategory[category].push(feature);
    }
  );

  return Object.entries(featuresByCategory).map(([category, features]) => ({
    category,
    features,
  }));
};

planSchema.methods.addCustomFeature = function (
  feature: Omit<IPlanFeature, "id">
): void {
  const newFeature: IPlanFeature = {
    ...feature,
    id: new mongoose.Types.ObjectId().toString(),
  };

  if (!this.customFeatures) {
    this.customFeatures = [];
  }

  this.customFeatures.push(newFeature);
  this.customFeatures.sort((a, b) => a.displayOrder - b.displayOrder);
};

planSchema.methods.updateFeature = function (
  featureId: string,
  updates: Partial<IPlanFeature>
): void {
  // Update in included features
  const includedIndex = this.includedFeatures.findIndex(
    (f) => f.id === featureId
  );
  if (includedIndex !== -1) {
    Object.assign(this.includedFeatures[includedIndex], updates);
    return;
  }

  // Update in custom features
  if (this.customFeatures) {
    const customIndex = this.customFeatures.findIndex(
      (f) => f.id === featureId
    );
    if (customIndex !== -1) {
      Object.assign(this.customFeatures[customIndex], updates);
    }
  }
};

planSchema.methods.clone = function (
  newName: string,
  userId: mongoose.Types.ObjectId
): IPlan {
  const cloned = new (this.constructor as any)({
    ...this.toObject(),
    _id: undefined,
    identifier: undefined, // Will be generated
    planName: newName,
    displayName: {
      ...this.displayName,
      en: `${this.displayName.en} (Copy)`,
    },
    isActive: false, // Start inactive until reviewed
    approvalStatus: this.needsApproval ? "PENDING" : "NOT_REQUIRED",
    createdBy: userId,
    lastModifiedBy: userId,
    stats: {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      avgSubscriptionLength: 0,
      churnRate: 0,
    },
    createdAt: undefined,
    updatedAt: undefined,
  });

  return cloned;
};

planSchema.methods.validatePricing = function (): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (this.sellingPrice < this.baseCost) {
    errors.push("Selling price cannot be less than base cost");
  }

  if (this.partnerMargin < 0) {
    errors.push("Partner margin cannot be negative");
  }

  if (this.setupFee < 0) {
    errors.push("Setup fee cannot be negative");
  }

  return { valid: errors.length === 0, errors };
};

// Static methods
planSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

planSchema.statics.getPartnerPlans = function (
  partnerId: string,
  filters: any = {}
) {
  const query = { partner: partnerId, ...filters };
  return this.find(query)
    .populate("planType", "name displayName category")
    .sort({ isFeatured: -1, createdAt: -1 });
};

planSchema.statics.getPublicPlans = function (
  partnerId: string,
  category?: string
) {
  const query: any = {
    partner: partnerId,
    isActive: true,
    isPublic: true,
    approvalStatus: { $in: ["APPROVED", "NOT_REQUIRED"] },
  };

  if (category) {
    query.planTypeCategory = category;
  }

  return this.find(query)
    .populate("planType", "name displayName category")
    .sort({ isFeatured: -1, sellingPrice: 1 });
};

planSchema.statics.getFeaturedPlans = function (partnerId: string) {
  return this.find({
    partner: partnerId,
    isActive: true,
    isPublic: true,
    isFeatured: true,
    approvalStatus: { $in: ["APPROVED", "NOT_REQUIRED"] },
  })
    .populate("planType", "name displayName category")
    .limit(6)
    .sort({ sellingPrice: 1 });
};

planSchema.statics.updateSubscriptionStats = async function (
  planId: string,
  updateData: {
    newSubscription?: boolean;
    cancelSubscription?: boolean;
    revenue?: number;
    subscriptionLength?: number;
  }
) {
  const plan = await this.findById(planId);
  if (!plan) return;

  if (updateData.newSubscription) {
    plan.stats.totalSubscriptions += 1;
    plan.stats.activeSubscriptions += 1;
    plan.stats.lastSubscribed = new Date();
  }

  if (updateData.cancelSubscription) {
    plan.stats.activeSubscriptions = Math.max(
      0,
      plan.stats.activeSubscriptions - 1
    );

    // Update churn rate
    if (plan.stats.totalSubscriptions > 0) {
      const cancelledSubscriptions =
        plan.stats.totalSubscriptions - plan.stats.activeSubscriptions;
      plan.stats.churnRate =
        (cancelledSubscriptions / plan.stats.totalSubscriptions) * 100;
    }
  }

  if (updateData.revenue) {
    plan.stats.totalRevenue += updateData.revenue;
  }

  if (updateData.subscriptionLength) {
    // Calculate average subscription length
    const totalLength =
      plan.stats.avgSubscriptionLength * (plan.stats.totalSubscriptions - 1);
    plan.stats.avgSubscriptionLength =
      (totalLength + updateData.subscriptionLength) /
      plan.stats.totalSubscriptions;
  }

  await plan.save();
};

export { planSchema };
