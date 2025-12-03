import { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IAddress extends ITenantDocument {
  identifier: string;
  street?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

const addressSchema = new Schema<IAddress>(
  {
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      match: /^[1-9][0-9]{5}$/,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      default: "India",
      trim: true,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index
addressSchema.index({ city: 1, state: 1 });
addressSchema.index({ pincode: 1 });

addressSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(this.tenantPrefix, "Address");
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export { addressSchema };
