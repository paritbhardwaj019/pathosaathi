import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.util";
import { env } from "./env.config";

/**
 * Configure Swagger documentation for the API
 * @param {express.Application} app - Express application
 */
export const setupSwagger = (app: express.Application): void => {
  try {
    const docsPath = path.resolve(__dirname, "../../docs");

    if (!fs.existsSync(docsPath)) {
      logger.warn("Swagger docs directory not found. Creating directory...");
      fs.mkdirSync(docsPath, { recursive: true });
    }

    const swaggerFiles = [
      { name: "auth", path: path.join(docsPath, "auth-swagger.yaml") },
    ];

    const availableSwaggers: { [key: string]: any } = {};

    swaggerFiles.forEach((file) => {
      try {
        if (fs.existsSync(file.path)) {
          availableSwaggers[file.name] = YAML.load(file.path);
          logger.info(`Loaded Swagger file: ${file.name}`);
        } else {
          logger.warn(`Swagger file not found: ${file.path}`);
        }
      } catch (error: any) {
        logger.error(`Error loading Swagger file ${file.path}:`, error.message);
      }
    });

    if (Object.keys(availableSwaggers).length === 0) {
      logger.error(
        "No Swagger files found. API documentation will not be available."
      );
      return;
    }

    const baseSwagger = Object.values(availableSwaggers)[0];

    const apiDocs = {
      openapi: "3.0.0",
      info: {
        title: "PathoSaathi API Documentation",
        description: "API documentation for PathoSaathi diagnostic platform",
        version: "1.0.0",
        contact: {
          email: "support@pathosaathi.in",
        },
      },
      servers: baseSwagger.servers || [
        {
          url: `http://localhost:${env.PORT}/api/${env.API_VERSION}`,
          description: "Development server",
        },
        {
          url: `https://api.pathosaathi.in/api/${env.API_VERSION}`,
          description: "Production server",
        },
      ],
      components: {
        securitySchemes: baseSwagger.components?.securitySchemes || {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
        schemas: Object.entries(availableSwaggers).reduce(
          (schemas, [_, swagger]: [string, any]) => {
            return { ...schemas, ...(swagger.components?.schemas || {}) };
          },
          {}
        ),
      },
      paths: Object.entries(availableSwaggers).reduce(
        (paths, [_, swagger]: [string, any]) => {
          return { ...paths, ...(swagger.paths || {}) };
        },
        {}
      ),
      tags: Object.entries(availableSwaggers).reduce(
        (allTags: any[], [_, swagger]: [string, any]) => {
          const tags = swagger.tags || [];
          return [
            ...allTags,
            ...tags.filter(
              (tag: any) =>
                !allTags.some((existingTag) => existingTag.name === tag.name)
            ),
          ];
        },
        []
      ),
    };

    const options = {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "PathoSaathi API Docs",
      customfavIcon: "/favicon.ico",
      swaggerOptions: {
        persistAuthorization: true,
        filter: true,
        displayRequestDuration: true,
        docExpansion: "none",
      },
    };

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(apiDocs, options));

    app.get("/api-docs.json", (_, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(apiDocs);
    });

    logger.info(`🚀 Swagger documentation available at /api-docs`);
  } catch (error: any) {
    logger.error("Failed to setup Swagger documentation:", error.message);
    logger.error(error.stack);
  }
};

/**
 * Get the Swagger docs for a specific route
 */
export const getSwaggerDocs = (module: string): any => {
  try {
    const docsPath = path.join(__dirname, "../docs");
    const filePath = path.join(docsPath, `${module}-swagger.yaml`);

    if (fs.existsSync(filePath)) {
      return YAML.load(filePath);
    }

    logger.warn(`Swagger file for module ${module} not found at ${filePath}`);
    return null;
  } catch (error: any) {
    logger.error(
      `Error loading Swagger file for module ${module}:`,
      error.message
    );
    return null;
  }
};

/**
 * Register a new swagger file programmatically
 * @param module Module name
 * @param content YAML content
 */
export const registerSwaggerFile = (
  module: string,
  content: string
): boolean => {
  try {
    const docsPath = path.join(__dirname, "../docs");

    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true });
    }

    const filePath = path.join(docsPath, `${module}-swagger.yaml`);
    fs.writeFileSync(filePath, content, "utf8");
    logger.info(`Registered Swagger file for module ${module}`);
    return true;
  } catch (error: any) {
    logger.error(
      `Error registering Swagger file for module ${module}:`,
      error.message
    );
    return false;
  }
};
