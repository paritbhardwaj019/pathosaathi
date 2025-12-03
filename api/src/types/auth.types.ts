import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../config/role.config";

export interface AuthRequest extends Request {
  headers: Request["headers"] & {
    "user-agent"?: string;
    "x-forwarded-for"?: string;
    authorization?: string;
    origin?: string;
    host?: string;
    referer?: string;
  };
  user?: {
    id: string;
    identifier: string;
    role: UserRole;
    name: string;
    email?: string;
    phone?: string;
    partnerId?: string;
    partnerDomain?: string;
    labId?: string;
    isRootUser?: boolean;
    tenantPrefix?: string;
  };
  body: Request["body"] & {
    phone?: string;
    email?: string;
    password?: string;
    refreshToken?: string;
    token?: string;
    confirmPassword?: string;
  };
}

export interface PathoSaathiJWTPayload extends JwtPayload {
  user: string;
  identifier: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  partner?: string;
  partnerDomain?: string;
  lab?: string;
  isRootUser: boolean;
  tenantPrefix: string;
  session?: string;
  sessionId?: string; // Keep for backward compatibility
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  domain: string;
}

export interface LoginResponse {
  user: {
    id: string;
    identifier: string;
    name: string;
    email?: string;
    phone?: string;
    role: UserRole;
    isRootUser: boolean;
    partner?: {
      id: string;
      companyName: string;
      domain?: string;
      partnerType: string;
    };
    lab?: {
      id: string;
      labName: string;
    };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  session: {
    session: string;
    loginAt: Date;
    ipAddress: string;
    domain: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  domain: string;
}

export interface PasswordSetupRequest {
  token: string;
  password: string;
  confirmPassword: string;
  ipAddress: string;
  userAgent: string;
  domain: string;
}

// Domain validation result
export interface DomainValidationResult {
  isValid: boolean;
  isRootUser: boolean;
  allowedDomain?: string;
  actualDomain: string;
  partner?: string;
  error?: string;
}

// Authentication error types
export enum AuthError {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  DOMAIN_MISMATCH = "DOMAIN_MISMATCH",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  PARTNER_INACTIVE = "PARTNER_INACTIVE",
  DOMAIN_NOT_ALLOWED = "DOMAIN_NOT_ALLOWED",
  ROOT_DOMAIN_REQUIRED = "ROOT_DOMAIN_REQUIRED",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
  SETUP_TOKEN_INVALID = "SETUP_TOKEN_INVALID",
}

export interface UserSession {
  session: string;
  user: string;
  partner?: string;
  lab?: string;
  ipAddress: string;
  userAgent: string;
  domain: string;
  loginAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  os?: string;
}
