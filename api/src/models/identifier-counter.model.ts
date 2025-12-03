import { Schema, Model } from "mongoose";
import {
  IdentifierConfigManager,
  generateIdentifier,
  getResetKey,
} from "@/config/identifier.config";
import {
  createTenantModel,
  getTenantModel,
  ITenantDocument,
} from "@/models/base.model";

export interface IIdentifierCounter extends ITenantDocument {
  modelName: string;
  resetKey: string;
  counter: number;
  lastUsed: Date;
}

/**
 * Interface for static methods on IdentifierCounter model
 */
export interface IIdentifierCounterModel extends Model<IIdentifierCounter> {
  getNextIdentifier(tenantPrefix: string, modelName: string): Promise<string>;
  getCurrentCounter(tenantPrefix: string, modelName: string): Promise<number>;
  resetCounter(tenantPrefix: string, modelName: string): Promise<void>;
  getUsageStats(tenantPrefix: string): Promise<any[]>;
  cleanupOldCounters(daysOld?: number): Promise<number>;
}

const identifierCounterSchema = new Schema<IIdentifierCounter>(
  {
    modelName: {
      type: String,
      required: true,
      trim: true,
    },
    resetKey: {
      type: String,
      required: true,
      trim: true,
    },
    counter: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

identifierCounterSchema.index({ modelName: 1, resetKey: 1 }, { unique: true });

identifierCounterSchema.index({ modelName: 1 });
identifierCounterSchema.index({ lastUsed: 1 });

/**
 * Get next identifier for a model in a tenant
 */
identifierCounterSchema.statics.getNextIdentifier = async function (
  tenantPrefix: string,
  modelName: string
): Promise<string> {
  const config = IdentifierConfigManager.getConfig(tenantPrefix, modelName);
  const resetKey = getResetKey(config.resetFrequency);

  const counterDoc = await this.findOneAndUpdate(
    {
      modelName,
      resetKey,
    },
    {
      $inc: { counter: 1 },
      $set: { lastUsed: new Date() },
      $setOnInsert: {
        modelName,
        resetKey,
      },
    },
    {
      upsert: true,
      new: true,
      returnDocument: "after",
    }
  );

  return generateIdentifier(tenantPrefix, modelName, counterDoc.counter);
};

/**
 * Get current counter value without incrementing
 */
identifierCounterSchema.statics.getCurrentCounter = async function (
  tenantPrefix: string,
  modelName: string
): Promise<number> {
  const config = IdentifierConfigManager.getConfig(tenantPrefix, modelName);
  const resetKey = getResetKey(config.resetFrequency);

  const counterDoc = await this.findOne({
    modelName,
    resetKey,
  });

  return counterDoc ? counterDoc.counter : 0;
};

/**
 * Reset counter for a specific model and tenant
 */
identifierCounterSchema.statics.resetCounter = async function (
  tenantPrefix: string,
  modelName: string
): Promise<void> {
  const config = IdentifierConfigManager.getConfig(tenantPrefix, modelName);
  const resetKey = getResetKey(config.resetFrequency);

  await this.findOneAndUpdate(
    {
      modelName,
      resetKey,
    },
    {
      $set: {
        counter: 0,
        lastUsed: new Date(),
      },
    },
    { upsert: true }
  );
};

/**
 * Get statistics for identifier usage
 * Note: tenantPrefix is kept for API consistency but not used in query
 * since all documents in the collection already belong to the tenant
 */
identifierCounterSchema.statics.getUsageStats = async function (): Promise<
  any[]
> {
  return await this.aggregate([
    {
      $group: {
        _id: "$modelName",
        totalCounters: { $sum: 1 },
        maxCounter: { $max: "$counter" },
        minCounter: { $min: "$counter" },
        avgCounter: { $avg: "$counter" },
        lastUsed: { $max: "$lastUsed" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Clean up old counters (for daily/monthly reset frequencies)
 */
identifierCounterSchema.statics.cleanupOldCounters = async function (
  daysOld: number = 365
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    lastUsed: { $lt: cutoffDate },
    resetKey: { $ne: "all-time" },
  });

  return result.deletedCount || 0;
};

export { identifierCounterSchema };

/**
 * Create a tenant-specific IdentifierCounter model
 * @param tenantPrefix - Tenant identifier
 * @returns Tenant-specific IdentifierCounter model
 */
export function createIdentifierCounterModel(
  tenantPrefix: string
): Model<IIdentifierCounter> & IIdentifierCounterModel {
  return createTenantModel<IIdentifierCounter>(
    tenantPrefix,
    "IdentifierCounter",
    identifierCounterSchema
  ) as Model<IIdentifierCounter> & IIdentifierCounterModel;
}

/**
 * Get existing tenant-specific IdentifierCounter model or create if not exists
 * @param tenantPrefix - Tenant identifier
 * @returns Tenant-specific IdentifierCounter model
 */
export function getIdentifierCounterModel(
  tenantPrefix: string
): Model<IIdentifierCounter> & IIdentifierCounterModel {
  return getTenantModel<IIdentifierCounter>(
    tenantPrefix,
    "IdentifierCounter",
    identifierCounterSchema
  ) as Model<IIdentifierCounter> & IIdentifierCounterModel;
}

/**
 * Helper function to get next identifier (used in pre-save middleware)
 * This function automatically gets the tenant-specific counter model
 */
export async function getNextIdentifier(
  tenantPrefix: string,
  modelName: string
): Promise<string> {
  const IdentifierCounter = getIdentifierCounterModel(tenantPrefix);
  return await IdentifierCounter.getNextIdentifier(tenantPrefix, modelName);
}
