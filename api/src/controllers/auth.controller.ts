import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { ApiResponse } from "../utils/apiResponse.util";
import {
  LoginRequest,
  RefreshTokenRequest,
  PasswordSetupRequest,
  AuthRequest,
} from "../types/auth.types";
import { asyncHandler } from "../middleware/error.middleware";

/**
 * PathoSaathi Authentication Controller
 * Handles HTTP requests for authentication with domain isolation
 */
export class PathoSaathiAuthController {
  /**
   * Login endpoint with domain validation
   * POST /auth/login
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, phone, password } = req.body;

    if (!password) {
      return ApiResponse.validationError(res, "Password is required");
    }

    if (!email && !phone) {
      return ApiResponse.validationError(
        res,
        "Email or phone number is required"
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ApiResponse.validationError(res, "Invalid email format");
    }

    // Validate phone format if provided
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return ApiResponse.validationError(
        res,
        "Invalid Indian phone number format"
      );
    }

    // Extract domain from request
    const domain = PathoSaathiAuthController.extractDomain(req);
    if (!domain) {
      return ApiResponse.error(
        res,
        "Unable to determine login domain. Please check your URL.",
        400
      );
    }

    // Get client information
    const ipAddress = PathoSaathiAuthController.getClientIP(req);
    const userAgent = req.get("User-Agent") || "Unknown";

    // Prepare login request
    const loginData: LoginRequest = {
      email: email?.toLowerCase()?.trim(),
      phone: phone?.trim(),
      password,
      ipAddress,
      userAgent,
      domain,
    };

    // Attempt login (throws ApiError on failure)
    const result = await AuthService.login(loginData);

    // Set secure HTTP-only cookie for refresh token in production
    if (process.env.NODE_ENV === "production") {
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: PathoSaathiAuthController.getCookieDomain(domain),
      });
    }

    return ApiResponse.success(res, result, "Login successful");
  });

  /**
   * Token refresh endpoint with domain validation
   * POST /auth/refresh
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const token = refreshToken || req.cookies?.refreshToken;

    if (!token) {
      return ApiResponse.error(res, "Refresh token is required", 401);
    }
    const domain = PathoSaathiAuthController.extractDomain(req);
    if (!domain) {
      return ApiResponse.error(res, "Unable to determine request domain", 400);
    }

    const ipAddress = PathoSaathiAuthController.getClientIP(req);
    const userAgent = req.get("User-Agent") || "Unknown";

    const refreshData: RefreshTokenRequest = {
      refreshToken: token,
      ipAddress,
      userAgent,
      domain,
    };

    const result = await AuthService.refreshToken(refreshData);

    if (req.cookies?.refreshToken && process.env.NODE_ENV === "production") {
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: PathoSaathiAuthController.getCookieDomain(domain),
      });
    }

    return ApiResponse.success(res, result, "Token refreshed successfully");
  });

  /**
   * Get current user information
   * GET /auth/me
   */
  static getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.unauthorized(res, "Authentication required");
    }

    const result = await AuthService.getMe(userId);

    return ApiResponse.success(res, result, "User information retrieved");
  });

  /**
   * Setup password for staff invitation
   * POST /auth/setup-password
   */
  static setupPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return ApiResponse.validationError(res, "Setup token is required");
    }

    if (!password) {
      return ApiResponse.validationError(res, "Password is required");
    }

    if (!confirmPassword) {
      return ApiResponse.validationError(
        res,
        "Password confirmation is required"
      );
    }

    if (password !== confirmPassword) {
      return ApiResponse.validationError(res, "Passwords do not match");
    }

    if (password.length < 8) {
      return ApiResponse.validationError(
        res,
        "Password must be at least 8 characters long"
      );
    }

    const domain = PathoSaathiAuthController.extractDomain(req);
    if (!domain) {
      return ApiResponse.error(res, "Unable to determine domain", 400);
    }

    const ipAddress = PathoSaathiAuthController.getClientIP(req);
    const userAgent = req.get("User-Agent") || "Unknown";

    const setupData: PasswordSetupRequest = {
      token,
      password,
      confirmPassword,
      ipAddress,
      userAgent,
      domain,
    };

    const result = await AuthService.setupPassword(setupData);

    if (process.env.NODE_ENV === "production") {
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: PathoSaathiAuthController.getCookieDomain(domain),
      });
    }

    return ApiResponse.success(
      res,
      result,
      "Password setup completed successfully"
    );
  });

  /**
   * Logout endpoint
   * POST /auth/logout
   */
  static logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const sessionId = undefined;

    if (req.cookies?.refreshToken) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    if (userId) {
      await AuthService.logout(userId, sessionId);
    }

    return ApiResponse.success(res, {}, "Logged out successfully");
  });

  /**
   * Verify invitation token (for password setup form)
   * GET /auth/verify-invitation/:token
   * TODO: Implement when StaffInvite model is available
   */
  static verifyInvitation = asyncHandler(
    async (req: Request, res: Response) => {
      const { token } = req.params;

      if (!token) {
        return ApiResponse.validationError(res, "Token is required");
      }

      return ApiResponse.error(
        res,
        "Staff invitation feature not yet implemented",
        501
      );

      /* Commented out until StaffInvite model is implemented
      const StaffInvite = Models.getStaffInvite();
      const result = await StaffInvite.verifyToken(token);

      if (!result.valid) {
        return ApiResponse.error(
          res,
          result.message || "Invalid or expired token",
          400
        );
      }

      // Return basic invite information (without sensitive data)
      const inviteData = {
        email: result.invite?.email,
        staffName: result.invite?.staffId?.name,
        expiresAt: result.invite?.expiresAt,
        isValid: true,
      };

      return ApiResponse.success(res, inviteData, "Token is valid");
      */
    }
  );

  // Helper Methods

  /**
   * Extract domain from request headers
   * @param req - Express request object
   * @returns Domain string
   */
  private static extractDomain(req: Request): string {
    const hostHeader = req.get("host");
    const originHeader = req.get("origin");
    const refererHeader = req.get("referer");

    if (hostHeader) {
      return hostHeader.split(":")[0];
    }

    if (originHeader) {
      try {
        const url = new URL(originHeader);
        return url.hostname;
      } catch (error) {}
    }

    if (refererHeader) {
      try {
        const url = new URL(refererHeader);
        return url.hostname;
      } catch (error) {}
    }

    return "localhost";
  }

  /**
   * Get client IP address
   * @param req - Express request object
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
   * Get appropriate cookie domain
   * @param requestDomain - Request domain
   * @returns Cookie domain
   */
  private static getCookieDomain(requestDomain: string): string {
    if (requestDomain.includes("pathosaathi.in")) {
      return ".pathosaathi.in";
    }

    return requestDomain;
  }
}

export default PathoSaathiAuthController;
