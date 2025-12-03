import mongoose, { Schema, Model } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";
import { ITheme } from "./theme.model";

export interface IBranding extends ITenantDocument {
  identifier: string;

  name: string;
  description?: string;

  logo?: string;

  metadata?: {
    [key: string]: any;
  };

  theme: mongoose.Types.ObjectId | ITheme;

  isActive: boolean;
}

/**
 * Interface for static methods on Branding model
 */
export interface IBrandingModel extends Model<IBranding> {
  findByIdentifier(identifier: string): Promise<IBranding | null>;
  findActive(): Promise<IBranding[]>;
  findByTheme(themeId: mongoose.Types.ObjectId): Promise<IBranding[]>;
  findByName(name: string): Promise<IBranding | null>;
}

const brandingSchema = new Schema<IBranding>(
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
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    logo: {
      type: String,
      trim: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    theme: {
      type: Schema.Types.ObjectId,
      ref: "Theme",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

brandingSchema.index({ name: 1, tenantPrefix: 1 });
brandingSchema.index({ isActive: 1 });
brandingSchema.index({ theme: 1, isActive: 1 });

brandingSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Branding");
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

brandingSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

brandingSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

brandingSchema.statics.findByTheme = function (
  themeId: mongoose.Types.ObjectId
) {
  return this.find({ theme: themeId, isActive: true });
};

brandingSchema.statics.findByName = function (name: string) {
  return this.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
};

export { brandingSchema };
