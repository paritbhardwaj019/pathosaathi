import { Request, Response, NextFunction } from "express";
import PathoSaathiJWTConfig from "../config/jwt.config";
import { Models } from "../services/model-factory.service";
import { ApiResponse } from "../utils/apiResponse.util";
import { AuthRequest, PathoSaathiJWTPayload } from "../types/auth.types";
import { ROLES, UserRole } from "../config/role.config";

/**
 * Authentication Middleware for PathoSaathi
 * Validates JWT tokens and enforces domain isolation
 */
export class PathoSaathiAuthMiddleware {
  /**
   * Authenticate user with JWT token validation
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static async authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    console.log("authenticate middleware");
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        ApiResponse.unauthorized(res, "Access token is required");
        return;
      }

      const token = authHeader.substring(7);

      let payload: PathoSaathiJWTPayload;
      try {
        payload = PathoSaathiJWTConfig.verifyToken(token);
      } catch (error) {
        ApiResponse.unauthorized(res, "Invalid or expired token");
        return;
      }

      const currentDomain = PathoSaathiAuthMiddleware.extractDomain(req);

      if (!payload.isRootUser) {
        const domainValid = PathoSaathiJWTConfig.validateTokenAudience(
          token,
          currentDomain
        );
        if (!domainValid) {
          ApiResponse.forbidden(res, "Token not valid for this domain");
          return;
        }
      }

      const User = Models.getUser();
      const user = await User.findById(payload.user).select("-password");

      if (!user || !user.isActive) {
        ApiResponse.unauthorized(res, "User account is no longer active");
        return;
      }

      if (!payload.isRootUser && payload.partner) {
        const Partner = Models.getPartner();
        const partner = await Partner.findById(payload.partner);

        if (!partner || !partner.isActive) {
          ApiResponse.forbidden(res, "Partner account is no longer active");
          return;
        }
      }

      req.user = {
        id: payload.user,
        identifier: payload.identifier,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        partnerId: payload.partner,
        partnerDomain: payload.partnerDomain,
        labId: payload.lab,
        isRootUser: payload.isRootUser,
        tenantPrefix: payload.tenantPrefix,
      };

      next();
    } catch (error) {
      console.error("Authentication middleware error:", error);
      ApiResponse.serverError(res, "Authentication failed");
    }
  }

  /**
   * Require specific role(s)
   * @param allowedRoles - Array of allowed roles
   * @returns Middleware function
   */
  static requireRole(allowedRoles: UserRole | UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        ApiResponse.unauthorized(res, "Authentication required");
        return;
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(req.user.role)) {
        ApiResponse.forbidden(
          res,
          `Access denied. Required role: ${roles.join(" or ")}`
        );
        return;
      }

      next();
    };
  }

  /**
   * Require superadmin role
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static requireSuperAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    if (req.user.role !== ROLES.SUPERADMIN) {
      ApiResponse.forbidden(res, "Superadmin access required");
      return;
    }

    next();
  }

  /**
   * Require root user (superadmin or PS admin)
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static requireRootUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    if (!req.user.isRootUser) {
      ApiResponse.forbidden(res, "Root user access required");
      return;
    }

    next();
  }

  /**
   * Require partner role
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static requirePartner(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    if (req.user.role !== ROLES.PARTNER && !req.user.isRootUser) {
      ApiResponse.forbidden(res, "Partner access required");
      return;
    }

    next();
  }

  /**
   * Require lab user (lab owner, tech, or reception)
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static requireLabUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    const labRoles: UserRole[] = [ROLES.LAB_OWNER, ROLES.TECH, ROLES.RECEPTION];

    if (
      !(labRoles as readonly UserRole[]).includes(req.user.role) &&
      !req.user.isRootUser
    ) {
      ApiResponse.forbidden(res, "Lab user access required");
      return;
    }

    next();
  }

  /**
   * Validate domain access (additional middleware)
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static validateDomain(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    const currentDomain = PathoSaathiAuthMiddleware.extractDomain(req);

    // Root users must be on main domain
    if (req.user.isRootUser) {
      if (!PathoSaathiAuthMiddleware.isMainDomain(currentDomain)) {
        ApiResponse.forbidden(res, "Root users must access from main domain");
        return;
      }
    }
    // Partner users must match their domain
    else if (req.user.partnerDomain) {
      const normalizedCurrent = currentDomain.toLowerCase();
      const normalizedPartner = req.user.partnerDomain.toLowerCase();

      if (normalizedCurrent !== normalizedPartner) {
        ApiResponse.forbidden(
          res,
          `Access from ${req.user.partnerDomain} required`
        );
        return;
      }
    }

    next();
  }

  /**
   * Optional authentication (don't fail if no token)
   * @param req - Express request
   * @param res - Express response
   * @param next - Next function
   */
  static async optionalAuth(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.get("authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);

      try {
        const payload = PathoSaathiJWTConfig.verifyToken(token);

        const User = Models.getUser();
        const user = await User.findById(payload.user).select("-password");

        if (user && user.isActive) {
          req.user = {
            id: payload.user,
            identifier: payload.identifier,
            role: payload.role,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            partnerId: payload.partner,
            partnerDomain: payload.partnerDomain,
            labId: payload.lab,
            isRootUser: payload.isRootUser,
            tenantPrefix: payload.tenantPrefix,
          };
        }
      } catch (error) {
        // Invalid token, continue without authentication
      }

      next();
    } catch (error) {
      console.error("Optional auth middleware error:", error);
      // Don't fail for optional auth, just continue
      next();
    }
  }

  /**
   * Rate limiting middleware (basic implementation)
   * @param maxAttempts - Maximum attempts per IP per hour
   * @returns Middleware function
   */
  static rateLimit(maxAttempts: number = 10) {
    const ipAttempts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = PathoSaathiAuthMiddleware.getClientIP(req);
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;

      const attempts = ipAttempts.get(ip);

      if (!attempts || now > attempts.resetTime) {
        ipAttempts.set(ip, { count: 1, resetTime: now + hourInMs });
        next();
        return;
      }

      if (attempts.count >= maxAttempts) {
        ApiResponse.tooManyRequests(
          res,
          "Too many login attempts. Please try again later."
        );
        return;
      }

      attempts.count++;
      next();
    };
  }

  // Helper Methods

  /**
   * Extract domain from request
   * @param req - Express request
   * @returns Domain string
   */
  private static extractDomain(req: Request): string {
    const hostHeader = req.get("host");
    const originHeader = req.get("origin");

    if (hostHeader) {
      return hostHeader.split(":")[0];
    }

    if (originHeader) {
      try {
        const url = new URL(originHeader);
        return url.hostname;
      } catch (error) {
        // Fall through
      }
    }

    return "localhost"; // Development fallback
  }

  /**
   * Get client IP address
   * @param req - Express request
   * @returns IP address
   */
  private static getClientIP(req: Request): string {
    const forwarded = req.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const realIP = req.get("x-real-ip");
    if (realIP) {
      return realIP.trim();
    }

    return req.connection.remoteAddress || req.ip || "unknown";
  }

  /**
   * Check if domain is main PathoSaathi domain
   * @param domain - Domain to check
   * @returns Whether it's main domain
   */
  private static isMainDomain(domain: string): boolean {
    const mainDomains = [
      "pathosaathi.in",
      "www.pathosaathi.in",
      "app.pathosaathi.in",
      "admin.pathosaathi.in",
      "api.pathosaathi.in",
      "localhost",
      "127.0.0.1",
    ];

    return mainDomains.includes(domain.toLowerCase());
  }
}

export default PathoSaathiAuthMiddleware;
