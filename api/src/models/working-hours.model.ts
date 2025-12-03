import { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IWorkingHours extends ITenantDocument {
  identifier: string;
  monday: { start: string; end: string; isOpen: boolean };
  tuesday: { start: string; end: string; isOpen: boolean };
  wednesday: { start: string; end: string; isOpen: boolean };
  thursday: { start: string; end: string; isOpen: boolean };
  friday: { start: string; end: string; isOpen: boolean };
  saturday: { start: string; end: string; isOpen: boolean };
  sunday: { start: string; end: string; isOpen: boolean };
}

const daySchema = {
  start: { type: String, default: "09:00" },
  end: { type: String, default: "18:00" },
  isOpen: { type: Boolean, default: true },
};

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    identifier: {
      type: String,
      unique: true,
      immutable: true,
      trim: true,
    },
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: {
      ...daySchema,
      isOpen: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index

workingHoursSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(
        this.tenantPrefix,
        "WorkingHours"
      );
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export { workingHoursSchema };
