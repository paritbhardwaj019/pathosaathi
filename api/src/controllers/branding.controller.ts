import { Response } from "express";
import { ApiResponse } from "@/utils/apiResponse.util";
import { asyncHandler } from "@/middleware/error.middleware";
import { TenantRequest } from "@/middleware/multi-tenant.middleware";
import { BrandingService } from "@/services/branding.service";
import { AuthRequest } from "@/types/auth.types";
import { IBranding } from "@/models/branding.model";
import { HttpStatusCode } from "axios";

/**
 * Branding Controller for Multi-Tenant System
 * Handles tenant-aware branding API endpoints
 */
export class BrandingController {
  /**
   * Get tenant branding configuration
   * GET /api/branding/config
   */
  static getTenantBranding = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const brandingData = await BrandingService.getTenantBranding(req);

      if (!brandingData) {
        return ApiResponse.error(
          res,
          "Unable to load branding configuration",
          500
        );
      }

      return ApiResponse.success(
        res,
        brandingData,
        "Branding configuration retrieved successfully"
      );
    }
  );

  /**
   * Get simplified branding for frontend
   * GET /api/branding/simple
   */
  static getSimpleBranding = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const simpleBranding = await BrandingService.getSimpleBranding(req);

      return ApiResponse.success(
        res,
        simpleBranding,
        "Simple branding retrieved successfully"
      );
    }
  );

  /**
   * Get CSS variables for tenant branding
   * GET /api/branding/css
   */
  static getBrandingCSS = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const brandingData = await BrandingService.getTenantBranding(req);

      if (!brandingData) {
        const simple = BrandingService.getDefaultSimpleBranding();
        const defaultBranding = {
          name: simple.brandName,
          logo: simple.logoUrl || undefined,
          metadata: {
            colors: simple.colors,
            typography: simple.typography,
            layout: simple.layout,
            customCSS: simple.customCSS,
          },
          theme: null as any,
          isActive: true,
          identifier: "",
          tenantPrefix: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as IBranding;

        const defaultCSS =
          BrandingService.generateCSSVariables(defaultBranding);

        res.setHeader("Content-Type", "text/css");
        return res.send(defaultCSS);
      }

      const css = BrandingService.generateCSSVariables(brandingData.branding);

      res.setHeader("Content-Type", "text/css");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(css);
    }
  );

  /**
   * Update partner branding (Partner/SuperAdmin only)
   * PUT /api/branding/partner/:partnerId
   */
  static updatePartnerBranding = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const { partnerId } = req.params;
      const {
        brandName,
        logoUrl,
        faviconUrl,
        colors,
        typography,
        layout,
        customCSS,
      } = req.body;

      if (!brandName) {
        return ApiResponse.validationError(res, "Brand name is required");
      }

      if (colors) {
        const colorValidation = BrandingService.validateColors(colors);
        if (!colorValidation.valid) {
          return ApiResponse.validationError(
            res,
            "Invalid color configuration",
            colorValidation.errors
          );
        }
      }

      if (
        req.user?.role !== "SUPERADMIN" &&
        req.user?.partnerId !== partnerId
      ) {
        return ApiResponse.forbidden(
          res,
          "Cannot update branding for this partner"
        );
      }

      try {
        const brandingUpdate: Partial<IBranding> = {
          name: brandName,
          logo: logoUrl,
          metadata: {
            ...(colors && { colors }),
            ...(typography && { typography }),
            ...(layout && { layout }),
            ...(customCSS && { customCSS }),
            ...(faviconUrl && { faviconUrl }),
            ...(logoUrl && { logoUrl }),
            ...(brandName && { brandName }),
          },
        };

        const updatedBranding = await BrandingService.updatePartnerBranding(
          partnerId,
          brandingUpdate
        );

        return ApiResponse.success(
          res,
          updatedBranding,
          "Partner branding updated successfully"
        );
      } catch (error) {
        console.error(
          "[BrandingController] Error updating partner branding:",
          error
        );
        return ApiResponse.error(res, "Failed to update partner branding", 500);
      }
    }
  );

  /**
   * Get partner branding by ID (Admin only)
   * GET /api/branding/partner/:partnerId
   */
  static getPartnerBranding = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const { partnerId } = req.params;

      if (
        req.user?.role !== "SUPERADMIN" &&
        req.user?.partnerId !== partnerId
      ) {
        return ApiResponse.forbidden(
          res,
          "Cannot view branding for this partner"
        );
      }

      const branding = await BrandingService.getPartnerBranding(partnerId);

      if (!branding) {
        return ApiResponse.notFound(res, "Partner branding not found");
      }

      return ApiResponse.success(
        res,
        branding,
        "Partner branding retrieved successfully"
      );
    }
  );

  /**
   * Reset partner branding to default (SuperAdmin only)
   * POST /api/branding/partner/:partnerId/reset
   */
  static resetPartnerBranding = asyncHandler(
    async (req: AuthRequest, res: Response) => {
      const { partnerId } = req.params;

      if (req.user?.role !== "SUPERADMIN") {
        return ApiResponse.forbidden(
          res,
          "Only superadmin can reset partner branding"
        );
      }

      try {
        const defaultBranding =
          await BrandingService.resetPartnerBrandingToDefault(partnerId);

        return ApiResponse.success(
          res,
          defaultBranding,
          "Partner branding reset to default successfully"
        );
      } catch (error) {
        console.error(
          "[BrandingController] Error resetting partner branding:",
          error
        );
        return ApiResponse.error(res, "Failed to reset partner branding", 500);
      }
    }
  );

  /**
   * Get branding preview for configuration
   * POST /api/branding/preview
   */
  static previewBranding = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const {
        brandName,
        logoUrl,
        faviconUrl,
        colors,
        typography,
        layout,
        customCSS,
      } = req.body;

      const previewBranding = {
        brandName,
        logoUrl,
        faviconUrl,
        colors: {
          ...BrandingService.getDefaultSimpleBranding().colors,
          ...colors,
        },
        typography: {
          ...BrandingService.getDefaultSimpleBranding().typography,
          ...typography,
        },
        layout: {
          ...BrandingService.getDefaultSimpleBranding().layout,
          ...layout,
        },
        customCSS,
      };

      const css = BrandingService.generateCSSVariables(previewBranding as any);

      return ApiResponse.success(
        res,
        {
          branding: previewBranding,
          css,
        },
        "Branding preview generated successfully"
      );
    }
  );

  /**
   * Validate branding configuration
   * POST /api/branding/validate
   */
  static validateBranding = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const { colors, typography, layout } = req.body;
      const errors: string[] = [];
      const warnings: string[] = [];

      if (colors) {
        const colorValidation = BrandingService.validateColors(colors);
        if (!colorValidation.valid) {
          errors.push(...colorValidation.errors);
        }
      }

      if (typography) {
        if (typography.fontFamily && typography.fontFamily.length > 100) {
          warnings.push("Font family name is very long");
        }
      }

      if (layout) {
        if (
          layout.maxWidth &&
          (layout.maxWidth < 800 || layout.maxWidth > 2000)
        ) {
          warnings.push("Max width should be between 800 and 2000 pixels");
        }
        if (
          layout.borderRadius &&
          (layout.borderRadius < 0 || layout.borderRadius > 50)
        ) {
          errors.push("Border radius should be between 0 and 50 pixels");
        }
      }

      return ApiResponse.success(
        res,
        {
          valid: errors.length === 0,
          errors,
          warnings,
        },
        "Branding validation completed"
      );
    }
  );

  /**
   * Get available fonts for branding
   * GET /api/branding/fonts
   */
  static getAvailableFonts = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      const brandingData = await BrandingService.getTenantBranding(req);

      const fonts = brandingData?.fonts || [];

      return ApiResponse.success(
        res,
        fonts,
        "Available fonts retrieved successfully"
      );
    }
  );

  /**
   * Get tenant information for branding context
   * GET /api/branding/tenant-info
   */
  static getTenantInfo = asyncHandler(
    async (req: TenantRequest, res: Response) => {
      if (!req.tenant) {
        return ApiResponse.error(
          res,
          "Tenant information not available",
          HttpStatusCode.InternalServerError
        );
      }

      const tenantInfo = {
        type: req.tenant.type,
        isMainDomain: req.tenant.isMainDomain,
        subdomain: req.tenant.subdomain,
        customDomain: req.tenant.customDomain,
        partner: req.tenant.partner
          ? {
              id: req.tenant.partner._id,
              companyName: req.tenant.partner.companyName,
              partnerType: req.tenant.partner.partnerType,
              isActive: req.tenant.partner.isActive,
            }
          : null,
      };

      return ApiResponse.success(
        res,
        tenantInfo,
        "Tenant information retrieved successfully"
      );
    }
  );
}

export default BrandingController;
