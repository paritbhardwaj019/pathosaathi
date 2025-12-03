import { env } from "./config/env.config";
import { logger } from "./utils/logger.util";
import { AppConfig } from "./config/app.config";
import { database } from "./config/db.config";

class Server {
  private appConfig: AppConfig;

  constructor() {
    this.appConfig = new AppConfig();
  }

  async start() {
    try {
      await database.connect();
      this.appConfig.getApp().listen(env.PORT, () => {
        logger.info(`🚀 PathoSaathi API Server is running on port ${env.PORT}`);
        logger.info(`📍 Environment: ${env.NODE_ENV}`);
        logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
        logger.info(
          `📡 API Base: http://localhost:${env.PORT}/api/${env.API_VERSION}`
        );
      });

      process.on("uncaughtException", (error) => {
        logger.error("Uncaught Exception:", error);
        process.exit(1);
      });

      process.on("unhandledRejection", (reason, promise) => {
        logger.error("Unhandled Rejection at:", promise, "reason:", reason);
        process.exit(1);
      });

      process.on("SIGTERM", async () => {
        logger.info("SIGTERM received, shutting down gracefully...");
        await database.disconnect();
        process.exit(0);
      });

      process.on("SIGINT", async () => {
        logger.info("SIGINT received, shutting down gracefully...");
        await database.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();
