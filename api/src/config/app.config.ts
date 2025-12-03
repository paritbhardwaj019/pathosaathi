import express, { Application } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";
import httpStatus from "http-status";
import { env, isProduction } from "./env.config";
import { logger } from "@/utils/logger.util";
import { errorMiddleware } from "@/middleware/error.middleware";
import { setupSwagger } from "./swagger.config";
import { ModelFactory } from "@/services/model-factory.service";
import authRoutes from "../routes/auth.routes";

export class AppConfig {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
    this.initializeModels();

    if (!isProduction) {
      setupSwagger(this.app);
    }
  }

  /**
   * Initialize all core models at app startup
   * This ensures models are registered with both tenant-specific and ref names
   * so that populate operations work correctly
   */
  private initializeModels(): void {
    try {
      ModelFactory.initializeCoreModels();
      logger.info("Core models initialized successfully");
    } catch (error) {
      logger.error("Error initializing core models:", error);
      // Don't throw - models will be initialized on first use
    }
  }

  private setupMiddlewares(): void {
    this.app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

    this.app.use(
      helmet({
        contentSecurityPolicy: isProduction ? undefined : false,
      })
    );

    this.app.use((req, _, next) => {
      logger.info(`${req.method} ${req.path} `);
      next();
    });

    this.app.use(express.json({ limit: env.MAX_FILE_SIZE }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    this.app.use(compression());

    this.app.use(cookieParser());

    if (isProduction) {
      this.app.use(
        "/api/",
        rateLimit({
          windowMs: env.RATE_LIMIT_WINDOW_MS,
          max: env.RATE_LIMIT_MAX_REQUESTS,
          message: "Too many requests from this IP, please try again later.",
          standardHeaders: true,
          legacyHeaders: false,
        })
      );
    }

    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((origin) =>
      origin.trim()
    );

    this.app.use((req, res, next) => {
      const origin = req.headers.origin;

      if (!origin || allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin || "*");
      }

      res.header(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] ||
          "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header(
        "Access-Control-Allow-Methods",
        req.headers["access-control-request-method"] ||
          "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Credentials", "true");

      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }

      if (origin && !allowedOrigins.includes(origin) && origin !== "swagger") {
        return next(new Error("Not allowed by CORS"));
      }

      return next();
    });
  }

  private setupRoutes(): void {
    const apiPrefix = `/api/${env.API_VERSION}`;

    this.app.use(`${apiPrefix}/auth`, authRoutes);

    this.app.get("/health", (_, res) => {
      res.status(200).json({
        success: true,
        message: "PathoSaathi API is running",
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use(`${apiPrefix}/*`, (_, res) => {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Route not found",
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  public getApp(): Application {
    return this.app;
  }
}
