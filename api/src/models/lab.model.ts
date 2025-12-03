import mongoose, { Schema, Model } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";
import { IAddress } from "./address.model";
import { IWorkingHours } from "./working-hours.model";
import { IApiIntegration } from "./api-integration.model";
import { IBranding } from "./branding.model";

export interface ILab extends ITenantDocument {
  identifier: string;

  name: string;
  ownerName: string;
  email: string;
  phone: string;

  address: mongoose.Types.ObjectId | IAddress;

  labType: "PATHOLOGY" | "DIAGNOSTIC" | "BOTH";
  licenseNumber?: string;
  nablAccreditation: boolean;
  establishedYear?: number;

  gstNumber?: string;
  panNumber?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };

  partner?: mongoose.Types.ObjectId;
  acquisitionSource: "DIRECT" | "PARTNER_REFERRAL";
  referralCode?: string;

  isActive: boolean;
  setupCompleted: boolean;
  onboardingStep: number;

  workingHours: mongoose.Types.ObjectId | IWorkingHours;

  services: {
    homeCollection: boolean;
    onlineReports: boolean;
    whatsappReports: boolean;
    emergencyService: boolean;
  };

  apiIntegration: mongoose.Types.ObjectId | IApiIntegration;

  branding?: mongoose.Types.ObjectId | IBranding;

  stats: {
    totalPatients: number;
    totalTests: number;
    monthlyRevenue: number;
    lastReportGenerated?: Date;
  };

  isOperational(): boolean;
  canGenerateReports(): Promise<boolean>;
}

/**
 * Interface for static methods on Lab model
 */
export interface ILabModel extends Model<ILab> {
  findByOwner(ownerEmail: string): Promise<ILab[]>;
  findByPartner(partnerId: mongoose.Types.ObjectId): Promise<ILab[]>;
  findByIdentifier(identifier: string): Promise<ILab | null>;
  findByCity(city: string): Promise<ILab[]>;
  getActiveLabsCount(): Promise<number>;
}

const labSchema = new Schema<ILab>(
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

    ownerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },

    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    labType: {
      type: String,
      enum: ["PATHOLOGY", "DIAGNOSTIC", "BOTH"],
      default: "PATHOLOGY",
    },

    licenseNumber: {
      type: String,
      trim: true,
    },

    nablAccreditation: {
      type: Boolean,
      default: false,
    },

    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },

    gstNumber: {
      type: String,
      trim: true,
      sparse: true,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },

    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: {
        type: String,
        trim: true,
        match: /^[A-Z]{4}0[A-Z0-9]{6}$/,
      },
      bankName: { type: String, trim: true },
    },

    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },

    acquisitionSource: {
      type: String,
      enum: ["DIRECT", "PARTNER_REFERRAL"],
      default: "DIRECT",
    },

    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    setupCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    onboardingStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },

    workingHours: {
      type: Schema.Types.ObjectId,
      ref: "WorkingHours",
      required: true,
    },
    services: {
      homeCollection: { type: Boolean, default: false },
      onlineReports: { type: Boolean, default: true },
      whatsappReports: { type: Boolean, default: false },
      emergencyService: { type: Boolean, default: false },
    },
    apiIntegration: {
      type: Schema.Types.ObjectId,
      ref: "ApiIntegration",
      required: true,
    },

    branding: {
      type: Schema.Types.ObjectId,
      ref: "Branding",
      default: null,
    },

    stats: {
      totalPatients: { type: Number, default: 0, min: 0 },
      totalTests: { type: Number, default: 0, min: 0 },
      monthlyRevenue: { type: Number, default: 0, min: 0 },
      lastReportGenerated: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

labSchema.index({ email: 1, tenantPrefix: 1 });
labSchema.index({ phone: 1, tenantPrefix: 1 });
labSchema.index({ partner: 1 });
labSchema.index({ acquisitionSource: 1 });
labSchema.index({ isActive: 1, setupCompleted: 1 });
labSchema.index({ address: 1 });
labSchema.index({ workingHours: 1 });
labSchema.index({ apiIntegration: 1 });
labSchema.index({ branding: 1 });

labSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Lab");
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

labSchema.methods.isOperational = function (): boolean {
  return this.isActive && this.setupCompleted;
};

labSchema.methods.canGenerateReports = async function (): Promise<boolean> {
  if (!this.isOperational()) {
    return false;
  }

  if (this.apiIntegration && !(this.apiIntegration as any).enabled) {
    await this.populate("apiIntegration");
  }

  const apiIntegration = this.apiIntegration as IApiIntegration | null;

  if (!apiIntegration) {
    return false;
  }

  return apiIntegration.enabled;
};

labSchema.statics.findByOwner = function (ownerEmail: string) {
  return this.find({ email: ownerEmail, isActive: true });
};

labSchema.statics.findByPartner = function (
  partnerId: mongoose.Types.ObjectId
) {
  return this.find({ partner: partnerId, isActive: true });
};

labSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

labSchema.statics.findByCity = async function (city: string): Promise<ILab[]> {
  const labs: ILab[] = await this.find({
    isActive: true,
    setupCompleted: true,
  }).populate({
    path: "address",
    match: { city: new RegExp(city, "i") },
  });

  return labs.filter(
    (lab) => lab.address !== null && lab.address !== undefined
  );
};

labSchema.statics.getActiveLabsCount = function () {
  return this.countDocuments({ isActive: true, setupCompleted: true });
};

export { labSchema };
