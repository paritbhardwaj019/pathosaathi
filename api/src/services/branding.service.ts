import { Models } from "./model-factory.service";
import { TenantRequest } from "../middleware/multi-tenant.middleware";
import { IBranding } from "../models/branding.model";
import { ITheme } from "../models/theme.model";
import { IFont } from "../models/font.model";

export interface TenantBrandingResponse {
  branding: IBranding;
  theme?: ITheme;
  fonts?: IFont[];
  tenantInfo: {
    type: "ROOT" | "PARTNER";
    name: string;
    subdomain?: string;
    customDomain?: string;
  };
}

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface BrandingTypography {
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  fontSize?: {
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  };
}

export interface BrandingLayout {
  borderRadius: number;
  spacing: number;
  maxWidth: number;
  sidebar?: {
    width: number;
    collapsedWidth: number;
  };
}

/**
 * Branding Service for Multi-Tenant System
 * Handles tenant-aware branding, themes, and customization
 */
export class BrandingService {
  /**
   * Get branding configuration for the current tenant
   */
  static async getTenantBranding(
    req: TenantRequest
  ): Promise<TenantBrandingResponse | null> {
    try {
      if (!req.tenant) {
        return null;
      }

      let branding: IBranding | null = null;
      let theme: ITheme | null = null;
      let tenantName = "PathoSaathi";

      if (req.tenant.type === "PARTNER" && req.tenant.partner) {
        tenantName = req.tenant.partner.companyName;

        if (req.tenant.branding) {
          branding = req.tenant.branding;
        } else if (req.tenant.partner.branding) {
          const Branding = Models.getBranding();
          const brandingDoc = await Branding.findById(
            req.tenant.partner.branding
          );
          if (brandingDoc) {
            branding = brandingDoc as unknown as IBranding;
          }
        }
      }

      if (!branding) {
        const Branding = Models.getBranding();
        const defaultBrandingDoc = await Branding.findOne({ isDefault: true });
        if (defaultBrandingDoc) {
          branding = defaultBrandingDoc as unknown as IBranding;
        }
      }

      if (!branding) {
        branding = await BrandingService.createDefaultBranding();
      }

      if (branding.theme) {
        const Theme = Models.getTheme();
        const themeDoc = await Theme.findById(branding.theme);
        if (themeDoc) {
          theme = themeDoc as unknown as ITheme;
        }
      }

      const Font = Models.getFont();
      const fonts = await Font.find({ isActive: true }).sort({ name: 1 });

      const response: TenantBrandingResponse = {
        branding,
        theme: theme || undefined,
        fonts: fonts || undefined,
        tenantInfo: {
          type: req.tenant.type,
          name: tenantName,
          subdomain: req.tenant.subdomain,
          customDomain: req.tenant.customDomain,
        },
      };

      return response;
    } catch (error) {
      console.error("[BrandingService] Error getting tenant branding:", error);
      return null;
    }
  }

  /**
   * Get simplified branding for API responses
   */
  static async getSimpleBranding(req: TenantRequest) {
    const brandingData = await BrandingService.getTenantBranding(req);

    if (!brandingData) {
      return BrandingService.getDefaultSimpleBranding();
    }

    const metadata = (brandingData.branding.metadata || {}) as {
      colors?: BrandingColors;
      typography?: BrandingTypography;
      layout?: BrandingLayout;
      customCSS?: string;
      faviconUrl?: string | null;
      logoUrl?: string | null;
      brandName?: string;
    };

    return {
      brandName: metadata.brandName || brandingData.branding.name,
      logoUrl: metadata.logoUrl ?? brandingData.branding.logo ?? null,
      faviconUrl: metadata.faviconUrl ?? null,
      colors: metadata.colors,
      typography: metadata.typography,
      layout: metadata.layout,
      tenantType: brandingData.tenantInfo.type,
      tenantName: brandingData.tenantInfo.name,
      customCSS: metadata.customCSS || "",
    };
  }

  /**
   * Update partner branding
   */
  static async updatePartnerBranding(
    partnerId: string,
    brandingData: Partial<IBranding>
  ): Promise<IBranding> {
    const Branding = Models.getBranding();
    const Partner = Models.getPartner();

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      throw new Error("Partner not found");
    }

    let brandingDoc: any;

    if (partner.branding) {
      brandingDoc = await Branding.findById(partner.branding);
      if (!brandingDoc) {
        throw new Error("Partner branding not found");
      }

      Object.assign(brandingDoc, brandingData);
      await brandingDoc.save();
    } else {
      brandingDoc = new Branding({
        ...brandingData,
        partner: partnerId,
        isActive: true,
        isDefault: false,
      });

      await brandingDoc.save();

      partner.branding = brandingDoc._id;
      await partner.save();
    }

