import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, UserRole } from "@/config/role.config";
import { ITenantDocument } from "@/models/base.model";
import { getNextIdentifier } from "@/models/identifier-counter.model";

export interface IUser extends ITenantDocument {
  identifier: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  lab?: mongoose.Types.ObjectId;
  partner?: mongoose.Types.ObjectId;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  ipAddress?: string;
  emailVerified: boolean;
  phoneVerified: boolean;

  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isLocked(): boolean;
}

/**
 * Interface for static methods on User model
 */
export interface IUserModel extends Model<IUser> {
  findByEmailOrPhone(emailOrPhone: string): Promise<IUser | null>;
  findByIdentifier(identifier: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
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
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      match: /^[6-9]\d{9}$/,
    },

    password: {
      type: String,
      select: false,
      required: function (this: IUser) {
        return [
          ROLES.SUPERADMIN,
          ROLES.PARTNER,
          ROLES.LAB_OWNER,
          ROLES.TECH,
          ROLES.RECEPTION,
          ROLES.CUSTOMER_SUPPORT,
        ].includes(this.role);
      },
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lab: {
      type: Schema.Types.ObjectId,
      ref: "Lab",
      default: null,
      required: function (this: IUser) {
        return [ROLES.LAB_OWNER, ROLES.TECH, ROLES.RECEPTION].includes(
          this.role as
            | typeof ROLES.LAB_OWNER
            | typeof ROLES.TECH
            | typeof ROLES.RECEPTION
        );
      },
    },

    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
      required: function (this: IUser) {
        return this.role === ROLES.PARTNER;
      },
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index
userSchema.index({ email: 1, tenantPrefix: 1 });
userSchema.index({ phone: 1, tenantPrefix: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lab: 1 });
userSchema.index({ partner: 1 });

userSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "User");
    }

    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }

  await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

userSchema.statics.findByEmailOrPhone = function (emailOrPhone: string) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
  const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };
  return this.findOne(query);
};

userSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier: identifier.toUpperCase() });
};

export { userSchema };
export type UserModel = IUserModel;
