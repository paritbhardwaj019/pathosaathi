import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import AuthMiddleware from "../middleware/auth.middleware";
import { AuthRequest } from "../types/auth.types";

/**
 * Authentication Routes for PathoSaathi
 * Handles all authentication endpoints with domain isolation
 */
const router = Router();

/**
 * @route   POST /auth/login
 * @desc    Login user with domain validation
 * @access  Public
 */
router.post("/login", AuthMiddleware.rateLimit(15), AuthController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token with domain validation
 * @access  Public
 */
router.post(
  "/refresh",
  AuthMiddleware.rateLimit(30),
  AuthController.refreshToken
);

/**
 * @route   GET /auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get("/me", AuthMiddleware.authenticate, AuthController.getMe);

/**
 * @route   POST /auth/setup-password
 * @desc    Setup password for staff invitation
 * @access  Public (with token validation)
 */
router.post(
  "/setup-password",
  AuthMiddleware.rateLimit(10),
  AuthController.setupPassword
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user and clear session
 * @access  Private
 */
router.post("/logout", AuthMiddleware.optionalAuth, AuthController.logout);

/**
 * @route   GET /auth/verify-invitation/:token
 * @desc    Verify staff invitation token
 * @access  Public
 */
router.get("/verify-invitation/:token", AuthController.verifyInvitation);

/**
 * @route   GET /auth/validate-domain
 * @desc    Validate if current domain is allowed for user
 * @access  Private
 */
router.get(
  "/validate-domain",
  AuthMiddleware.authenticate,
  AuthMiddleware.validateDomain,
  (req: AuthRequest, res) => {
    res.json({
      success: true,
      message: "Domain access validated",
      data: {
        domain: req.get("host"),
        userRole: req.user?.role,
        isRootUser: req.user?.isRootUser,
        partnerDomain: req.user?.partnerDomain,
      },
    });
  }
);

/**
 * @route   GET /auth/health
 * @desc    Auth service health check
 * @access  Public
 */
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "PathoSaathi Authentication Service is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
