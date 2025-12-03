import { Schema } from "mongoose";
import { ITenantDocument } from "./base.model";
import { getNextIdentifier } from "./identifier-counter.model";

export interface IApiIntegration extends ITenantDocument {
  identifier: string;
  name: string;
  enabled: boolean;
}

const apiIntegrationSchema = new Schema<IApiIntegration>(
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
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// identifier index is created by unique: true, no need for explicit index

apiIntegrationSchema.pre("save", async function (next) {
  try {
    if (!this.identifier && this.tenantPrefix) {
      this.identifier = await getNextIdentifier(
        this.tenantPrefix,
        "ApiIntegration"
      );
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export { apiIntegrationSchema };
