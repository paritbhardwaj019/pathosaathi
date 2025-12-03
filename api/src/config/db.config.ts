import mongoose from "mongoose";
import { env } from "./env.config";
import { logger } from "@/utils/logger.util";

export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      mongoose.set("strictQuery", false);

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(env.MONGODB_URI, options);

      logger.info("MongoDB connected successfully");

      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected. Attempting to reconnect...");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected successfully");
      });

      process.on("SIGINT", async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error("MongoDB connection failed:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
    }
  }

  public getConnection() {
    return mongoose.connection;
  }
}

export const database = Database.getInstance();
