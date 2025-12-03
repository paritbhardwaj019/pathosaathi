import mongoose, { Schema, Model } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";
import { IFont } from "./font.model";

export interface ITheme extends ITenantDocument {
  identifier: string;

  name: string;
  description?: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;

  headingFont: mongoose.Types.ObjectId | IFont;
  bodyFont: mongoose.Types.ObjectId | IFont;

  isEnabled: boolean;

  labs: mongoose.Types.ObjectId[];
  partners: mongoose.Types.ObjectId[];
}

/**
 * Interface for static methods on Theme model
 */
export interface IThemeModel extends Model<ITheme> {
  findByIdentifier(identifier: string): Promise<ITheme | null>;
  findEnabled(): Promise<ITheme[]>;
  findByName(name: string): Promise<ITheme | null>;
}

const themeSchema = new Schema<ITheme>(
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

    primaryColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: "#1976d2",
    },

    secondaryColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: "#dc004e",
    },

    accentColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    },

    headingFont: {
      type: Schema.Types.ObjectId,
      ref: "Font",
      required: true,
    },

    bodyFont: {
      type: Schema.Types.ObjectId,
      ref: "Font",
      required: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    labs: {
      type: [Schema.Types.ObjectId],
      ref: "Lab",
      default: [],
    },

    partners: {
      type: [Schema.Types.ObjectId],
      ref: "Partner",
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

themeSchema.index({ name: 1, tenantPrefix: 1 });
themeSchema.index({ isEnabled: 1 });
themeSchema.index({ headingFont: 1 });
themeSchema.index({ bodyFont: 1 });
themeSchema.index({ labs: 1 });
themeSchema.index({ partners: 1 });

themeSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Theme");
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

themeSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

themeSchema.statics.findEnabled = function () {
  return this.find({ isEnabled: true });
};

themeSchema.statics.findByName = function (name: string) {
  return this.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
};

export { themeSchema };
