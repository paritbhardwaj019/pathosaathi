import jwt from "jsonwebtoken";
import { env } from "./env.config";
import { PathoSaathiJWTPayload } from "../types/auth.types";

/**
 * JWT Configuration for PathoSaathi
 * Handles token generation and validation with domain isolation support
 */
export class PathoSaathiJWTConfig {
  private static readonly SECRET = env.JWT_SECRET;
  private static readonly EXPIRES_IN = env.JWT_EXPIRES_IN || "7d";
  private static readonly REFRESH_EXPIRES_IN =
    env.JWT_REFRESH_EXPIRES_IN || "30d";

  /**
   * Generate access token with PathoSaathi-specific payload
   * @param payload - JWT payload without iat and exp
   * @returns Signed JWT access token
   */
  public static generateAccessToken(
    payload: Omit<PathoSaathiJWTPayload, "iat" | "exp">
  ): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
      issuer: env.APP_DOMAIN,
      audience: payload.isRootUser ? env.APP_DOMAIN : payload.partnerDomain,
    });
  }

  /**
   * Generate refresh token with extended expiration
   * @param payload - JWT payload without iat and exp
   * @returns Signed JWT refresh token
   */
  public static generateRefreshToken(
    payload: Omit<PathoSaathiJWTPayload, "iat" | "exp">
  ): string {
    return jwt.sign(
      {
        user: payload.user,
        identifier: payload.identifier,
        role: payload.role,
        isRootUser: payload.isRootUser,
        partner: payload.partner,
        partnerDomain: payload.partnerDomain,
        tenantPrefix: payload.tenantPrefix,
        sessionId: payload.sessionId,
        tokenType: "refresh",
      },
      this.SECRET,
      {
        expiresIn: this.REFRESH_EXPIRES_IN,
        issuer: env.APP_DOMAIN,
        audience: payload.isRootUser ? env.APP_DOMAIN : payload.partnerDomain,
      }
    );
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token to verify
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  public static verifyToken(token: string): PathoSaathiJWTPayload {
    try {
      const decoded = jwt.verify(token, this.SECRET, {
        issuer: env.APP_DOMAIN,
      });

      if (typeof decoded === "string") {
        throw new Error("Invalid token payload format");
      }

      return decoded as PathoSaathiJWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token has expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid token");
      } else {
        throw new Error("Token verification failed");
      }
    }
  }

  /**
   * Decode token without verification (for expired token inspection)
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  public static decodeToken(token: string): PathoSaathiJWTPayload | null {
    try {
      const decoded = jwt.decode(token, { complete: false });

      if (!decoded || typeof decoded === "string") {
        return null;
      }

      return decoded as PathoSaathiJWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired without verifying signature
   * @param token - JWT token to check
   * @returns Whether token is expired
   */
  public static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);

      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract domain from token audience
   * @param token - JWT token
   * @returns Token audience (domain)
   */
  public static getTokenAudience(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return (decoded?.aud as string) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate token audience matches expected domain
   * @param token - JWT token
   * @param expectedDomain - Expected domain
   * @returns Whether audience matches
   */
  public static validateTokenAudience(
    token: string,
    expectedDomain: string
  ): boolean {
    try {
      const audience = this.getTokenAudience(token);

      if (!audience) {
        return false;
      }

      const normalizeAudience = audience.toLowerCase().trim();
      const normalizeExpected = expectedDomain.toLowerCase().trim();

      return (
        normalizeAudience === normalizeExpected ||
        normalizeAudience === env.APP_DOMAIN
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate token pair (access + refresh)
   * @param payload - JWT payload
   * @returns Object with access and refresh tokens
   */
  public static generateTokenPair(
    payload: Omit<PathoSaathiJWTPayload, "iat" | "exp">
  ): { accessToken: string; refreshToken: string; expiresIn: number } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: this.parseExpirationTime(String(this.EXPIRES_IN)),
    };
  }

  /**
   * Parse expiration time string to seconds
   * @param expiresIn - Expiration string (e.g., "7d", "1h", "30m")
   * @returns Expiration time in seconds
   */
  private static parseExpirationTime(expiresIn: string): number {
    if (typeof expiresIn === "number") {
      return expiresIn;
    }

    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    if (isNaN(value)) {
      return 7 * 24 * 60 * 60;
    }

    switch (unit) {
      case "d":
        return value * 24 * 60 * 60;
      case "h":
        return value * 60 * 60;
      case "m":
        return value * 60;
      case "s":
        return value;
      default:
        return 7 * 24 * 60 * 60;
    }
  }

  /**
   * Create minimal payload for token generation
   * @param user - User document
   * @param partner - Partner document (optional)
   * @param lab - Lab document (optional)
   * @param sessionId - Session ID
   * @param domain - Login domain
   * @returns JWT payload
   */
  public static createPayload(
    user: any,
    partner: any | null,
    lab: any | null,
    session: string,
    isRootUser: boolean = false
  ): Omit<PathoSaathiJWTPayload, "iat" | "exp"> {
    const tenantPrefix = this.determineTenantPrefix(user, partner, isRootUser);

    return {
      user: user._id.toString(),
      identifier: user.identifier,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      partner: partner?._id?.toString(),
      partnerDomain: isRootUser ? undefined : partner?.domain,
      lab: lab?._id?.toString(),
      isRootUser,
      tenantPrefix,
      session,
    };
  }

  /**
   * Determine tenant prefix based on user context
   * @param user - User document (unused but kept for API consistency)
   * @param partner - Partner document
   * @param isRootUser - Whether user is root user
   * @returns Tenant prefix
   */
  private static determineTenantPrefix(
    _user: any,
    partner: any | null,
    isRootUser: boolean
  ): string {
    if (isRootUser || !partner) {
      return "PS_ROOT";
    }

    const cleanName = partner.companyName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 8);

    return `PS_${cleanName}_${partner._id.toString().slice(-4).toUpperCase()}`;
  }
}

export default PathoSaathiJWTConfig;
