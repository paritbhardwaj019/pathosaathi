import { Router } from "express";
import BrandingController from "@/controllers/branding.controller";
import AuthMiddleware from "@/middleware/auth.middleware";
import MultiTenantMiddleware, {
  TenantRequest,
} from "@/middleware/multi-tenant.middleware";

/**
 * Branding Routes with Multi-Tenant Support
 * Handles tenant-aware branding endpoints
 */
const router = Router();

router.use(MultiTenantMiddleware.resolveTenant);

/**
 * @route   GET /api/branding/config
 * @desc    Get complete tenant branding configuration
 * @access  Public
 */
router.get("/config", BrandingController.getTenantBranding);

/**
 * @route   GET /api/branding/simple
 * @desc    Get simplified branding for frontend use
 * @access  Public
 */
router.get("/simple", BrandingController.getSimpleBranding);

/**
 * @route   GET /api/branding/css
 * @desc    Get CSS variables for tenant branding
 * @access  Public
 * @returns CSS content with proper headers
 */
router.get("/css", BrandingController.getBrandingCSS);

/**
 * @route   GET /api/branding/tenant-info
 * @desc    Get tenant information for branding context
 * @access  Public
 */
router.get("/tenant-info", BrandingController.getTenantInfo);

/**
 * @route   GET /api/branding/fonts
 * @desc    Get available fonts for branding
 * @access  Public
 */
router.get("/fonts", BrandingController.getAvailableFonts);

/**
 * @route   POST /api/branding/preview
 * @desc    Generate branding preview from configuration
 * @access  Private (optional auth for better UX)
 */
router.post(
  "/preview",
  AuthMiddleware.optionalAuth,
  BrandingController.previewBranding
);

/**
 * @route   POST /api/branding/validate
 * @desc    Validate branding configuration
 * @access  Private (optional auth)
 */
router.post(
  "/validate",
  AuthMiddleware.optionalAuth,
  BrandingController.validateBranding
);

/**
 * @route   GET /api/branding/partner/:partnerId
 * @desc    Get partner branding by ID
 * @access  Private (Partner or SuperAdmin)
 */
router.get(
  "/partner/:partnerId",
  AuthMiddleware.authenticate,
  BrandingController.getPartnerBranding
);

/**
 * @route   PUT /api/branding/partner/:partnerId
 * @desc    Update partner branding
 * @access  Private (Partner owner or SuperAdmin)
 */
router.put(
  "/partner/:partnerId",
  AuthMiddleware.authenticate,
  BrandingController.updatePartnerBranding
);

/**
 * @route   POST /api/branding/partner/:partnerId/reset
 * @desc    Reset partner branding to default
 * @access  Private (SuperAdmin only)
 */
router.post(
  "/partner/:partnerId/reset",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireSuperAdmin,
  BrandingController.resetPartnerBranding
);

/**
 * @route   GET /api/branding/domain/validate
 * @desc    Validate current domain access and branding
 * @access  Public
 */
router.get("/domain/validate", (req: TenantRequest, res) => {
  const hostname = req.get("host") || "unknown";

  res.json({
    success: true,
    message: "Domain validation completed",
    data: {
      hostname,
      tenant: req.tenant
        ? {
            type: req.tenant.type,
            isMainDomain: req.tenant.isMainDomain,
            subdomain: req.tenant.subdomain,
            customDomain: req.tenant.customDomain,
            partnerName: req.tenant.partner?.companyName,
          }
        : null,
    },
  });
});

/**
 * @route   GET /api/branding/health
 * @desc    Branding service health check with tenant info
 * @access  Public
 */
router.get("/health", (req: TenantRequest, res) => {
  const hostname = req.get("host") || "unknown";

  res.json({
    success: true,
    message: "PathoSaathi Branding Service is running",
    data: {
      hostname,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      multiTenant: true,
      tenant: req.tenant
        ? {
            type: req.tenant.type,
            resolved: true,
          }
        : {
            type: null,
            resolved: false,
          },
    },
  });
});

export default router;
