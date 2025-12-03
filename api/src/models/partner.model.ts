import mongoose, { Schema, Model } from "mongoose";
import { PARTNER_TYPES, PartnerType, PARTNER_FEES } from "@/config/role.config";
import {
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  PaymentStatus,
  DEFAULT_PAYMENT_STATUS,
} from "@/config/payment.config";
import { ITenantDocument } from "@/models/base.model";
import { getNextIdentifier } from "@/models/identifier-counter.model";
import { DEFAULT_IDENTIFIER_CONFIG } from "@/config/identifier.config";
import { IAddress } from "@/models/address.model";
import { IBranding } from "@/models/branding.model";

export interface IPartner extends ITenantDocument {
  identifier: string;

  companyName: string;
  ownerName: string;

  email: string;
  phone: string;
  domain?: string;

  address?: mongoose.Types.ObjectId | IAddress;

  partnerType: PartnerType;
  registrationFee: number;
  paidStatus: PaymentStatus;
  paymentTransactionId?: string;

  customIdentifierPrefix?: string;
  customCollectionPrefix?: string;

  registrationDate?: Date;
  expiryDate?: Date;
  isActive: boolean;

  referralCode: string;
  earningsBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;

  branding?: mongoose.Types.ObjectId | IBranding;

  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };

  gstNumber?: string;
  panNumber?: string;
  businessType?: string;

  onboardingCompleted: boolean;
  lastLoginAt?: Date;

  generateReferralCode(): string;
  calculateCommission(labSubscriptionAmount: number): number;
  canWithdraw(): boolean;
  initializeIdentifierConfig(): void;
}

/**
 * Interface for static methods on Partner model
 */
export interface IPartnerModel extends Model<IPartner> {
  findByReferralCode(referralCode: string): Promise<IPartner | null>;
  findByIdentifier(identifier: string): Promise<IPartner | null>;
  getExpiringPartners(days?: number): Promise<IPartner[]>;
}

const partnerSchema = new Schema<IPartner>(
  {
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },

    companyName: {
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
      unique: true,
      match: /^[6-9]\d{9}$/,
    },

    domain: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9.-]+\.[a-z]{2,}$/,
      sparse: true,
      unique: true,
    },

    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },

    partnerType: {
      type: String,
      enum: Object.values(PARTNER_TYPES),
      required: true,
      index: true,
    },

    registrationFee: {
      type: Number,
      required: true,
      validate: {
        validator: function (this: IPartner, value: number) {
          return value === PARTNER_FEES[this.partnerType];
        },
        message: "Registration fee does not match partner type",
      },
    },

    paidStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: DEFAULT_PAYMENT_STATUS,
    },

    paymentTransactionId: {
      type: String,
      sparse: true,
    },

    customIdentifierPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      match: /^[A-Z0-9]+$/,
    },

    customCollectionPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 15,
      match: /^[A-Z0-9_]+$/,
    },

    registrationDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
    },

    earningsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },

    branding: {
      type: Schema.Types.ObjectId,
      ref: "Branding",
      default: null,
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
      upiId: {
        type: String,
        trim: true,
        match: /^[\w.-]+@[\w.-]+$/,
      },
    },

    gstNumber: {
      type: String,
      trim: true,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },

    businessType: {
      type: String,
      enum: [
        "Equipment Supplier",
        "Distributor",
        "Consultant",
        "Influencer",
        "Other",
      ],
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index
partnerSchema.index({ email: 1, tenantPrefix: 1 });
partnerSchema.index({ phone: 1, tenantPrefix: 1 });
// domain index is created by unique: true, no need for explicit index
// referralCode index is created by unique: true, no need for explicit index
partnerSchema.index({ partnerType: 1, isActive: 1 });
partnerSchema.index({ paidStatus: 1 });
partnerSchema.index({ expiryDate: 1, isActive: 1 });
partnerSchema.index({ customIdentifierPrefix: 1 });
partnerSchema.index({ branding: 1 });

partnerSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Partner");
    }

    if (!this.referralCode) {
      this.referralCode = this.generateReferralCode();
    }

    if (
      this.isModified("paidStatus") &&
      this.paidStatus === PAYMENT_STATUS.PAID &&
      !this.registrationDate
    ) {
      this.registrationDate = new Date();
      this.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      this.isActive = true;
    }

    if (
      this.isModified("partnerType") ||
      this.isModified("customIdentifierPrefix")
    ) {
      this.initializeIdentifierConfig();
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

partnerSchema.methods.generateReferralCode = function (): string {
  const companyPrefix = this.companyName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .substring(0, 3);

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${companyPrefix}${randomSuffix}`;
};

partnerSchema.methods.calculateCommission = function (
  labSubscriptionAmount: number
): number {
  const commissionRate =
    this.partnerType === PARTNER_TYPES.WHITE_LABEL ? 0.25 : 0.15;
  return Math.floor(labSubscriptionAmount * commissionRate);
};

partnerSchema.methods.canWithdraw = function (): boolean {
  return this.earningsBalance >= 100;
};

partnerSchema.methods.initializeIdentifierConfig = function (): void {
  if (
    this.partnerType === PARTNER_TYPES.WHITE_LABEL &&
    this.customIdentifierPrefix
  ) {
    const customConfig = { ...DEFAULT_IDENTIFIER_CONFIG };

    Object.keys(customConfig).forEach((modelName) => {
      customConfig[modelName].prefix = this.customIdentifierPrefix!;
    });
  }
};

partnerSchema.statics.findByReferralCode = function (referralCode: string) {
  return this.findOne({
    referralCode: referralCode.toUpperCase(),
    isActive: true,
  });
};

partnerSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

partnerSchema.statics.getExpiringPartners = function (days: number = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    expiryDate: { $lte: expiryDate },
    isActive: true,
    paidStatus: PAYMENT_STATUS.PAID,
  });
};

export { partnerSchema };
