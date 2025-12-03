import mongoose, { Schema, Model } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IFont extends ITenantDocument {
  identifier: string;

  name: string;
  fontFamily: string;
  googleFontUrl?: string;

  isActive: boolean;

  labs: mongoose.Types.ObjectId[];
  partners: mongoose.Types.ObjectId[];
}

/**
 * Interface for static methods on Font model
 */
export interface IFontModel extends Model<IFont> {
  findByIdentifier(identifier: string): Promise<IFont | null>;
  findActive(): Promise<IFont[]>;
  findByFontFamily(fontFamily: string): Promise<IFont | null>;
  findByName(name: string): Promise<IFont | null>;
}

const fontSchema = new Schema<IFont>(
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

    fontFamily: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    googleFontUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(
            v
          );
        },
        message:
          "Google Font URL must be from fonts.googleapis.com or fonts.gstatic.com",
      },
    },

    isActive: {
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

fontSchema.index({ name: 1, tenantPrefix: 1 });
fontSchema.index({ fontFamily: 1 });
fontSchema.index({ isActive: 1 });
fontSchema.index({ fontFamily: 1, isActive: 1 }, { unique: false });
fontSchema.index({ labs: 1 });
fontSchema.index({ partners: 1 });

fontSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Font");
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

fontSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

fontSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

fontSchema.statics.findByFontFamily = function (fontFamily: string) {
  return this.findOne({
    fontFamily: { $regex: new RegExp(`^${fontFamily}$`, "i") },
    isActive: true,
  });
};

fontSchema.statics.findByName = function (name: string) {
  return this.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
};

export { fontSchema };
