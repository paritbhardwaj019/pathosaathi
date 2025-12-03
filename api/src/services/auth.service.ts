import mongoose from "mongoose";
import { Models } from "./model-factory.service";
import PathoSaathiJWTConfig from "../config/jwt.config";
import { ROLES } from "../config/role.config";
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  DomainValidationResult,
  PasswordSetupRequest,
  AuthError,
  PathoSaathiJWTPayload,
} from "../types/auth.types";
import { ApiError } from "../utils/apiError.util";

/**
 * Authentication Service
 * Handles domain-isolated authentication for partners and root users
 */
export class AuthService {
  /**
   * Main login with domain isolation
   * @param loginData - Login request data
   * @returns Login response
   * @throws ApiError on authentication failure
   */
  static async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, phone, password, ipAddress, userAgent, domain } = loginData;

    const User = Models.getUser();
    const queryConditions: any[] = [];

    if (email) {
      queryConditions.push({ email: email.toLowerCase().trim() });
    }
    if (phone) {
      queryConditions.push({ phone: phone.trim() });
    }

    const user = await User.findOne({
      $or: queryConditions.length > 0 ? queryConditions : [{ email: "" }],
    })
      .select("+password")
      .populate({
        path: "partner",
        select: "companyName domain partnerType isActive",
      })
      .populate({
        path: "lab",
        select: "labName isActive",
      });

    if (!user) {
      throw ApiError.authenticationError(
        "Invalid email/phone or password",
        AuthError.INVALID_CREDENTIALS
      );
    }

    if (!user.isActive) {
      throw ApiError.authenticationError(
        "Your account has been deactivated. Please contact support.",
        AuthError.ACCOUNT_INACTIVE
      );
    }

    if (user.isLocked && user.isLocked()) {
      throw ApiError.authenticationError(
        "Account temporarily locked due to multiple failed attempts. Please try again later.",
        AuthError.ACCOUNT_LOCKED
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw ApiError.authenticationError(
        "Invalid email/phone or password",
        AuthError.INVALID_CREDENTIALS
      );
    }

    const isRootUser = this.isRootUser(user);

    const domainValidation = await this.validateDomainAccess(
      user,
      domain,
      isRootUser
    );
    if (!domainValidation.isValid) {
      throw ApiError.authenticationError(
        domainValidation.error || "Access denied for this domain",
        AuthError.DOMAIN_MISMATCH
      );
    }

    await user.resetLoginAttempts();

    user.lastLoginAt = new Date();
    user.ipAddress = ipAddress;
    await user.save();

    const sessionId = new mongoose.Types.ObjectId().toString();

    const payload = PathoSaathiJWTConfig.createPayload(
      user,
      user.partner,
      user.lab,
      sessionId,
      isRootUser
    );

    const tokens = PathoSaathiJWTConfig.generateTokenPair(payload);

    await this.logLoginActivity(user, {
      ipAddress,
      userAgent,
      domain,
      success: true,
      sessionId,
    });

    const response: LoginResponse = {
      user: {
        id: this.convertUserIdToString(user._id),
        identifier: user.identifier,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isRootUser,
        partner: this.transformPartnerData(user.partner, isRootUser),
        lab: this.transformLabData(user.lab),
      },
      tokens,
      session: {
        session: sessionId,
        loginAt: new Date(),
        ipAddress,
        domain: this.extractDomain(domain),
      },
    };

    return response;
  }

  /**
   * Refresh token with domain validation
   * @param refreshData - Refresh token request
   * @returns New tokens
   * @throws ApiError on token refresh failure
   */
  static async refreshToken(
    refreshData: RefreshTokenRequest
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const { refreshToken, domain } = refreshData;

    let payload: PathoSaathiJWTPayload;
    try {
      payload = PathoSaathiJWTConfig.verifyToken(refreshToken);
    } catch (error) {
      throw ApiError.authenticationError(
        "Invalid or expired refresh token",
        AuthError.TOKEN_INVALID
      );
    }

    if (!payload.isRootUser) {
      const audienceValid = PathoSaathiJWTConfig.validateTokenAudience(
        refreshToken,
        domain
      );
      if (!audienceValid) {
        throw ApiError.authenticationError(
          "Token not valid for this domain",
          AuthError.DOMAIN_MISMATCH
        );
      }
    }

    const User = Models.getUser();
    const user = await User.findById(payload.user)
      .populate("partner", "companyName domain partnerType isActive")
      .populate("lab", "labName isActive");

    if (!user || !user.isActive) {
      throw ApiError.authenticationError(
        "User account no longer active",
        AuthError.ACCOUNT_INACTIVE
      );
    }

    if (
      !payload.isRootUser &&
      user.partner &&
      typeof user.partner === "object" &&
      "_id" in user.partner &&
      !(user.partner as any).isActive
    ) {
      throw ApiError.authenticationError(
        "Partner account is no longer active",
        AuthError.PARTNER_INACTIVE
      );
    }

    const sessionId: string =
      payload.session ||
      payload.sessionId ||
      new mongoose.Types.ObjectId().toString();
    const newPayload = PathoSaathiJWTConfig.createPayload(
      user,
      user.partner,
      user.lab,
      sessionId,
      payload.isRootUser
    );

    const newTokens = PathoSaathiJWTConfig.generateTokenPair(newPayload);

    return newTokens;
  }

  /**
   * Get current user information
   * @param userId - User ID from token
   * @returns User information
   * @throws ApiError if user not found
   */
  static async getMe(userId: string): Promise<any> {
    const User = Models.getUser();
    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "partner",
        select:
          "companyName domain partnerType customIdentifierPrefix branding",
      })
      .populate({
        path: "lab",
        select: "labName address phone email",
      });

    if (!user) {
      throw ApiError.notFoundError("User not found", "USER_NOT_FOUND");
    }

    const isRootUser = this.isRootUser(user);

    const userData = {
      id: this.convertUserIdToString(user._id),
      identifier: user.identifier,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isRootUser,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      partner: this.transformPartnerData(user.partner, isRootUser) || null,
      lab: this.transformLabData(user.lab) || null,
    };

    return userData;
  }

  /**
   * Setup password for staff invitation
   * @param setupData - Password setup request
   * @returns Login response
   * @throws ApiError on setup failure
   */
  static async setupPassword(
    setupData: PasswordSetupRequest
  ): Promise<LoginResponse> {
    const { password, confirmPassword } = setupData;

    if (password !== confirmPassword) {
      throw ApiError.validationError("Passwords do not match", {
        field: "confirmPassword",
      });
    }

    if (password.length < 8) {
      throw ApiError.validationError(
        "Password must be at least 8 characters long",
        { field: "password", minLength: 8 }
      );
    }

    // Verify staff invite token
    // TODO: Implement StaffInvite model when available
    throw ApiError.badRequestError(
      "Staff invitation feature not yet implemented",
      AuthError.SETUP_TOKEN_INVALID
    );
  }

  /**
   * Logout user
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Logout message
   */
  static async logout(
    userId: string,
    sessionId?: string
  ): Promise<{ message: string }> {
    // Could implement session invalidation here if needed
    // For now, just log the logout activity
    try {
      await this.logLoginActivity({ _id: userId } as any, {
        ipAddress: "unknown",
        userAgent: "unknown",
        domain: "unknown",
        success: true,
        sessionId: sessionId || "unknown",
        action: "logout",
      });
    } catch (error) {
      // Don't fail logout due to logging error
      console.error("Logout logging error:", error);
    }

    return {
      message: "Successfully logged out",
    };
  }

  // Helper Methods

  /**
   * Convert user ID to string (handles ObjectId, string, or other types)
   * @param userId - User ID in any format
   * @returns String representation of user ID
   */
  private static convertUserIdToString(userId: any): string {
    if (userId instanceof mongoose.Types.ObjectId) {
      return userId.toString();
    }
    if (typeof userId === "string") {
      return userId;
    }
    return String(userId);
  }

  /**
   * Transform partner data for response
   * @param partner - Partner document (populated or ObjectId)
   * @param isRootUser - Whether user is root user
   * @returns Transformed partner data or undefined
   */
  private static transformPartnerData(
    partner: any,
    isRootUser: boolean
  ):
    | {
        id: string;
        companyName: string;
        domain?: string;
        partnerType: string;
        branding?: any;
      }
    | undefined {
    if (
      !partner ||
      isRootUser ||
      typeof partner !== "object" ||
      !("_id" in partner)
    ) {
      return undefined;
    }

    return {
      id: this.convertUserIdToString(partner._id),
      companyName: partner.companyName,
      domain: partner.domain,
      partnerType: partner.partnerType,
      branding: partner.branding,
    };
  }

  /**
   * Transform lab data for response
   * @param lab - Lab document (populated or ObjectId)
   * @returns Transformed lab data or undefined
   */
  private static transformLabData(lab: any):
    | {
        id: string;
        labName: string;
        address?: any;
        phone?: string;
        email?: string;
      }
    | undefined {
    if (!lab || typeof lab !== "object" || !("_id" in lab)) {
      return undefined;
    }

    return {
      id: this.convertUserIdToString(lab._id),
      labName: lab.labName,
      address: lab.address,
      phone: lab.phone,
      email: lab.email,
    };
  }

  /**
   * Check if user is a root user (PathoSaathi superadmin/admin)
   * @param user - User document
   * @returns Whether user is root user
   */
  private static isRootUser(user: any): boolean {
    // Superadmin is always root user
    if (user.role === ROLES.SUPERADMIN) {
      return true;
    }

    // Check if partner is PathoSaathi (PS root)
    if (user.partner && user.partner.companyName) {
      return user.partner.companyName.toLowerCase().includes("pathosaathi");
    }

    return !user.partner && [ROLES.SUPERADMIN].includes(user.role);
  }

  /**
   * Validate domain access for user
   * @param user - User document
   * @param requestDomain - Requested domain
   * @param isRootUser - Whether user is root user
   * @returns Domain validation result
   */
  private static async validateDomainAccess(
    user: any,
    requestDomain: string,
    isRootUser: boolean
  ): Promise<DomainValidationResult> {
    const actualDomain = this.extractDomain(requestDomain);

    // Root users must use main domain
    if (isRootUser) {
      const isMainDomain = this.isMainDomain(actualDomain);
      return {
        isValid: isMainDomain,
        isRootUser: true,
        actualDomain,
        error: isMainDomain
          ? undefined
          : "Root users must login from main domain (pathosaathi.in or app.pathosaathi.in)",
      };
    }

    // Partner users must match their assigned domain
    if (user.partner) {
      const partner = user.partner;

      if (!partner.isActive) {
        return {
          isValid: false,
          isRootUser: false,
          actualDomain,
          partner: partner._id.toString(),
          error: "Partner account is inactive",
        };
      }

      if (!partner.domain) {
        const isMainDomain = this.isMainDomain(actualDomain);
        return {
          isValid: isMainDomain,
          isRootUser: false,
          actualDomain,
          partner: partner._id.toString(),
          error: isMainDomain ? undefined : "Please login from main domain",
        };
      }

      // Validate partner-specific domain
      const allowedDomain = partner.domain.toLowerCase().trim();
      const normalizedActual = actualDomain.toLowerCase().trim();

      if (normalizedActual !== allowedDomain) {
        return {
          isValid: false,
          isRootUser: false,
          allowedDomain,
          actualDomain,
          partner: partner._id.toString(),
          error: `Access denied. Please login from ${allowedDomain}`,
        };
      }

      return {
        isValid: true,
        isRootUser: false,
        allowedDomain,
        actualDomain,
        partner: partner._id.toString(),
      };
    }

    // Default: allow main domain for users without partners
    const isMainDomain = this.isMainDomain(actualDomain);
    return {
      isValid: isMainDomain,
      isRootUser: false,
      actualDomain,
      error: isMainDomain ? undefined : "Please login from main domain",
    };
  }

  /**
   * Extract clean domain from URL/host
   * @param urlOrHost - URL or hostname
   * @returns Clean domain
   */
  private static extractDomain(urlOrHost: string): string {
    if (!urlOrHost) return "";

    try {
      // Handle full URLs
      if (urlOrHost.includes("://")) {
        const url = new URL(urlOrHost);
        return url.hostname.toLowerCase();
      }

      // Handle host with port
      return urlOrHost.split(":")[0].toLowerCase().trim();
    } catch (error) {
      return urlOrHost.toLowerCase().trim();
    }
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

  /**
   * Log login activity
   * @param user - User document
   * @param activityData - Activity data
   */
  private static async logLoginActivity(
    user: any,
    activityData: {
      ipAddress: string;
      userAgent: string;
      domain: string;
      success: boolean;
      sessionId: string;
      action?: string;
    }
  ): Promise<void> {
    try {
      // TODO: Implement LoginHistory model
      // const LoginHistory = Models.getLoginHistory();
      // if (LoginHistory) {
      //   await LoginHistory.createLoginAttempt({
      //     user: user._id,
      //     phone: user.phone || "",
      //     ipAddress: activityData.ipAddress,
      //     device: this.getDeviceFromUserAgent(activityData.userAgent),
      //     deviceInfo: {
      //       userAgent: activityData.userAgent,
      //       platform: this.getPlatformFromUserAgent(activityData.userAgent),
      //       browser: this.getBrowserFromUserAgent(activityData.userAgent),
      //     },
      //     success: activityData.success,
      //   });
      // }
      // For now, just log to console
      console.log("Login activity:", {
        userId: user._id,
        sessionId: activityData.sessionId,
        success: activityData.success,
        action: activityData.action || "login",
      });
    } catch (error) {
      console.error("Failed to log login activity:", error);
    }
  }
}

export default AuthService;