    return brandingDoc as IBranding;
  }

  /**
   * Create default branding configuration
   */
  static async createDefaultBranding(): Promise<IBranding> {
    const Branding = Models.getBranding();

    const defaultBrandingDoc = new Branding({
      name: "PathoSaathi",
      metadata: {
        colors: {
          primary: "#1976d2",
          secondary: "#dc004e",
          accent: "#00bcd4",
          background: "#ffffff",
          surface: "#f5f5f5",
          text: "#212121",
          textSecondary: "#757575",
          success: "#4caf50",
          warning: "#ff9800",
          error: "#f44336",
          info: "#2196f3",
        },
        typography: {
          fontFamily: "Roboto, Arial, sans-serif",
          headingFont: "Roboto, Arial, sans-serif",
          bodyFont: "Roboto, Arial, sans-serif",
          fontSize: {
            small: "12px",
            medium: "14px",
            large: "16px",
            xlarge: "18px",
          },
        },
        layout: {
          borderRadius: 4,
          spacing: 8,
          maxWidth: 1200,
          sidebar: {
            width: 280,
            collapsedWidth: 64,
          },
        },
        customCSS: "",
        isDefault: true,
      },
      isActive: true,
    });

    await defaultBrandingDoc.save();
    return defaultBrandingDoc as unknown as IBranding;
  }

  /**
   * Get default simple branding for fallback
   */
  static getDefaultSimpleBranding() {
    return {
      brandName: "PathoSaathi",
      logoUrl: null,
      faviconUrl: null,
      colors: {
        primary: "#1976d2",
        secondary: "#dc004e",
        accent: "#00bcd4",
        background: "#ffffff",
        surface: "#f5f5f5",
        text: "#212121",
        textSecondary: "#757575",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336",
        info: "#2196f3",
      },
      typography: {
        fontFamily: "Roboto, Arial, sans-serif",
        headingFont: "Roboto, Arial, sans-serif",
        bodyFont: "Roboto, Arial, sans-serif",
      },
      layout: {
        borderRadius: 4,
        spacing: 8,
        maxWidth: 1200,
      },
      tenantType: "ROOT",
      tenantName: "PathoSaathi",
      customCSS: "",
    };
  }

  /**
   * Generate CSS variables from branding
   */
  static generateCSSVariables(branding: IBranding): string {
    const metadata = (branding.metadata || {}) as {
      colors?: BrandingColors;
      typography?: BrandingTypography;
      layout?: BrandingLayout;
      customCSS?: string;
    };
    const colors: Partial<BrandingColors> = metadata.colors || {};
    const typography: Partial<BrandingTypography> = metadata.typography || {};
    const layout: Partial<BrandingLayout> = metadata.layout || {};

    let css = ":root {\n";

    if (colors.primary) css += `  --color-primary: ${colors.primary};\n`;
    if (colors.secondary) css += `  --color-secondary: ${colors.secondary};\n`;
    if (colors.accent) css += `  --color-accent: ${colors.accent};\n`;
    if (colors.background)
      css += `  --color-background: ${colors.background};\n`;
    if (colors.surface) css += `  --color-surface: ${colors.surface};\n`;
    if (colors.text) css += `  --color-text: ${colors.text};\n`;
    if (colors.textSecondary)
      css += `  --color-text-secondary: ${colors.textSecondary};\n`;
    if (colors.success) css += `  --color-success: ${colors.success};\n`;
    if (colors.warning) css += `  --color-warning: ${colors.warning};\n`;
    if (colors.error) css += `  --color-error: ${colors.error};\n`;
    if (colors.info) css += `  --color-info: ${colors.info};\n`;

    if (typography.fontFamily)
      css += `  --font-family: ${typography.fontFamily};\n`;
    if (typography.headingFont)
      css += `  --font-heading: ${typography.headingFont};\n`;
    if (typography.bodyFont) css += `  --font-body: ${typography.bodyFont};\n`;

    if (layout.borderRadius)
      css += `  --border-radius: ${layout.borderRadius}px;\n`;
    if (layout.spacing) css += `  --spacing-unit: ${layout.spacing}px;\n`;
    if (layout.maxWidth) css += `  --max-width: ${layout.maxWidth}px;\n`;

    css += "}\n";

    if (metadata.customCSS) {
      css += "\n" + metadata.customCSS;
    }

    return css;
  }

  /**
   * Validate branding colors
   */
  static validateColors(colors: Partial<BrandingColors>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    const requiredColors = ["primary", "secondary", "background", "text"];

    for (const colorName of requiredColors) {
      const colorValue = colors[colorName as keyof BrandingColors];
      if (!colorValue) {
        errors.push(`${colorName} color is required`);
      } else if (!colorRegex.test(colorValue)) {
        errors.push(`${colorName} must be a valid hex color`);
      }
    }

    const optionalColors = [
      "accent",
      "surface",
      "textSecondary",
      "success",
      "warning",
      "error",
      "info",
    ];

    for (const colorName of optionalColors) {
      const colorValue = colors[colorName as keyof BrandingColors];
      if (colorValue && !colorRegex.test(colorValue)) {
        errors.push(`${colorName} must be a valid hex color`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get branding by partner ID
   */
  static async getPartnerBranding(
    partnerId: string
  ): Promise<IBranding | null> {
    const Partner = Models.getPartner();

    const partner = await Partner.findById(partnerId).populate("branding");
    if (!partner || !partner.branding) {
      return null;
    }

    return partner.branding as IBranding;
  }

  /**
   * Reset partner branding to default
   */
  static async resetPartnerBrandingToDefault(
    partnerId: string
  ): Promise<IBranding> {
    const Partner = Models.getPartner();
    const Branding = Models.getBranding();

    let defaultBrandingDoc =
      (await Branding.findOne({
        "metadata.isDefault": true,
      })) || null;

    if (!defaultBrandingDoc) {
      defaultBrandingDoc =
        (await BrandingService.createDefaultBranding()) as any;
    }

    if (defaultBrandingDoc) {
      await Partner.findByIdAndUpdate(partnerId, {
        branding: defaultBrandingDoc._id,
      });
      return defaultBrandingDoc as unknown as IBranding;
    }

    const fallback = (await BrandingService.createDefaultBranding()) as any;
    await Partner.findByIdAndUpdate(partnerId, {
      branding: fallback._id,
    });
    return fallback as IBranding;
  }
}

export default BrandingService;
