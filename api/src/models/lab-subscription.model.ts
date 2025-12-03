import mongoose, { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";
import {
  PAYMENT_STATUS,
  PaymentStatus,
  DEFAULT_PAYMENT_STATUS,
} from "@/config/payment.config";

export interface ILabSubscription extends ITenantDocument {
  identifier: string;
  lab: mongoose.Types.ObjectId;
  planType: mongoose.Types.ObjectId;
  paidStatus: PaymentStatus;
  paymentTransactionId?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

const labSubscriptionSchema = new Schema<ILabSubscription>(
  {
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },
    lab: {
      type: Schema.Types.ObjectId,
      ref: "Lab",
      required: true,
      index: true,
    },
    planType: {
      type: Schema.Types.ObjectId,
      ref: "PlanType",
      required: true,
      index: true,
    },
    paidStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: DEFAULT_PAYMENT_STATUS,
      index: true,
    },
    paymentTransactionId: {
      type: String,
      sparse: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

labSubscriptionSchema.index({ lab: 1, isActive: 1 });
labSubscriptionSchema.index({ paidStatus: 1, isActive: 1 });

labSubscriptionSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(
        this.tenantPrefix,
        "LabSubscription"
      );
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export { labSubscriptionSchema };
