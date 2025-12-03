import dotenv from "dotenv";
import { Secret, SignOptions } from "jsonwebtoken";

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  MONGODB_URI: string;
  JWT_SECRET: Secret;
  JWT_EXPIRES_IN: SignOptions["expiresIn"];
  JWT_REFRESH_EXPIRES_IN: SignOptions["expiresIn"];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  BCRYPT_SALT_ROUNDS: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOCK_TIME: number;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;
  ALLOWED_ORIGINS: string;
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;
  DEFAULT_LIMIT: number;
  APP_DOMAIN: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  PORT: getEnvNumber("PORT", 5000),
  API_VERSION: getEnvVar("API_VERSION", "v1"),
  MONGODB_URI: getEnvVar("MONGODB_URI"),
  JWT_SECRET: getEnvVar("JWT_SECRET") as Secret,
  JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", "7d") as SignOptions["expiresIn"],
  JWT_REFRESH_EXPIRES_IN: getEnvVar(
    "JWT_REFRESH_EXPIRES_IN",
    "30d"
  ) as SignOptions["expiresIn"],
  RATE_LIMIT_WINDOW_MS: getEnvNumber("RATE_LIMIT_WINDOW_MS", 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber("RATE_LIMIT_MAX_REQUESTS", 100),
  BCRYPT_SALT_ROUNDS: getEnvNumber("BCRYPT_SALT_ROUNDS", 10),
  MAX_LOGIN_ATTEMPTS: getEnvNumber("MAX_LOGIN_ATTEMPTS", 5),
  LOCK_TIME: getEnvNumber("LOCK_TIME", 3600000),
  MAX_FILE_SIZE: getEnvNumber("MAX_FILE_SIZE", 5242880),
  ALLOWED_FILE_TYPES: getEnvVar(
    "ALLOWED_FILE_TYPES",
    "image/jpeg,image/png,image/jpg,video/mp4"
  ),
  ALLOWED_ORIGINS: getEnvVar(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
  ),
  LOG_LEVEL: getEnvVar("LOG_LEVEL", "info"),
  LOG_FILE_PATH: getEnvVar("LOG_FILE_PATH", "./logs"),
  DEFAULT_LIMIT: getEnvNumber("DEFAULT_LIMIT", 10),
  APP_DOMAIN: getEnvVar("APP_DOMAIN", "pathosaathi.in"),
  CLOUDINARY_CLOUD_NAME: getEnvVar("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getEnvVar("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getEnvVar("CLOUDINARY_API_SECRET"),
};

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
