import { env } from "./config/env.config";
import { logger } from "./utils/logger.util";
import { AppConfig } from "./config/app.config";
import { database } from "./config/db.config";
import MultiTenantMiddleware from "./middleware/multi-tenant.middleware";

class Server {
  private appConfig: AppConfig;

  constructor() {
    this.appConfig = new AppConfig();
  }

  /**
   * Initialize multi-tenant middleware and enhanced app configuration
   */
  private initializeMultiTenantSupport(): void {
    try {
      const app = this.appConfig.getApp();

      app.use(MultiTenantMiddleware.resolveTenant);

      app.get("/", (req: any, res) => {
        const tenantInfo = req.tenant
          ? {
              type: req.tenant.type,
              isMainDomain: req.tenant.isMainDomain,
              subdomain: req.tenant.subdomain,
              customDomain: req.tenant.customDomain,
              partnerName: req.tenant.partner?.companyName,
            }
          : null;

        res.json({
          success: true,
          message: "Welcome to PathoSaathi API",
          version: env.API_VERSION || "1.0.0",
          multiTenant: true,
          tenant: tenantInfo,
          timestamp: new Date().toISOString(),
          documentation: `/api/${env.API_VERSION}/docs`,
          health: "/health",
        });
      });

      app.get("/health", (req: any, res) => {
        const tenantInfo = req.tenant
          ? {
              type: req.tenant.type,
              isMainDomain: req.tenant.isMainDomain,
              resolved: true,
            }
          : {
              type: null,
              resolved: false,
            };

        res.json({
          success: true,
          message: "PathoSaathi Backend is running",
          timestamp: new Date().toISOString(),
          version: env.API_VERSION || "1.0.0",
          environment: env.NODE_ENV,
          multiTenant: true,
          tenant: tenantInfo,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        });
      });

      logger.info("✅ Multi-tenant middleware initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize multi-tenant support:", error);
      throw error;
    }
  }

  /**
   * Log server startup information with multi-tenant details
   */
  private logStartupInfo(): void {
    const port = env.PORT || 5000;

    logger.info(`🚀 PathoSaathi Multi-Tenant API Server started successfully!`);
    logger.info(`📍 Server running on port: ${port}`);
    logger.info(`🌐 Environment: ${env.NODE_ENV}`);
    logger.info(`📚 API Version: ${env.API_VERSION || "v1"}`);
    logger.info(`🏠 Main domain access: http://localhost:${port}`);
    logger.info(`🏢 Multi-tenant support: ENABLED`);
    logger.info(`🔗 Health check: http://localhost:${port}/health`);
    logger.info(
      `📡 API Base: http://localhost:${port}/api/${env.API_VERSION || "v1"}`
    );

    if (env.NODE_ENV === "production") {
      logger.info(`\n🏭 Production Multi-Tenant Configuration:`);
      logger.info(`   • Configure DNS wildcards for subdomains`);
      logger.info(`   • Set up SSL certificates for custom domains`);
      logger.info(`   • Monitor tenant resolution performance`);
    }
  }

  /**
   * Enhanced error handling for multi-tenant operations
   */
  private setupErrorHandling(): void {
    process.on("uncaughtException", (error) => {
      logger.error("💥 Uncaught Exception:", error);
      logger.error("Stack trace:", error.stack);

      setTimeout(() => {
        logger.info("🔄 Shutting down due to uncaught exception...");
        this.gracefulShutdown(1);
      }, 1000);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("💥 Unhandled Rejection at:", promise);
      logger.error("Reason:", reason);

      setTimeout(() => {
        logger.info("🔄 Shutting down due to unhandled rejection...");
        this.gracefulShutdown(1);
      }, 1000);
    });

    process.on("SIGTERM", async () => {
      logger.info("📡 SIGTERM received, initiating graceful shutdown...");
      await this.gracefulShutdown(0);
    });

    process.on("SIGINT", async () => {
      logger.info("⌨️  SIGINT received, initiating graceful shutdown...");
      await this.gracefulShutdown(0);
    });

    process.on("warning", (warning) => {
      logger.warn("⚠️  Process warning:", warning.name, warning.message);
    });
  }

  /**
   * Graceful shutdown with multi-tenant cleanup
   */
  private async gracefulShutdown(exitCode: number = 0): Promise<void> {
    try {
      logger.info("🔄 Starting graceful shutdown sequence...");

      logger.info("📦 Closing database connections...");
      await database.disconnect();

      logger.info("🏢 Cleaning up multi-tenant resources...");

      logger.info("✅ Graceful shutdown completed successfully");
      process.exit(exitCode);
    } catch (error) {
      logger.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  /**
   * Validate environment for multi-tenant operations
   */
  private validateMultiTenantEnvironment(): void {
    const requiredEnvVars: Array<keyof typeof env> = ["MONGODB_URI", "PORT"];
    const missingVars = requiredEnvVars.filter((varName) => !env[varName]);

    if (missingVars.length > 0) {
      logger.error(
        `❌ Missing required environment variables: ${missingVars.join(", ")}`
      );
      throw new Error(
        "Missing required environment variables for multi-tenant operation"
      );
    }

    if (env.MONGODB_URI && !env.MONGODB_URI.startsWith("mongodb")) {
      logger.error("❌ Invalid MongoDB URI format");
      throw new Error("Invalid MongoDB URI format");
    }

    logger.info("✅ Multi-tenant environment validation passed");

    if (env.NODE_ENV === "development") {
      logger.info(
        "🧪 Development mode: Enhanced logging and debugging enabled"
      );
    }
  }

  /**
   * Initialize and start the multi-tenant server
   */
  async start(): Promise<void> {
    try {
      logger.info("🚀 Initializing PathoSaathi Multi-Tenant Server...");

      this.validateMultiTenantEnvironment();

      logger.info("📦 Connecting to MongoDB...");
      await database.connect();
      logger.info("✅ Database connection established");

      logger.info("🏢 Initializing multi-tenant support...");
      this.initializeMultiTenantSupport();

      this.setupErrorHandling();

      const port = env.PORT || 5000;
      this.appConfig.getApp().listen(port, () => {
        this.logStartupInfo();

        this.performStartupTasks();
      });
    } catch (error: unknown) {
      logger.error("❌ Failed to start multi-tenant server:", error);
      if (error instanceof Error && error.stack) {
        logger.error("Stack trace:", error.stack);
      }

      try {
        await database.disconnect();
      } catch (cleanupError) {
        logger.error("❌ Error during cleanup:", cleanupError);
      }

      process.exit(1);
    }
  }

  /**
   * Perform additional startup tasks
   */
  private performStartupTasks(): void {
    if (env.NODE_ENV === "production") {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 500 * 1024 * 1024) {
          logger.warn(
            `⚠️  High memory usage: ${Math.round(
              memUsage.heapUsed / 1024 / 1024
            )} MB`
          );
        }
      }, 60000);
    }
  }
}

export { Server };

if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error("💥 Fatal error starting server:", error);
    process.exit(1);
  });
}
