import mongoose, { Schema, Document, Model } from "mongoose";
import { getTenantCollectionName } from "@/config/tenant.config";

/**
 * Base interface for all tenant-aware documents
 */
export interface ITenantDocument extends Document {
  identifier: string;
  tenantPrefix: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a tenant-aware model
 * @param tenantPrefix - Tenant identifier
 * @param modelName - Base model name
 * @param schema - Mongoose schema
 * @returns Tenant-specific model
 */
export function createTenantModel<T extends ITenantDocument>(
  tenantPrefix: string,
  modelName: string,
  schema: Schema<T>
): Model<T> {
  const collectionName = getTenantCollectionName(tenantPrefix, modelName);

  if (!schema.paths.tenantPrefix) {
    schema.add({
      tenantPrefix: {
        type: String,
        required: true,
        immutable: true,
        default: tenantPrefix,
      },
    } as unknown as Parameters<typeof schema.add>[0]);
  }

  if (!schema.paths.createdAt) {
    schema.add({
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    } as unknown as Parameters<typeof schema.add>[0]);
  }

  schema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
  });

  return mongoose.model<T>(collectionName, schema, collectionName);
}

/**
 * Get existing tenant model or create if not exists
 * @param tenantPrefix - Tenant identifier
 * @param modelName - Base model name
 * @param schema - Mongoose schema
 * @returns Tenant-specific model
 */
export function getTenantModel<T extends ITenantDocument>(
  tenantPrefix: string,
  modelName: string,
  schema: Schema<T>
): Model<T> {
  const collectionName = getTenantCollectionName(tenantPrefix, modelName);

  try {
    return mongoose.model<T>(collectionName);
  } catch (error) {
    return createTenantModel<T>(tenantPrefix, modelName, schema);
  }
}
